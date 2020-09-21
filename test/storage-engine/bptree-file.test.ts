import * as fs from "fs";
import * as util from "util";

import BPTreeFile from "../../src/lib/storage-engine/bptree-file";
import { BPTreeResultReference } from "../../src/lib/b-plus-tree/test-tree";
import Util from "../../src/util";
import { TupleDesc, Type, Table, Tuple, StringField, NumberField } from "../../src/lib/table";
import { PageNodeParser, PageNodeHeader } from "../../src/lib/storage-engine/page-node-parser";
import Page from "../../src/lib/storage-engine/page";


async function createNewBPTreeFile(fileName: string, tabel: Table): Promise<BPTreeFile> {
// async function createNewBPTreeFile(fileName: string, parser: PageNodeParser): Promise<BPTreeFile> {

    return new Promise((resolve, reject) => {

        fs.unlinkSync(fileName);

        fs.open(fileName, 'wx', async (err, fd) => {
            let parser = new PageNodeParser(tabel);

            if (err) {
                if (err.code === 'EEXIST') {
                    console.error(`${fileName} 已存在! `);

                    // return;
                } else {
                    //   throw err;
                    reject(err);
                }

            } else {

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
        });

    })

}


describe('Test: lib/b-plus-tree', () => {

    const reference = new BPTreeResultReference();
    const path = "./test.dat";
    const desc = new TupleDesc([Type.NUMBER, Type.STRING], ["id", "name"]);
    const table = new Table("test", []);
    table.tupleDesc = desc;
    // const parser = new PageNodeParser(table);
    // const arr = [67, 26, 10, 81, 62, 89, 71, 56, 32, 54, 18, 87, 73, 43, 76, 24, 41, 68, 28, 58, 88, 38, 21, 90, 53, 0, 93, 50, 22, 96, 64, 80, 65, 37, 11, 75, 91, 83, 72, 70, 61, 45, 79, 94, 74, 25, 6, 82, 3, 66, 19];
    const arr = Util.random.distinctArray(20, 30, 1);

    let treeFile: BPTreeFile;

    test('BPTreeFile.insert()', async () => {

        treeFile = await createNewBPTreeFile(path, table);
        await treeFile.init();

        for (let index = 0; index < arr.length; index++) {
            let key = arr[index], name = key + ''; /* console.log(`insert: ${key}`); */
            let tuple = new Tuple(desc, [
                new NumberField("id", key),
                new StringField("name", name)
            ])
            reference.insert(key);
            await treeFile.insert(key, tuple);
            await treeFile.flush();

            try {
                let isOK = await treeFile.check();
                expect(isOK).toBe(true);
            } catch (e) {
                expect(e.message).toBe(null);
            }
            // await treeFile.print();

            let keys = await treeFile.getAllKeys();
            expect(keys).toEqual(reference.toArray());
        }

    });


    test('BPTreeFile.delete()', async () => {

        for (let index = 0; index < arr.length; index++) {
            let key = arr[index];
            // console.log(key);
            reference.delete(key);
            await treeFile.delete(key);
            await treeFile.flush();

            try {
                let isOK = await treeFile.check();
                expect(isOK).toBe(true);
            } catch (e) {
                expect(e.message).toBe(null);
            }
            // await treeFile.print();

            let keys = await treeFile.getAllKeys();
            expect(keys).toEqual(reference.toArray());
        }

    });

    // TODO
    test('BPTreeFile.search()', async () => {})
    test('BPTreeFile.update()', async () => {})

})
