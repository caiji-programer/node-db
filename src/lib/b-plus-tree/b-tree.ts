import Util from "src/util";


type KeyType = string | number;

/** B树 */
export default class BTree{
    /**
     *  @order 阶数（每个结点至多可以拥有子结点的个数）
     */
    constructor(order: number) {
        this.root = null
        this.order = order;
        this.minKeysNum = Math.ceil(order/2) - 1;

        if (order < 3) {
            //
            throw new Error(`Order must be 3 or above.`); 
        }

    }

    root: BTreeNode;

    order: number;

    minKeysNum: number;

    //  遍历所有节点（中序遍历）
    traverse(callback) {
        // let current: BTreeNode = this.root;
        if (this.root) {
            this.root.traverse(callback);
        }        
    }

    // 搜索元素
    // TODO 需要优化    相当于重新遍历了一次节点的key
    search(value): BTreeNode {

        let current: BTreeNode = this.root;

        while(current) {

            // TODO
            // TODO 需要优化    相当于重新遍历了一次节点的key
            // TODO 需要优化    相当于重新遍历了一次节点的key
            // TODO 需要优化    相当于重新遍历了一次节点的key
            // TODO
            if (current.findKeyIndex(value) > -1) return current;

            if (current.isLeaf()) return null;

            current = current.findChild(value);
        }

        return null;
    }

    // 方法和 search 类似，不过用途不一样
    // TODO 需要优化    相当于重新遍历了一次节点的key
    findNodeForInsert(value): BTreeNode {

        let current: BTreeNode = this.root;

        while(current) {

            if (current.findKeyIndex(value) > -1) return null;

            if (current.isLeaf()) return current;

            current = current.findChild(value);
        }

        return null;
    }

    // 插入元素
    insert(value) {

        if (!this.root) {
            this.root = new BTreeNode(this, [value], null, null);
            return
        }

        let target: BTreeNode = this.findNodeForInsert(value);
        // target 为 null 说明元素已经存在
        if (!target) {
            throw new Error(`${value} is aready exits! `);
        }

        // 插入节点，肯定是先插入叶子节点，在作处理
        // 节点的 key 已经满了，需要分裂
        if (target.insertKey(value) === this.order) {
            target.splitMedian();
            // do {
            //     target.splitMedian();
            //     if (target.isRoot()) break;
            //     target = target.parent;
            // }
            // while (target.keys.length === this.order)
        }
        // this.print();
    }

    update(oldVal, newVal) {
        // if (oldVal === newVal) return
        let target = this.search(oldVal);
        if (!target) throw new Error(`${oldVal} is not exits! `);

        // newVal 已经存在，直接删除 oldVal 的即可
        if (this.search(newVal)) {
            target.delete(target.findKeyIndex(oldVal));
            return
        }

        if (target.isLeaf()) {
            let keys = target.keys;
            if (newVal > keys[0] && newVal < keys[keys.length - 1]) {
                target.deleteKey(oldVal);
                target.insertKey(newVal);
                return 
            }
        }

        target.delete(target.findKeyIndex(oldVal));
        this.insert(newVal);

    }

    delete(value) {

        let target: BTreeNode = this.search(value);
        // target 为 null 说明元素不存在
        if (!target) {
            console.error(`${value} is doesn't exits! `);
            return null;
        }

        let index: number = target.findKeyIndex(value);
        target.delete(index);

    }

    // 转换成平铺（数组）结构，从小到大排序
    toArray() {
        let temp = [];
        this.traverse((key: KeyType) => {
            temp.push(key);
        });
        return temp;
    }

    // 打印。（以树形的方式打印，方便查看）
    print() {
        console.log('\n\n------------------------- print -----------------------');

        let temp = [];
        let result = this.transfrom().reverse();
        let arr = result.map((level) => {
            let start = 0;
            let strArray = level.map(children => {

                let str = `[${children.toString()}]`;
                // 叶子节点作为基准
                if (!temp.length) return str;

                let len = children.length + 1;
                let strLen = temp.slice(start, start + len).join('  ').length;
                start += len;
                return Util.stringify.alignString(str, strLen); 
            })
            temp = strArray;
            return strArray.join('  ');
        })
        arr.reverse().forEach(s => console.log(s));
    }

    // 转换数据，按层来划分 level[] -> sibling[] -> key[]
    transfrom(): KeyType[][][] {
        let result = [];
        let stack = [this.root];
        // stack.push(this.root);
        while (stack.length) {
            let temp = [];
            let current = stack.map(item => {
                if (item.children && item.children.length) {
                    temp = temp.concat(item.children);
                }
                return item.keys;
            });

            result.push(current);
            stack = temp;
        }

        return result;
    }

    seed() {}

    isEmpty() {}

}

/** B树节点 */
export class BTreeNode {

    constructor(tree, keys, children, parent) {
        if (children && children.length) {
            if ((keys.length + 1) !== children.length) {
                throw new Error(`children numbers should be (keys.length + 1)`);
            }
        }
        this.tree = tree;
        this.keys = keys || [];
        this.children = children || [];
        this.parent = parent || null;
        // 修改children的parent字段的引用, 有可能是旧的引用
        this.children.forEach(child => child.parent = this);
    }
    // 在父节点的children中的index
    index: number;

    tree: BTree;

    keys: KeyType[];

    children: BTreeNode[];

    parent: BTreeNode;

    // 遍历（中序遍历）key 和 子节点
    traverse(callback: Function) {
        let index: number;
        let keysLen: number = this.keys.length;
        let childrenLen: number = this.children.length;
        if (childrenLen) {
            if ((keysLen + 1) !== childrenLen) {
                throw new Error(`children numbers should be (keys.length + 1)`);
            }
            for (index = 0; index < keysLen; index++) {
                this.children[index].traverse(callback);
                callback(this.keys[index]);
            }
            this.children[index].traverse(callback);

        } else {
            this.keys.forEach(key => {
                callback(key);
            })
        }
    }

    findKeyIndex(value: KeyType): number {
        return this.keys.indexOf(value);
    }

    // 找出可能出现的那个子节点
    findChild(value): BTreeNode {

        if (this.children.length === 0) return null;

        let index, len = this.keys.length;
        for (index = 0; index < len; index++) {
            if (value < this.keys[index]) {
                return this.children[index];
            }
        }
        return this.children[index];
    }

    // 将key插入到节点里
    // TODO 需要判断是否有相等元素吗？
    insertKey(key): number {
        let index , len = this.keys.length;
        for (index = 0; index < len; index++) {
            // TODO 需要判断是否有相等元素？
            let item = this.keys[index];
            // if (key === item) return null;
            if (key < item) {
                break;
            }
        }
        this.keys.splice(index, 0, key);
        return this.keys.length;
    }

    // TODO delete
    insert(index: number, key, children?: [BTreeNode, BTreeNode]) {
        if (this.children.length) {
            if (!children) {
                throw new Error('This is not leaf, need argument children!');
            }
            this.children.splice(index, 1, children[0], children[1]);
        }
        this.keys.splice(index, 0, key);
        if (this.keys.length >= this.tree.order) {
            this.splitMedian();
        }
    }

    // 删除节点里指定的key
    deleteKey(key): number {
        let index , len = this.keys.length;
        for (index = 0; index < len; index++) {
            if (key === this.keys[index]) {
                this.keys.splice(index, 1);
                return this.keys.length;
            }
        }
        return null;
    }

    delete(index: number) {
        // 如果是叶子节点
        if (this.isLeaf()) {
            this.keys.splice(index, 1);
            // 当前节点的key较多时，直接删除即可
            if (this.keys.length >= this.tree.minKeysNum) return;

            let indexFromParent = this.getIndexFromParent()
            // 选取右边的兄弟节点
            let sibling: BTreeNode = this.getRightSibling();
            if (sibling) {
                // 如果右边兄弟节点的key较多
                if (sibling.keys.length > this.tree.minKeysNum) {
                    sibling.transfromKeyToLeftSibling(indexFromParent + 1);

                } else {
                    // 如果兄弟节点的key较少，则需要合并
                    this.merge(1);

                }
                return;
            }
            // 如果不存在右边的兄弟节点，则选取左边的节点
            sibling = this.getLeftSibling();
            if (sibling) {
                // 如果左边兄弟节点的key较多
                if (sibling.keys.length > this.tree.minKeysNum) {
                    sibling.transfromKeyToRightSibling(indexFromParent - 1);

                } else {
                    // 如果兄弟节点的key较少，则需要合并
                    this.merge(-1);

                }
            }
        
        //  不是叶子节点时，后继的key覆盖要删除的key，一直到叶子节点
        //  相当于是找到此key对应的右子节点的子树的最左下的叶子节点（比key大，且最接近）
        } else {
            let node = this.children[index + 1];
            while (node.children.length) {
                node = node.children[0];
            }
            this.keys[index] = node.keys[0];
            node.delete(0);

        }
    }

    getIndexFromParent(): number {

        if (!this.parent) return -1;

        return this.parent.children.findIndex(ele => ele === this);
    }

    // 获取左边兄弟节点
    // index 是非必须的
    getLeftSibling(index?: number): BTreeNode {
        index = arguments.length ? index : this.getIndexFromParent();

        if (index === -1 || index === 0) return null;
        // if (index === 0) return null;
        return this.parent.children[index - 1];
    }

    // 获取右边的兄弟节点
    // index 是非必须的
    getRightSibling(index?: number): BTreeNode {
        index = arguments.length ? index : this.getIndexFromParent();
        if (index === -1) return null;
        
        let siblings = this.parent.children;
        if (index + 1 === siblings.length) return null;

        return siblings[index + 1];
    }

    // 从中间分裂节点
    splitMedian() {

        if (this.keys.length < this.tree.order) {
            throw new Error('Not enougth kes to split! ');
        }

        let index: number = Math.floor(this.keys.length / 2);
        let middleKey: KeyType = this.keys[index];

        let leftKeys: KeyType[], leftNode: BTreeNode, leftNodeChildrens: BTreeNode[] = [],
            rightKeys: KeyType[], rightNode: BTreeNode, rightNodeChildrens: BTreeNode[] = [];

        // 节点分裂后，children需要重新分配
        if (!this.isLeaf()) {
            leftNodeChildrens = this.children.slice(0, index + 1);            
            rightNodeChildrens = this.children.slice(index + 1);
        }
        
        leftKeys = this.keys.slice(0, index);
        rightKeys = this.keys.slice(index + 1);

        leftNode = new BTreeNode(this.tree, leftKeys, leftNodeChildrens, this.parent);
        rightNode = new BTreeNode(this.tree, rightKeys, rightNodeChildrens, this.parent);

        let indexFromParent: number = this.getIndexFromParent();
        
        // 非根节点
        if (indexFromParent > -1) {
            // this.parent.insert(indexFromParent, middleKey, [leftNode, rightNode]);
            // 插入中间的key && 原来的节点换成两个
            this.parent.keys.splice(indexFromParent, 0, middleKey);
            this.parent.children.splice(indexFromParent, 1, leftNode, rightNode);

        // indexFromParent == -1 时，该节点是根节点，则新建一个节点作为根节点
        } else {
            this.tree.root = new BTreeNode(this.tree, [middleKey], [leftNode, rightNode], null);

        }
    }

    /**
     *  将此节点合并指定方向上的一个节点
     *  @direction  合并的方向： 1（向右） 或者 -1（向左）
     *  @return     返回新的节点
     */
    // TODO 判断是否是根节点，逻辑不够清晰
    // TODO 判断是否是根节点，逻辑不够清晰
    // TODO 判断是否是根节点，逻辑不够清晰
    merge(direction, sibling?: BTreeNode): BTreeNode {

        // let sibling: BTreeNode;
        let keyIndex: number;
        let parentKey: KeyType;
        let keys: KeyType[] = [];
        let children: BTreeNode[] = [];

        keyIndex = this.getIndexFromParent();

        if (keyIndex === -1) {
            throw new Error('This is root! ');
        }

        if (direction === 1) {
            sibling = sibling || this.getRightSibling();
            parentKey = this.parent.keys[keyIndex];
            keys = this.keys.concat([parentKey], sibling.keys);
            children = this.children.concat(sibling.children);

        } else if (direction === -1) {
            sibling = sibling || this.getLeftSibling();
            keyIndex = keyIndex - 1;
            parentKey = this.parent.keys[keyIndex];
            keys = sibling.keys.concat([parentKey], this.keys);
            children = sibling.children.concat(this.children);

        } else {
            throw new Error('direction should be 1 or -1! ');

        }

        // key过多会使合并后节点的key超出范围；
        if (sibling.keys.length > this.tree.minKeysNum || this.keys.length > this.tree.minKeysNum) {
            throw new Error(`Node key's number more than minKeysNum, shouldn't merge!`);
        }
        /*
        // 如果是父节点是根节点，key可以只有一个
        if (this.parent.isRoot()) {
            // 如果根节点key为1个
            if (this.parent.keys.length === 1) {

                // 合并后的新节点的 key 刚好是 order 个 或者少于 order
                if (sibling.keys.length <= this.tree.minKeysNum) {
                    this.tree.root = new BTreeNode(this.tree, keys, children, null);

                // 否则 sibling 转移一个 key 即可
                } else {
                    // sibling的index只能是1或者0
                    keyIndex = direction === 1 ? 1 : 0
                    sibling.transfromKeyToSibling(-direction, keyIndex);
                }
                return;
            }
        }
        */
        let newNode: BTreeNode = new BTreeNode(this.tree, keys, children, this.parent);
        // 修改父节点的key, children
        this.parent.keys.splice(keyIndex, 1);
        this.parent.children.splice(keyIndex, 2, newNode);

        // 父节点key太少，需要继续往上合并
        // if (this.parent.keys.length < this.tree.minKeysNum) {
        if (this.parent.isKeyLess()) {
            // 根基点没有可以了用子节点代替
            if (this.parent.isRoot()) {
                this.tree.root = newNode;
                newNode.parent = null;
                return newNode;
            }

            let dir = -1, parentSibling = this.parent.getRightSibling();
            if (!parentSibling) {
                dir = 1;
                parentSibling = this.parent.getLeftSibling();
            }
            
            if (parentSibling.keys.length > this.tree.minKeysNum) {
                // 父节点的兄弟节点左边转移一个key
                parentSibling.transfromKeyToSibling(dir);

            } else {
                // 父节点的兄弟节点向左边merge
                parentSibling.merge(dir, this.parent); 
            }
            return

            /*
            let parentSibling = this.parent.getRightSibling();
            if (parentSibling) {
                if (parentSibling.keys.length > this.tree.minKeysNum) {
                    // 父节点的兄弟节点左边转移一个key
                    parentSibling.transfromKeyToLeftSibling();

                } else {
                    // 父节点的兄弟节点向左边merge
                    parentSibling.merge(-1, this.parent); 
                }

            } else {
                parentSibling = this.parent.getLeftSibling();
                if (parentSibling.keys.length > this.tree.minKeysNum) {
                    // 父节点的兄弟节点右边转移一个key
                    parentSibling.transfromKeyToRightSibling();

                } else {
                    // 父节点的兄弟节点向右边merge
                    parentSibling.merge(1, this.parent); 
                }
            }
            */
        }
        
        return newNode;
    }

    // 为了平衡节点数量，转移一个 key 给兄弟节点
    // 左节点 -> 右节点：
    //          父节点对应的key -> 添加右节点key的第一个（unshift）
    //          左节点的最右key -> 父节点的key
    //          左节点的最右child -> 右节点的children的第一个
    transfromKeyToSibling(direction, indexFromParent?: number) {

        indexFromParent = arguments.length ? indexFromParent : this.getIndexFromParent();
        if (!this.parent) {
            throw new Error('no parent node!');
        }
        if (direction === 1) {
            this.transfromKeyToRightSibling(indexFromParent);
        } else {
            this.transfromKeyToLeftSibling(indexFromParent);
        }

    }

    // indexFromParent 其实是非必须的
    // 只是为了少执行一次 getIndexFromParent
    transfromKeyToRightSibling(indexFromParent?: number) {

        indexFromParent = arguments.length ? indexFromParent : this.getIndexFromParent();

        let sibling = this.getRightSibling(indexFromParent);
        // TODO delete
        if (sibling.keys.length >= this.tree.minKeysNum || this.keys.length <= this.tree.minKeysNum) {
            console.error('sibling.keys.length >= this.tree.minKeysNum || this.keys.length <= this.tree.minKeysNum');
        }
        if (sibling) {
            // 父节点的key移动到兄弟节点keys的第一个
            sibling.keys.unshift(this.parent.keys[indexFromParent]);
            // 该节点的最后一个key补给父节点
            this.parent.keys[indexFromParent] = this.keys.pop();
            // 非叶子节点
            if (this.children.length) {
                // 该节点的最后一个child移动到兄弟节点children的第一个，parent的指向重新调整
                let child = this.children.pop();
                child.parent = sibling;
                sibling.children.unshift(child);
            }
        }
    }
    
    // 
    transfromKeyToLeftSibling(indexFromParent?: number) {

        indexFromParent = arguments.length ? indexFromParent : this.getIndexFromParent();

        let sibling = this.getLeftSibling(indexFromParent);
        // TODO delete
        if (sibling.keys.length >= this.tree.minKeysNum || this.keys.length <= this.tree.minKeysNum) {
            console.error('sibling.keys.length >= this.tree.minKeysNum || this.keys.length <= this.tree.minKeysNum');
        }
        if (sibling) {
            let keyIndex = indexFromParent - 1;
            // 父节点的key移动到兄弟节点keys的最后一个
            sibling.keys.push(this.parent.keys[keyIndex]);
            // 该节点的第一个key补给父节点
            this.parent.keys[keyIndex] = this.keys.shift();
            // 非叶子节点
            if (this.children.length) {
                // 该节点的第一个child移动到兄弟节点children的最后一个，parent的指向重新调整
                let child = this.children.shift();
                child.parent = sibling;
                sibling.children.push(child);
            }
        }
    }

    // 判断是否是根节点
    isRoot(): boolean {
        return !this.parent
    }

    // 判断是否是叶子节点
    isLeaf(): boolean {
        return this.children.length === 0;
    }

    // 判断节点的key是否过少
    isKeyLess(): boolean {
        if (this.isRoot()) {
            return this.keys.length < 1
        }
        return this.keys.length < this.tree.minKeysNum
    }

    isInternal() {}

    toJSON() {}

}


/** B树对照（测试用） */
export class BTreeReference {

    constructor(data?) {
        this.data = data || [];
    }

    data: any[];

    search(val) {
        let index = this.data.indexOf(val);
        if (index > -1) {
            return val;
            // return { index: index, value: val }
        }
        return null;
    }

    insert(val) {
        this.data.push(val);
        this.sort();
    }

    sort() {
        this.data.sort((a, b) => a - b);
    }

    delete(val) {
        let index = this.data.indexOf(val);
        if (index > -1) {
            this.data.splice(index, 1);
            return true;
        }
        return false;
    }

    update(val, newVal) {
        let index = this.data.indexOf(val);
        if (index > -1) {
            this.data[index] = newVal;
            this.sort();
            return true;
        }
        return false;
    }

    toEqual(arr) {
        console.log('test: ', this.data, arr);
        if (this.data.length !== arr.length) console.error('not equal!');
        for (let index = 0; index < this.data.length; index++) {
            if (this.data[index] !== arr[index]) {
                console.error('not equal!');
                return
            }
        }
        console.warn('is equal.');
    }
}

