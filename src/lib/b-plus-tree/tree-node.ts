import { BPlusTree } from "./b-plus-tree";

/** 节点状态（容量），决定能否进行何种操作 */
enum NodeState {
    /** 较少（只有一个叶子节点时可能存在） */
    LESS = 0,
    /** 基本（删除后，需要合并） */
    BASE = 1,
    /** 一般（可添加，可删除数据） */
    NORMAL = 2,
    /** 充满（添加后，需要分裂） */
    FULL = 3,
    /** 溢出（不能添，加需要分裂） */
    OVERFLOW = 4
}

abstract class TreeNode {
    constructor(keys, datas) {
        this.keys = keys || [];
        this.datas = datas || null;
        this.isLeaf = datas ? true : false;
    }
    /** 节点标识，类似id */
    point: number;
    tree: BPlusTree<TreeNode>;
    parent: TreeNode;

    /** key值
     *  TODO 需要考虑：key值是否可以重复？
     *  TODO 需要考虑：目前，key是子节点中最大（即：最右）key？
     */
    keys: any[];
    datas?: any[];
    children: any[];
    isLeaf: boolean;
    pre: any;
    next: any;
    /** 获取父节点 TODO 增加维护难度，暂时不需要 */
    async abstract getParent()
    /** 获取指定位置子节点 */
    async abstract getChild(index: number)
    /** 获取前一节点（只有叶子节点有） */
    async abstract getPre()
    /** 获取下一节点（只有叶子节点有） */
    async abstract getNext()

    /** 指定位置插入key */
    insertKey(index, key, data?) {
        let len = this.keys.length
        if (index >= 0 && index <= len) {
            this.keys.splice(index, 0, key);
            // if (data) {
            //     this.datas.splice(index, 0, data);
            // }
            // 如果是插入到最后，需要更新parent的key
            if (index === len && this.parent) {
                let i = this.getIndexInParent();
                this.updateParentKey(i, key);
            }
            return len + 1;
        } else {
            throw new Error(`Insert position (${index}) out of range [0, ${len}]!`);
        }
    }

    /** 插入一个key和一条数据 */
    async insert(key, data) {
        // 叶子节点才可以插入数据
        if (!this.isLeaf) return false;
        // 找到应该插入的位置
        let index: number;
        for (index = 0; index < this.keys.length; index++) {
            // TODO 需要判断是否有相等元素？
            if (key < this.keys[index]) break;
        }

        let node: TreeNode = this;
        node.insertKey(index, key, data);
        node.datas.splice(index, 0, data);
        // node.makeDirty();

        // 节点满了需要分裂成两个
        while (node.isKeysOverflow()) {
            await node.splitMedian();
            node = node.parent;
            if (!node) return true;
        }
        node.makeDirty();
        return true;
    }

    /** 更新父节点的指定位置的key（当点节点最后一个key发生变化时） */
    updateParentKey(index, key) {
        let parent = this.parent;
        if (parent) {
            // 如果前后的值相同
            if (parent.keys[index] === key) return;
            parent.keys.splice(index, 1, key);
            parent.makeDirty();
            // 如果这个key是最后一个，需要继续往上层更新
            if (parent.parent && index === (parent.keys.length - 1)) {
                index = parent.getIndexInParent();
                parent.updateParentKey(index, key);
            }
        }
    }

    /** 从中间分裂节点（节点数据溢出） */
    // abstract splitMedian() 
    async splitMedian() {
        if (!this.isKeysOverflow()) {
            throw new Error('Not enougth kes to split! ');
        }

        let index: number = Math.ceil(this.keys.length / 2);
        let indexInParent: number = this.getIndexInParent();
        let newNode: TreeNode, newNodeKeys, newNodeDatas, newNodeChildren;
        // 节点分裂后，children需要重新分配
        if (this.isLeaf) {
            newNodeDatas = this.datas.slice(index);
            this.datas = this.datas.slice(0, index);
        } else {
            newNodeChildren = this.children.slice(index);
            this.children = this.children.slice(0, index);
        }
        newNodeKeys = this.keys.slice(index);
        this.keys = this.keys.slice(0, index);

        newNode = await this.tree.createNode(newNodeKeys, newNodeDatas, newNodeChildren);
        newNode.parent = this.parent;

        let lefKey = this.keys[this.keys.length - 1];
        let rightKey = newNode.keys[newNode.keys.length - 1];
        // indexInParent == -1 时，该节点是根节点，则新建一个节点作为根节点
        // 这里的处理是为了保持根节点的位置
        if (indexInParent === -1) {
            let leftNode = await this.tree.createNode(this.keys, this.datas, this.children);
            this.keys = [lefKey, rightKey];
            // this.children = [leftNode, newNode];
            this.children = [leftNode.point, newNode.point];

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
        if (this.isLeaf) {
            if (this.next) {
                let nextNode = await this.getNext();
                nextNode.pre = newNode.point;
                newNode.next = nextNode.point;
                // nextNode.pre = newNode;
                // newNode.next = nextNode;

                nextNode.makeDirty();
            }

            this.next = newNode.point;
            newNode.pre = this.point;
            // this.next = newNode;
            // newNode.pre = this;
        }

        // 非根节点
        // 原来的节点和key换成两个节点以及对应的key
        this.parent.keys.splice(indexInParent, 1, lefKey, rightKey);
        // this.children.splice(indexInParent, 1, this, newNode);
        this.parent.children.splice(indexInParent, 1, this.point, newNode.point);

        this.parent.makeDirty();
        this.makeDirty();
        newNode.makeDirty();
    }


    /** delete */
    async delete(key) {
        // 叶子节点才可以删除
        if (!this.isLeaf) return false;
        let node: TreeNode = this;
        let index: number = this.keys.findIndex((k) => k === key);
        if (index === -1) {
            throw new Error(`${key} does't exit! `);
        }

        node.deleteKey(index);
        node.datas.splice(index, 1);
        node.makeDirty();

        while (node.getState() === NodeState.LESS) {

            if (!node.parent) break;

            // let direction = -1;
            let isNext = false;
            let sibling: TreeNode = await node.getSibling();

            /* if (sibling) {
                if (sibling.getState() > NodeState.BASE) {
                    // 兄弟节点key足够多，只需要移动一个key
                    await sibling.transfromKeyToRightSibling(this);
                } else {
                    // 兄弟节点key不够，则合并
                    node.merge(direction, sibling);
                }
            } else {
                // 左边兄弟节点不存在则选取右边兄弟节点
                if (!sibling) sibling = await node.getSibling(true);
                if (sibling) {
                    if (sibling.getState() > NodeState.BASE) {
                        // 兄弟节点key足够多，只需要移动一个key
                        await sibling.transfromKeyToLeftSibling(this);
                    } else {
                        // 兄弟节点key不够，则合并
                        node.merge(direction, sibling);
                    }

                } else {
                    // TODO root

                }
            } */



            // 左边兄弟节点不存在则选取右边兄弟节点
            if (!sibling) {
                // direction = 1;
                isNext = true;
                sibling = await node.getSibling(true);
            }

            if (sibling) {
                if (sibling.getState() > NodeState.BASE) {
                    // 兄弟节点key足够多，只需要移动一个key
                    // await sibling.transfromKeyToSibling(-direction, sibling);
                    if (isNext) {
                        await sibling.transfromKeyToLeftSibling(node);
                    } else {
                        await sibling.transfromKeyToRightSibling(node);
                    }
                } else {
                    // 兄弟节点key不够，则合并
                    // node.merge(direction, sibling);
                    if (isNext) {
                        await node.mergeRightSibling(sibling);
                    } else {
                        await sibling.mergeRightSibling(node);
                    }
                }
            } else {
                // 如果当前节点是叶子节点，那么叶子节点只剩一个了；
                // 如果当前节点只有一个key，说明整棵树元素删完了，则把树清空
                if (node.isLeaf && node.keys.length === 0) {
                    node.parent.keys.pop();
                    // node.parent.childPoints.pop();
                    node.parent.children.pop();
                    // 释放该节点
                    node.tree.releaseNode(node);
                }
            }

            node = node.parent;
        }
        return true;
    }

    /**  */
    deleteKey(index) {
        if (index >= 0 && index < this.keys.length) {
            this.keys.splice(index, 1);
            // 如果是删除最后一个，需要更新parent的key
            if (index && index === this.keys.length && this.parent) {
                let i = this.getIndexInParent();
                this.updateParentKey(i, this.keys[index - 1]);
            }
            return index - 1;
        } else {
            throw new Error(`Delete position (${index}) out of range [0, ${this.keys.length})!`);
        }
    }

    /** 获取下一个节点（此节点有和lastkey不同的key） */
    async getNextAndHasDiffKey() {
        let node, startKey = this.keys[this.keys.length - 1];
        while (true) {
            node = await this.getNext();
            if (!node) return null;
            if (node.keys[0] === startKey) {
                if (node.keys[node.keys.length - 1] === startKey) {
                    continue;
                }
            }
            return node;
        }
    }

    /** 获取兄弟节点
     *  @isNext 是否下一个兄弟节点，默认取前一个
     */
    async getSibling(isNext?: boolean) {
        let index = this.getIndexInParent();
        // 根节点没有兄弟节点
        // if (index === -1) {
        if (!this.parent) null;

        index = isNext ? index + 1 : index - 1;
        // 第一个没有左兄弟节点，最后一个没有右兄弟节点
        if (index < 0 || index >= this.parent.children.length) {
            return null;
        }
        /* if (this.isLeaf) {
            if (isNext) {
                return await this.getNext();
            }
            return await this.getPre();
        } */
        return await this.parent.getChild(index);
    }

    /** 转移一个key至左边兄弟节点 */
    async transfromKeyToLeftSibling(sibling: TreeNode) {

        let indexInParent = this.getIndexInParent();
        // let sibling = this.getLeftSibling(indexInParent);
        if (sibling) {
            // 第一个key移动到兄弟节点keys的最后一个
            // let key = this.keys.shift();
            sibling.keys.push(this.keys.shift());
            let key = sibling.keys[sibling.keys.length - 1];
            sibling.updateParentKey(indexInParent - 1, key);

            if (this.isLeaf) {
                let data = this.datas.shift();
                sibling.datas.push(data);

            } else {
                let point = this.children.shift();
                sibling.children.push(point);

            }

            sibling.makeDirty();
            this.makeDirty();

            // 非叶子节点
            /* if (this.type === NodeType.INTERNAL) {
                // 该节点的第一个child移动到兄弟节点children的最后一个，parent的指向重新调整
                let point = this.childPoints.shift();
                let child = await this.readNode(point);
                // TODO 这个是否必须？？？
                // TODO 这个是否必须？？？
                // child.parentPoint = sibling.point;
                child.parent = sibling;
                sibling.childPoints.push(point);

                // let child = this.children.shift();
                // child.parent = sibling;
                // sibling.children.push(child);
            } */
        }
    }

    /** 转移一个key至右边兄弟节点 */
    async transfromKeyToRightSibling(sibling: TreeNode) {

        let indexInParent = this.getIndexInParent();
        // let sibling = this.getRightSibling(indexInParent);
        if (sibling) {

            // 最后一个key移动到兄弟节点keys的第一个
            sibling.keys.unshift(this.keys.pop());
            // 该节点最后一个key发生变化，更新父节点的key
            let key = this.keys[this.keys.length - 1];
            this.updateParentKey(indexInParent, key);

            // TODO 这种极端的情况可以忽略吗？
            // 如果节点key允许最小为1，有可能出现转移后只有1个key的情况
            // @reslove 对 order 做了限制，必须 > 3，不需要考虑这种情况。
            // if (sibling.keys.length === 1) {
            //     this.updateParentKey(indexInParent + 1, sibling.keys[0]);
            // }

            if (this.isLeaf) {
                let data = this.datas.pop();
                sibling.datas.unshift(data);
            } else {
                let point = this.children.pop();
                sibling.children.unshift(point);
            }

            sibling.makeDirty();
            this.makeDirty();

            // 非叶子节点
            /* if (this.type === NodeType.INTERNAL) {
                // 该节点的最后一个child移动到兄弟节点children的第一个，parent的指向重新调整

                let point = this.childPoints.pop();
                let child: Node = await this.readNode(point);
                // TODO 这个是否必须？？？
                // TODO 这个是否必须？？？
                // child.parentPoint = sibling.point;
                child.parent = sibling;
                sibling.childPoints.unshift(point);

                // let child = this.children.pop();
                // child.parent = sibling;
                // sibling.children.unshift(child);
            } */
        }
    }

    /** 合并右边的兄弟节点（！需要注意顺序） */
    async mergeRightSibling(sibling: TreeNode) {
        // async merge(direction, sibling) {
        // let keys: any[] = [];
        // let children: any[] = [];

        let keyIndex: number = this.getIndexInParent();
        if (keyIndex === -1) {
            throw new Error('This is root! ');
        }

        // if (direction === 1) {
        // sibling = sibling || this.getRightSibling();
        this.keys = this.keys.concat(sibling.keys);

        // } else if (direction === -1) {
        //     // sibling = sibling || this.getLeftSibling();
        //     keys = sibling.keys.concat(this.keys);
        //     children = sibling.children.concat(this.children);

        // } else {
        //     throw new Error('direction should be 1 or -1! ');

        // }

        // key过多会使合并后节点的key超出范围；
        if (this.isKeysOverflow()) {debugger;
        // if (sibling.getState() > NodeState.BASE || this.getState() > NodeState.BASE) {debugger;
            throw new Error(`Node key's overflow, shouldn't merge!`);
        }

        this.parent.deleteKey(keyIndex + 1);
        this.parent.children.splice(keyIndex + 1, 1);

        // sibling.keys = keys;
        // sibling.children = children;

        // TODO 可以不要????

        // 向左合入时需要考虑父节点是否会受到影响
        // if (direction === -1) {
        // let index = sibling.getIndexInParent();
        let key = sibling.keys[sibling.keys.length - 1];
        // this.updateParentKey(keyIndex - 1, key);
        this.updateParentKey(keyIndex, key);
        // }

        // 叶子节点需要维护双向链表
        if (this.isLeaf) {
            // if (this.type === NodeType.LEAF) {
            // if (direction === 1) {
            // let preNode = this.getPreNode();
            /* let preNode = await this.readNode(this.prePoint);
            // sibling.setPreNode(preNode);
            sibling.prePoint = preNode ? preNode.point : null;
            if (preNode) {
                // preNode.setNextNode(sibling);
                preNode.nextPoint = sibling.point;
            } */
            // } else {
            // let nextNode = this.getNextNode();
            // let nextNode = await this.readNode(this.nextPoint);

            this.datas = this.datas.concat(sibling.datas)

            let nextNode = await sibling.getNext();
            this.next = nextNode ? nextNode.point : null;
            if (nextNode) {
                nextNode.pre = this.point;
                nextNode.makeDirty();
            }
            // sibling.setNextNode(nextNode);
            /* sibling.nextPoint = nextNode ? nextNode.point : null;
            if (nextNode) {
                // nextNode.setPreNode(sibling);
                nextNode.prePoint = sibling.point;
            } */
            // }
        } else {

            this.children = this.children.concat(sibling.children);
            // 合入后，可能出现根节点只有唯一的子节点
            // 尽可能减少树的高度，根节点被它唯一子节点代替
            // if (this.type === NodeType.INTERNAL) {
            // 根节点key太少时，可以丢弃，用它唯一的子节点（sibling）代替
            // if (this.parent.isRoot() && this.parent.keys.length === 1) {
            if (!this.parent.parent && this.parent.keys.length === 1) {
                // debugger;

                // TODO 用sibling代替根节点
                // TODO 用sibling代替根节点
                // TODO 用sibling代替根节点
                // TODO 用sibling代替根节点
                // TODO 用sibling代替根节点
                // TODO ......

                this.parent.keys = this.keys;
                this.parent.children = this.children;

                // sibling.release();
                // this.release();
                this.tree.releaseNode(this);

                // this.tree.root = sibling;
                // sibling.parent = null;
            }
        }

        this.makeDirty();
        this.parent.makeDirty();
        
        this.tree.releaseNode(sibling);
        // sibling.release();
        // }   
    }

    /** 检查节点是否合法（测试用） */
    check() {
        let state = this.getState();
        if (state == NodeState.OVERFLOW) {
            throw new Error("node is overflow");
        }
        if (this.isLeaf) {
            if (this.keys.length !== this.datas.length) {
                throw new Error("keys.length !== datas.length");
            }
        } else {
            if (this.keys.length !== this.children.length) {
                throw new Error("keys.length !== children.length");
            }
        }

        let index = this.getIndexInParent();
        if (index !== -1) {
            if (this.keys.length) {
                let lastKey = this.keys[this.keys.length - 1];
                if (this.parent.keys[index] !== lastKey) {
                    throw new Error("parent's key error");
                }
            }
        }
    }

    abstract getState(): NodeState
    abstract isKeysOverflow(): boolean

    abstract getIndexInParent(): number
    // abstract release()
    abstract makeDirty()
    abstract toEqual(node: TreeNode): boolean

}

export {
    NodeState,
    TreeNode
}
