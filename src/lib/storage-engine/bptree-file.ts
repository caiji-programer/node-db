import * as fs from "fs";
import * as util from "util";

import { Table, Tuple, TupleDesc, Field, NumberField, StringField, Type } from "../table";
import { BPlusTree, TreeNode } from "../b-plus-tree";
import DBFile from "./db-file";
import Page from "./page";
import PageNode from "./page-node";
import { PageNodeParser, PageNodeHeader } from "./page-node-parser";
import Util from "../../util";
import StorageEngine from "./storage-engine";
import { IDataReader, TupleReader } from "./reader";


interface IFileReader {
    query(...args)
    insert(...args)
    update(...args)
    delete(...args)
}


/** */
// export default class BPTreeFile extends DBFile {
// export default class BPTreeFile<Node extends TreeNode> extends BPlusTree<Node> {
    
    // export default class BPTreeFile extends BPlusTree<PageNode> {
export default class BPTreeFile<T extends IDataReader> extends BPlusTree<PageNode<T>> implements IFileReader {

    constructor(path, parser: PageNodeParser<T>, storage?: StorageEngine) {
        super(null);
        this.parser = parser;
        this.file = new DBFile(path, storage);
    }

    // strorage: StorageEngine;

    file: DBFile;
    // tree: BPlusTree<PageNode>;

    parser: PageNodeParser<T>;

    // TODO
    dirtyNode: PageNode<T>[] = [];

    /** 初始化（读取文件HeadPage，及根节点） */
    async init() {
        // DBFile初始化
        await this.file.init();
        // 读取根节点
        this.root = await this.readNode(1);
    }

    /** 读取指定位置的Page，并且解析为Node */
    async readNode(point: number): Promise<PageNode<T>> {
        // point === 0 时为 HeadPage
        // if (!point) return null;

        // let isUsed = this.file.isPageUsed(point);
        // if (!isUsed) return null;
        // TODO
        // let page = Pool._instance.get(point), node: PageNode;
        // if (page) {}
        // let page = await this.file.readPage(point);

        // let page = await this.strorage.readPage();
        let page = await this.file.getPage(point);
        if (!page) return null;
        let node = new PageNode(this, page);
        return node;

    }

    // async createNode(keys: any, datas: any[], children?: any, parent?: any): Promise<PageNode> {    
    // async createNode(keys, datas, points?, pre?, next?) {
    async createNode(keys, datas, children?, parent?: PageNode<T>, pre?, next?): Promise<PageNode<T>> {
        let node = new PageNode(this);
        node.keys = keys;
        if (datas && datas.length) {
            node.isLeaf = true;
            node.datas = datas || [];
            node.pre = pre || null;
            node.next = next || null;
        } else {
            node.isLeaf = false;
            node.datas = null;
            node.children = children;
        }

        let index = this.file.alloc();
        // TODO headPage 会被修改 需要标记为 dirty
        node.point = index;
        // TODO ????????  暂时使用
        // if (parent) {
        //     parent.children.push(node.point);
        // }

        let buf = node.toBuffer();
        let page = new Page(this.file, index, buf)
        node.page = page;
        //
        await this.file.storePage(node.page);

        return node;
    }

    /** 释放该节点 */
    releaseNode(node: PageNode<T>) {
        this.file.free(node.point);
    }

    // TODO 暂时如此处理
    async flush() {
        if (this.dirtyNode.length) {
            await Promise.all(this.dirtyNode.map(node => {
                node.page.buffer = node.toBuffer();
                return this.file.writePage(node.page);
            }))

            // TODO 头部文件写入
            let promises = [];
            this.file.headPageMap.forEach(page => promises.push(this.file.writePage(page)));
            await Promise.all(promises);
        }
        this.dirtyNode = [];
    }

    /** TODO */
    getPageNodeOrder(isLeaf: boolean): number {
        if (isLeaf) {
            return this.parser.leafOrder;
        }
        return this.parser.internalOrder;
    }

    parse() {
        // throw new Error("Method not implemented.");
    }

}



async function run() {
    let desc = new TupleDesc([Type.NUMBER, Type.STRING], ["id", "name"]);
    let table = new Table("test", []);
    table.tupleDesc = desc;

    let reader: TupleReader = new TupleReader(desc);
    // let parser = new PageNodeParser(table);
    let parser = new PageNodeParser(reader);
    // let treeFile = await createNewBPTreeFile("./test.dat", table);
    let path = await createNewBPTreeFile("./id.dat", parser);
    let treeFile = new BPTreeFile(path, parser);

    await treeFile.init();
    await treeFile.print(); 
    return
    // let tree = new BPTreeFile()
    let arr = Util.random.distinctArray(40, 60);
    // let arr = [1, 23, 37, 21, 17, 45, 40, 25, 5, 28, 24, 46, 55, 50, 4, 43, 20, 7, 57, 10, 13, 22];
    console.log(arr);

    for (let index = 0; index < arr.length; index++) {
        const key = arr[index], name = "name_" + key; console.log(`insert: ${key}`); /* if (key === 24) {debugger}; */
        const tuple = new Tuple(desc, [
            new NumberField("id", key),
            new StringField("name", name)
        ])
        await treeFile.insert(key, tuple);
        await treeFile.flush();
        await treeFile.check();
    }

    await treeFile.print(); return;

    for (let index = 0; index < arr.length; index++) {
        const key = arr[index]; console.log(key); if (key === 21) { debugger };
        await treeFile.delete(key);
        await treeFile.flush();
        await treeFile.check();
        // await treeFile.print();
    }

    await treeFile.print();

    let leafNodes = await treeFile.getAllLeafNodes();
    console.log(leafNodes);
}


export async function createNewBPTreeFile(fileName: string, table: Table): Promise<string>
export async function createNewBPTreeFile(fileName: string, parser: PageNodeParser<TupleReader>): Promise<string>
export async function createNewBPTreeFile(...args): Promise<string> {

    let fileName: string = args[0], parser: PageNodeParser<TupleReader>;
    if (args[1] instanceof Table) {
        // parser = new PageNodeParser(args[1]);
        let reader = new TupleReader(args[1].tupleDesc)
        parser = new PageNodeParser(reader);
    } else {
        parser = args[1];
    }

    return new Promise((resolve, reject) => {

        // fs.unlinkSync(fileName);

        if (fs.existsSync(fileName)) {
            resolve(fileName);

        } else {

            let headBuf = Buffer.alloc(Page.PAGE_SIZE);
            // 新建只有一个HeadPage
            headBuf.writeInt32BE(1, 0);
            // 当前HeadPage是首个
            headBuf.writeInt32BE(0, 4);
            // 第一个ContentPage被根节点使用， 128 = (1000 0000)
            headBuf[8] = 128;

            // 根节点 
            let rootBuf = Buffer.alloc(Page.PAGE_SIZE);
            parser.writeHeader(rootBuf, new PageNodeHeader(0, 1))
            
            let buf = Buffer.concat([headBuf, rootBuf])

            fs.writeFile(fileName, buf, function (err) {
                if (err) {
                    console.error('写入失败', err);
                    reject(err);
                } else {
                    console.log('写入成功');
                    resolve(fileName);
                }
            })
        }

        /* fs.open(fileName, 'wx', async (err, fd) => {
            let parser = new PageNodeParser(table);

            if (err) {
                if (err.code === 'EEXIST') {
                    console.warn(`${fileName} 已存在! `);

                    // return;
                } else {
                    //   throw err;
                    reject(err);
                }

            } else {
                console.log(`parser.writeHeader ---------------------`);
                // writeMyData(fd);
                let headBuf = Buffer.alloc(Page.PAGE_SIZE);
                // 新建只有一个HeadPage
                headBuf.writeInt32BE(1, 0);
                // 当前HeadPage是首个
                headBuf.writeInt32BE(0, 4);
                // 第一个ContentPage被根节点使用， 128 = (1000 0000)
                headBuf[8] = 128;
                // 或者用 Util.buffer.writeBit(headBuf, 8*8, 1)
                // util.promisify(fs.write)(this.fd, buf, 0, size, pos);
                await util.promisify(fs.write)(fd, headBuf, 0, headBuf.length, 0);

                // 根节点 
                let rootBuf = Buffer.alloc(Page.PAGE_SIZE);
                parser.writeHeader(rootBuf, new PageNodeHeader(0, 1))
                await util.promisify(fs.write)(fd, rootBuf, 0, rootBuf.length, Page.PAGE_SIZE);

            }

            let file = new BPTreeFile(fileName, parser);
            resolve(file);
        }); */

    })

}

// run();

