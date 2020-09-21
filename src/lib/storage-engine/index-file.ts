import { BPlusTree } from "../b-plus-tree";
import PageNode from "./page-node";


// TODO 完善IndexFile
export default class IndexFile extends BPlusTree<PageNode> {
    createNode(keys: any[], datas: any[], children?: any, parent?: any): Promise<PageNode> {
        throw new Error("Method not implemented.");
    }
    releaseNode(node: PageNode) {
        throw new Error("Method not implemented.");
    }

}