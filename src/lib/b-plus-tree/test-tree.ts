import { BPlusTree } from "./b-plus-tree";
import { TestNode } from "./test-node";
import Util from "../../util";


/** B+树实现的测试例子 */
// export default class TestTree<Node extends TestNode> extends BPlusTree<Node> {
export class TestTree extends BPlusTree<TestNode> {

    constructor(order, root?) {
        super(order, root);
        this.order = order;
        root.tree = this;
    }

    order: number = 4;

    nodeNums: number = 2;

    nodesMap: Map<number, TestNode> = new Map();

    getNewPoint(): number {
        let point = this.nodeNums;
        this.nodeNums++;
        return point;
    }

    async readNode(point: number) {
        let node = this.nodesMap.get(point);
        // if (node) {
        let result = await new Promise<TestNode>((resolve, reject) => {
            setTimeout(() => {
                resolve(node)
            }, Util.random.number(10))
        })
        return result;
        // }
    }

    releaseNode(node: TestNode) {
        this.nodesMap.delete(node.point);
    }

    async createNode(keys: any[], datas: any[], children?: any, parent?: any): Promise<TestNode> {
        let node = await new Promise<TestNode>((resolve) => {
            resolve(new TestNode(keys, datas, children, null, null))
        });
        node.point = this.getNewPoint();
        node.tree = this;
        this.nodesMap.set(node.point, node);
        return node;
    }

}

/** B+树测试数据对照 */
export class BPTreeResultReference {

    constructor() {}

    sort() {
        this._source.sort((a, b) => a - b);
    }

    _source: number[] = [];

    find(key: number) {
        return this._source.findIndex((v) => v === key);
    }

    insert(key: number) {
        this._source.push(key);
        this.sort();
    }

    delete(key: number) {
        let index = this._source.findIndex((v) => v === key);
        if (index !== -1) {
            this._source.splice(index, 1);
        }
    }

    update(key: number, newKey: number) {
        let index = this._source.findIndex((v) => v === key);
        if (index !== -1) {
            this._source.splice(index, 1);
            this._source.push(newKey);
            this.sort();
        }
    }

    toArray() {
        return this._source;
    }
}


/** 测试用 */
async function run() {

    let root = new TestNode([], null, [], null, null);
    root.point = 1;
    // let tree = new TestTree<TestNode>(4, root);
    let tree = new TestTree(4, root);
    tree.nodesMap.set(root.point, root);

    // let arr = [1, 2, 3, 14, 26, 24, 17, 15, 5, 10, 6, 23, 27, 25, 8, 19, 28, 4, 11, 22, 21];
    let arr = [67, 26, 10, 81, 62, 89, 71, 56, 32, 54, 18, 87, 73, 43, 76, 24, 41, 68, 28, 58, 88, 38, 21, 90, 53, 0, 93, 50, 22, 96, 64, 80, 65, 37, 11, 75, 91, 83, 72, 70, 61, 45, 79, 94, 74, 25, 6, 82, 3, 66, 19];
    // let arr = Util.random.distinctArray(20, 30, 1);
    console.log(arr);

    for (let index = 0; index < arr.length; index++) {
        const key = arr[index], data = key + '' + key; console.log(key);
        await tree.insert(key, data);
        await tree.check();
        await tree.print();
    }

    await tree.print();

    for (let index = 0; index < arr.length; index++) {
        const key = arr[index]; console.log(key);
        await tree.delete(key);
        await tree.check();
        await tree.print();
    }

    await tree.print();
}

// run();
