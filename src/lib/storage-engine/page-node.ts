import { TreeNode, NodeState } from "../b-plus-tree";
import BPTreeFile from "./bptree-file";
import Page from "./page";
import { PageNodeParser, PageNodeHeader } from "./page-node-parser";
import { Tuple } from "../table";
import { IDataReader } from "./reader";


/** B+树的页节点 */
export default class PageNode<T extends IDataReader> extends TreeNode {

    // constructor(file: BPTreeFile, page?: Page) {
    // constructor(tree: BPlusTree<PageNode>, page?: Page) {
    constructor(tree: BPTreeFile<T>, page?: Page) {
        super(null, null);
        this.tree = tree;
        this.page = page;
        if (page) {
            this.init(page);
        }
    }
    // file: BPTreeFile;
    // tree: BPlusTree<PageNode>
    tree: BPTreeFile<T>;
    // 
    page: Page;
    //
    point: number = null;
    // 可以通过这个属性直接访问父节点，不再需要读取 readNode()
    parent: PageNode<T> = null;
    // TODO 思考：可以不维护？
    parentPoint: number = null;
    /** TODO 不需要 用TreeNode.children代替 */
    childPoints: number[] = null;
    /** TODO 不需要 用TreeNode.pre代替 */
    prePoint: number = null;
    /** TODO 不需要 用TreeNode.next代替 */
    nextPoint: number = null;

    init(page: Page) {

        let result, header, index: number = 0, buf = page.buffer;
        let parser = this.tree.parser;
        result = parser.parseHeader(buf, index);
        header = result.data;
        index += result.byteNum;
        // this.pageHeader = header;

        /* let slotByteNumber: number = Math.ceil(header.slots / 8);
        let bitArray: number[] = Util.buffer.toBinaryArray(buf.slice(index, index + slotByteNumber));
        // this.slotsMap = bitArray;

        if (header.slots) {
            index += slotByteNumber;
        } */

        // 内部节点
        if (header.type === 0) {
            this.childPoints = [];
            for (let i = 0; i < header.slots; i++) {
                // let bit: number = Util.buffer.readBit(buf, index + i);
                let isSkip: boolean = false; /* console.log(`parseKey: ${index}`); */
                result = parser.parseKey(buf, index, isSkip);
                index += result.byteNum; /* console.log(`parsePoint: ${index}`); */
                this.keys.push(result.data); 

                result = parser.parsePoint(buf, index, isSkip);
                index += result.byteNum;
                this.childPoints.push(result.data);

            }
            this.children = this.childPoints;

        } else {
            // 记录数据存放位置 this.dataPos = index + parser.keyLen;
            this.datas = [];
            for (let i = 0; i < header.slots; i++) {
                // let bit: number = Util.buffer.readBit(buf, index + i);
                let isSkip: boolean = false; /* console.log(`parseKey: ${index}`); */
                result = parser.parseKey(buf, index, isSkip);
                index += result.byteNum;
                // if (!isSkip) {
                this.keys.push(result.data); /* console.log(`parseData: ${index}`); */
                // }

                result = parser.parseData(buf, index, isSkip);
                index += result.byteNum;
                // if (!isSkip) {
                this.datas.push(result.data);
                // }
            }
        }

        // this.type = header.type;
        this.isLeaf = header.type === 0 ? false : true;
        this.point = header.offset;

        // if (this.type === NodeType.LEAF) {
        if (this.isLeaf) {
            this.pre = this.prePoint = header.prev;
            this.next = this.nextPoint = header.next;
        }
    }


    async getParent() {
        // TODO ??? return this.parent
        if (this.parent) return this.parent;
        if (!this.parentPoint) return null;
        return await this.tree.readNode(this.parentPoint);
    }

    async getChild(index: number) {
        if (this.isLeaf) return null;
        let node = await this.tree.readNode(this.children[index]);
        node.parent = this;
        return node; 
    }

    async getPre() {
        if (!this.pre) return null;
        return await this.tree.readNode(this.pre);
    }

    async getNext() {
        if (!this.next) return null;
        return await this.tree.readNode(this.next);
    }

    /*  */
    /* async splitMedian() {
        // debugger;
        if (!this.isKeysOverflow()) {
            throw new Error('Not enougth kes to split! ');
        }

        let index: number = Math.ceil(this.keys.length / 2);
        let indexInParent: number = this.getIndexInParent();

        let newNode: PageNode, newNodeKeys, newNodeDatas, newNodeChildPoints;

        // let parent = await this.getParent();

        // 节点分裂后，children需要重新分配
        if (this.isLeaf) {
            // TODO datas先忽略
            newNodeDatas = this.datas.slice(index);
            this.datas = this.datas.slice(0, index);
        } else {
            newNodeChildPoints = this.childPoints.slice(index);
            this.childPoints = this.childPoints.slice(0, index);
        }
        newNodeKeys = this.keys.slice(index);
        // newNodeParentKey = newNodeKeys[newNodeKeys.length - 1];

        this.keys = this.keys.slice(0, index);

        newNode = await this.tree.createNode(newNodeKeys, newNodeDatas, newNodeChildPoints);
        newNode.parent = this.parent; 
        // newNode.children = newNodeChildPoints;

        let lefKey = this.keys[this.keys.length - 1];
        let rightKey = newNode.keys[newNode.keys.length - 1];

        // indexInParent == -1 时，该节点是根节点，则新建一个节点作为根节点
        // 这里的处理是为了保持根节点的位置
        if (indexInParent === -1) {
            let leftNode = await this.tree.createNode(this.keys, this.datas, this.childPoints);
            // let lefKey = this.keys[this.keys.length - 1];
            // let rightKey = newNode.keys[newNode.keys.length - 1];

            this.keys = [lefKey, rightKey];
            // this.children = [leftNode, newNode];
            this.childPoints = [leftNode.point, newNode.point];

            leftNode.parent = this;
            newNode.parent = this;

            // 有三个节点被修改过
            this.makeDirty()
            leftNode.makeDirty();
            newNode.makeDirty();

            return
        }

        // 叶子节点分裂后，要重新调整指针，
        // 维护好叶子节点的双向链表
        // if (this.type === NodeType.LEAF) {
        if (this.isLeaf) {
            // let nextNode = await this.tree.readNode(this.nextPoint);
            if (this.nextPoint) {
                let nextNode = await this.getNext();
                nextNode.prePoint = newNode.point;
                newNode.nextPoint = nextNode.point;
                // nextNode.pre = newNode;
                // newNode.next = nextNode;

                nextNode.makeDirty();
            }

            this.nextPoint = newNode.point;
            // this.next = newNode;
            newNode.prePoint = this.point;
            // newNode.pre = this;
        }

        // 非根节点
        // if (indexInParent > -1) {
        // 原来的节点和key换成两个节点以及对应的key
        this.parent.keys.splice(indexInParent, 1, lefKey, rightKey);
        // this.children.splice(indexInParent, 1, this, newNode);
        this.parent.childPoints.splice(indexInParent, 1, this.point, newNode.point);

        this.makeDirty();
        newNode.makeDirty();


    } */


    /* async delete(key: any) {
        throw new Error("Method not implemented.");
    } */

    /* async deleteKey(key: any) {
        throw new Error("Method not implemented.");
    } */

    getState(): NodeState {

        let order = this.tree.getPageNodeOrder(this.isLeaf),
            min = Math.floor(order / 2),
            keyLen = this.keys.length;

        if (keyLen > order) return NodeState.OVERFLOW;

        if (keyLen === order) return NodeState.FULL;

        if (keyLen > min) return NodeState.NORMAL;

        // TODO 判断是否是根节点
        if (!this.parent) {
            return keyLen >= 1 ? NodeState.BASE : NodeState.LESS
        }

        return keyLen === min ? NodeState.BASE : NodeState.LESS;
    }


    isKeysOverflow(): boolean {
        // let order = this.tree.getPageNodeOrder(this.isLeaf);
        return this.getState() === NodeState.OVERFLOW;
    }

    makeDirty() {
        this.page.makeDirty();
        this.page.buffer = this.toBuffer();
        // TODO delete
        // this.tree.dirtyNode.push(this);
    }

    getIndexInParent(): number {

        // let parent = await this.getParent();
        let parent = this.parent;
        if (parent) {
            return parent.children.findIndex(point => point === this.point);
        } else {
            return -1;
        }
    }

    toBuffer(): Buffer {
        // TODO
        let buf: Buffer = Buffer.alloc(Page.PAGE_SIZE),
            index = 0,
            type = this.isLeaf ? 1 : 0,
            parser = this.tree.parser,
            // header = new PageNodeHeader(type, this.point, this.prePoint, this.nextPoint, null, this.keys.length),
            header = new PageNodeHeader(type, this.point, this.pre, this.next, null, this.keys.length),
            result;

        parser.writeHeader(buf, header);
        index += header.getLen();

        // write slotsMap
        /* let slotByteNumber: number = Math.ceil(this.keys.length / 8) || 1;
        let slotsMap: number[] = new Array(slotByteNumber * 8).fill(0);
        this.keys.forEach((key, index) => slotsMap[index] = 1);

        Util.buffer.writeBinaryArray(buf, index, slotsMap);
        index += Math.ceil(header.slots / 8) */

        // TODO keys datas
        if (this.isLeaf) {
            this.keys.forEach((key, i) => {
                let data = this.datas[i]; /* console.log(`writeKey: ${index}`); */
                result = parser.writeKey(buf, index, key);
                index += result.byteNum; /* console.log(`writeData: ${index}`); */
                result = parser.writeData(buf, index, data);
                index += result.byteNum;
            })
        } else {
            this.keys.forEach((key, i) => {
                // let point = this.childPoints[i]; /* console.log(`writeKey: ${index}`); */
                let point = this.children[i]; /* console.log(`writeKey: ${index}`); */
                result = parser.writeKey(buf, index, key);
                index += result.byteNum; /* console.log(`writePoint: ${index}`); */
                result = parser.writePoint(buf, index, point);
                index += result.byteNum;
            })
        }

        return buf;
    }

    toEqual(node: PageNode<T>): boolean {
        return this.point === node.point;
    }

    toString() {
        let str = ``;
        if (!this.isLeaf) {
            str = this.keys.map(key => key).join(',');

        } else {
            str = this.keys.map((key,index) => {
                let s = `${key}:`;
                let data: Tuple = this.datas[index];
                if (data) {
                    s += data.fields[1].value;
                }
                return s;
            }).join(', ');
        }
        return `(${this.point})${str}`;
    }

}

