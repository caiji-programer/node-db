import { TreeNode, NodeState } from "./tree-node";
import { TestTree } from "./test-tree";


/** 测试类，仅用于测试 */
export class TestNode extends TreeNode {
    constructor(keys, datas, children: number[], pre, next) {
        super(keys, datas);
        this.pre = pre;
        this.next = next;
        if (children && children.length) {
            this.children = children;
            // children.forEach(child => child.parent = this);
        }
    }

    tree: TestTree;
    point: number = null;

    parent: TestNode = null;
    children: number[] = [];
    pre: number = null;
    next: number = null;

    async getParent() {
        // let node = await this.getNode(this.parent);
        return this.parent;
    }

    async getChild(index: number) {
        if (this.children && this.children.length) {
            let node = await this.tree.readNode(this.children[index]);
            node.parent = this;
            return node;
        }
        return null;
    }

    async getPre() {
        let node = await this.tree.readNode(this.pre);
        return node;
    }

    async getNext() {
        let node = await this.tree.readNode(this.next);
        return node;
    }

    // 从中间分裂节点
    /* async splitMedian() {

        if (!this.isKeysOverflow()) {
            throw new Error('Not enougth kes to split! ');
        }

        let index: number = Math.ceil(this.keys.length / 2);
        let indexInParent: number = this.getIndexInParent();

        let newNode: TestNode, newNodeKeys, newNodeDatas, newNodeChildren;

        let parent = await this.getParent();

        // 节点分裂后，children需要重新分配
        if (this.isLeaf) {
            newNodeDatas = this.datas.slice(index);
            this.datas = this.datas.slice(0, index);
        } else {
            newNodeChildren = this.children.slice(index);
            this.children = this.children.slice(0, index);
        }
        newNodeKeys = this.keys.slice(index);
        // newNodeParentKey = newNodeKeys[newNodeKeys.length - 1];

        this.keys = this.keys.slice(0, index);

        newNode = await this.tree.createNode(newNodeKeys, newNodeDatas, newNodeChildren);
        newNode.parent = parent;
        // newNode.children = newNodeChildren;

        let lefKey = this.keys[this.keys.length - 1];
        let rightKey = newNode.keys[newNode.keys.length - 1];

        // indexInParent == -1 时，该节点是根节点，则新建一个节点作为根节点
        // 这里的处理是为了保持根节点的位置
        if (indexInParent === -1) {
            let leftNode = await this.tree.createNode(this.keys, this.datas, this.children);
            // let lefKey = this.keys[this.keys.length - 1];
            // let rightKey = newNode.keys[newNode.keys.length - 1];

            this.keys = [lefKey, rightKey];
            this.children = [leftNode, newNode];

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
            // let nextNode = await this.readNode(this.nextPoint);
            let nextNode = await this.getNext();
            if (nextNode) {
                // nextNode.prePoint = newNode.point;
                // newNode.nextPoint = nextNode.point;
                nextNode.pre = newNode;
                newNode.next = nextNode;

                nextNode.makeDirty();
            }

            // this.nextPoint = newNode.point;
            this.next = newNode;
            // newNode.prePoint = this.point;
            newNode.pre = this;
        }

        // 非根节点
        // if (indexInParent > -1) {
        // 原来的节点和key换成两个节点以及对应的key
        parent.keys.splice(indexInParent, 1, lefKey, rightKey);
        parent.children.splice(indexInParent, 1, this, newNode);

        this.makeDirty();
        newNode.makeDirty();

    } */

    isKeysOverflow(): boolean {
        return this.keys.length > this.tree.order;
    }

    getState(): NodeState {
        let order = this.tree.order,
            min = Math.floor(order / 2),
            keyLen = this.keys.length;
        
        if (keyLen > order) return NodeState.OVERFLOW;
        if (keyLen === order) return NodeState.FULL;
        if (keyLen > order / 2) return NodeState.NORMAL;
        // TODO 判断是否是根节点
        if (!this.parent) {
            return keyLen >= 1 ? NodeState.BASE : NodeState.LESS
        }
        return keyLen === min ? NodeState.BASE : NodeState.LESS;
    }

    makeDirty() {
        // console.log("is dirty!");
    }

    getIndexInParent(): number {
        let parent = this.parent;
        if (parent) {
            return parent.children.findIndex(child => child === this.point);
        } else {
            return -1;
        }
    }

    toEqual(node: TreeNode): boolean {
        return node === this;
    }

    toString() {
        return `(${this.point}) ` + this.keys.join(',');
    }

}

