import DBFile  from "./db-file";
import PageNode from "./page-node";
import Page from "./page";
import { BPlusTree } from "src/lib/b-plus-tree";
import { Table } from "src/lib/table";
// import Pool from "./pool";


// 一个DataFile最少应该有两个Page(一个HeadPage,一个RootPage)
// class DataFile extends HeapFile {
class DataFile extends DBFile {
    constructor(path, table: Table) {
        super(path);
        // this.parser = new PageParser(table);
        // if (!this.pageNum) {}

        // TODO
        // this.getPageNodeOrder = generatePageOrderFunc(this.parser);
    }

    // parser: PageParser;

    // getPageNodeOrder: (type: NodeType) => number;

    // TODO 在db-file里实现
    // alloc() {
    //     let index: number = this.findEmptyPageIndex();
    //     if (index === -1) {
    //         index = this.pageNum
    //     }
    //     this.pageNum++;
    //     return index;
    // }

    // free() {}

    async parse() {
        await this.init();
        // 根节点
        // let rootBuf: Buffer = await this.readPage(1);
        let page: Page = await this.readPage(1);
        // page = page.transfrom(1);
        // let root = new PageNode(this, page);
        // return root;
    }

    async toTree(): Promise<BPlusTree<PageNode>> {
        return null;
    }
}

export default DataFile;
