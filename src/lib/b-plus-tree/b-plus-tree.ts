import { TreeNode } from "./tree-node";
import Util from "../../util";

/** 抽象类 BPlusTree */
abstract class BPlusTree<Node extends TreeNode> {

    constructor(order, root?: Node) {
        if (order) {
            if (order <= 3) throw new Error('Order must > 3! ');
            this.order = order;
        }
        this.root = root;
    }

    order: number;
    root: Node;
    // TODO 是否允许相同的key
    allowDuplicateKey: boolean = true;

    abstract async createNode(keys: any[], datas: any[], children?, parent?): Promise<Node>;
    // throw new Error("createNode() not implemented.");
    abstract releaseNode(node: Node);

    /** 获取第一个叶子节点 */
    async getFirstLeafNode(): Promise<Node> {
        if (!this.root.keys.length) return null;

        let child = this.root;
        while (!child.isLeaf) {
            // point = child.childPoints[0];
            // console.log(`readNode -> ${point}`);
            // child =  await child.readNode(point);
            child = await child.getChild(0);
            if (!child) return null;
        }
        // console.log(child);
        return child;
    }

    /** 获取所有叶子节点 */
    async getAllLeafNodes(): Promise<Node[]> {
        let nodes: Node[] = [];
        await this.traverseLeafNodes((index, node) => {
            nodes.push(node);
        })
        return nodes;
    }

    /** 获取整棵树的所有节点 */
    async getAllNodes(): Promise<Node[]> {
        let nodes: Node[] = [];
        await this.traverse((index, node) => {
            nodes.push(node);
        })
        return nodes;
    }

    /** 遍历所有叶子节点 */
    async traverseLeafNodes(callback: (index: number, node: Node) => void) {
        let index: number = 0;
        let node: Node = await this.getFirstLeafNode();

        while (node) {
            callback(index, node);
            index++;
            node = await node.getNext();
        }
    }

    /** 遍历所有节点（由上至下） */
    async traverse(callback: (index: number, node: Node) => void) {
        let index = 0;
        let nodes: Node[] = [this.root];
        while (nodes.length) {
            let temp = [];
            for (let i = 0; i < nodes.length; i++) {
                let node = nodes[i];
                callback(index, node);
                index++;

                if (!node.isLeaf) {
                    for (let j = 0; j < node.keys.length; j++) {
                        let child: Node = await node.getChild(j);
                        temp.push(child);
                    }
                }
            }
            nodes = temp;
        }
    }

    /** 查找特定key所在的叶子节点 */
    async searchNode(key): Promise<Node> {
        let current: Node = this.root;
        while (!current.isLeaf) {
            let index: number, child;
            // TODO 假定key值都不相同，且keys为子节点所有key的最大值
            // TODO 假定key值都不相同，且keys为子节点所有key的最大值
            for (index = 0; index < current.keys.length - 1; index++) {
                if (key <= current.keys[index]) break;
            }
            // point = current.childPoints[index];
            // let child = await current.readNode(point);
            current = await current.getChild(index);
            // TODO 应该抛出错误
            if (!current) return null;
        }
        return current;
    }

    /** 查找单个Node的第一个key的数据 */
    async search(key) {
        let node: Node = await this.searchNode(key);
        let index = node.keys.findIndex(k => k === key);
        if (index === -1) return null;
        // 返回data
        return node.datas[index];
    }

    /** 查询指定范围的node（不修改key值得情况下可以调用，因为修改key会影响父节点） */
    async traverseNodes(startKey, endKey, callback: (node: Node) => void) {
        let current: Node, end: Node, keys: any[] = [];
        if (startKey === null || startKey === undefined) {
            current = await this.getFirstLeafNode();
        } else {
            current = await this.searchNode(startKey);
        }

        if (endKey !== undefined) {
            end = await this.searchNode(endKey);
        }

        while (current) {
            // keys = keys.concat(current.keys);
            callback(current);
            current = await current.getNext();
            if (!current) break;
            if (end && current.toEqual(end)) {
                callback(current);
                break;
            }
        }
        // return keys;
    }

    /** 查询范围key所在的节点里的所有key（可能存在少数范围外的key） */
    async queryKeys(startKey?, endKey?): Promise<any[]> {
        // let startKey = args[0], endKey = args[1], matchFn: (key) => boolean = args[2];
        let current: Node, end: Node, keys: any[] = [];
        if (startKey === null || startKey === undefined) {
            current = await this.getFirstLeafNode();
        } else {
            current = await this.searchNode(startKey);
        }

        if (endKey !== undefined) {
            end = await this.searchNode(endKey);
        }

        while (current) {
            keys = keys.concat(current.keys);
            current = await current.getNext();
            if (!current) break;
            if (end && current.toEqual(end)) {
                return keys.concat(current.keys);
            }
        }
        return keys;
    }

    /** 查询范围key所在的节点里的所有key和data（可能存在少数范围外的key） */
    async queryKeysAndDatas(startKey?, endKey?): Promise<{ key, data }[]> {
        let current: Node, end: Node, results: { key, data }[] = [];
        if (startKey === null || startKey === undefined) {
            current = await this.getFirstLeafNode();
        } else {
            current = await this.searchNode(startKey);
        }

        if (endKey !== undefined) {
            end = await this.searchNode(endKey);
        }

        while (current) {
            current.keys.forEach((key, index) => {
                results.push({
                    key,
                    data: current.datas ? current.datas[index] : null
                });
            });

            current = await current.getNext();
            if (!current) break;
            if (end && current.toEqual(end)) {
                current.keys.forEach((key, index) => {
                    results.push({
                        key,
                        data: current.datas ? current.datas[index] : null
                    });
                });
                return results;
            }
        }
        return results;
    }

    /** 查询数据（等值查询或范围查询）
     *  TODO 刚好是startKey/endKey部分的数据处理方式有点繁杂
     *  TODO 待优化
     */
    async query() /** 全部查询 */
    async query(key) /* 等值查询 */
    async query(startKey, endKey) /* 范围查询 */
    async query(startKey, endKey, isIncludeStart: boolean, isIncludeEnd: boolean)
    async query(...args) {
        // 全部查询 没有参数相当于查找所有叶子节点
        if (args.length === 0) {
            let nodes = await this.getAllLeafNodes();
            let datas = [].concat(...nodes.map(node => node.datas));
            return datas;
        }

        // 等值查询 
        if (args.length === 1) {
            let key = args[0], i = 0, result = [];
            let current = await this.searchNode(key);
            while (current) {
                for (i = 0; i < current.keys.length; i++) {
                    if (current.keys[i] === key) {
                        result.push(current.datas[i]);
                    }
                }
                // 如果key等于最后一个key，需要继续找
                if (key === current.keys[current.keys.length - 1]) {
                    current = await current.getNext();
                } else {
                    return result;
                }
            }

            return result;
        }

        // 范围查询

        // 定义参数
        let startKey, endKey, isIncludeStart: boolean, isIncludeEnd: boolean;
        if (args.length == 2) {
            startKey = args[0], endKey = args[1], isIncludeStart = true, isIncludeEnd = true;
        } else {
            startKey = args[0], endKey = args[1], isIncludeStart = args[2], isIncludeEnd = args[3];
        }

        if (startKey > endKey) {
            return null;
        }
        // 
        let current: Node, end: Node, result: any[] = [], i: number = 0;
        if (startKey === null || startKey === undefined) {
            current = await this.getFirstLeafNode();
        } else {
            current = await this.searchNode(startKey);
            // 如果不包含startKey，则需要跳过key值为startKey的数据
            if (!isIncludeStart) {
                if (startKey === current.keys[current.keys.length - 1]) {
                    current = await current.getNextAndHasDiffKey();
                    // 如果已经是最后一个直接返回空[]
                    if (!current) return [];
                }
                for (i = 0; i < current.keys.length; i++) {
                    if (current.keys[i] > startKey) {
                        break;
                    }
                }
            } else {
                for (i = 0; i < current.keys.length; i++) {
                    if (current.keys[i] >= startKey) {
                        break;
                    }
                }
            }

        }

        if (endKey) {
            end = await this.searchNode(endKey);
        }

        // 第一个节点符合条件的数据
        result = current.datas.slice(i);

        while (true) {
            current = await current.getNext();

            if (!current) break;
            if (end && current.toEqual(end)) {
                // 如果包括endKey
                if (isIncludeEnd) {
                    // 如果endKey等于最后一个key，需要继续找
                    while (endKey === current.keys[current.keys.length - 1]) {
                        current.datas.forEach(data => result.push(data));
                        current = await current.getNext();
                        if (!current) return result;
                    }
                    for (i = 0; i < current.keys.length; i++) {
                        if (current.keys[i] > endKey) {
                            break;
                        }
                        result.push(current.datas[i]);
                    }
                    // 不包括endKey   
                } else {
                    for (i = 0; i < current.keys.length; i++) {
                        if (current.keys[i] >= endKey) {
                            break;
                        }
                        result.push(current.datas[i]);
                    }
                }
                return result;
            }
            current.datas.forEach(data => result.push(data));
        }

        return result;
    }

    // TODO 完善
    /** 插入一条指定key值的数据 */
    async insert(key, data) {

        if (!this.root.keys.length) {
            let leaf = await this.createNode([key], [data], null, this.root);
            leaf.makeDirty();
            // TODO 可以不用
            leaf.parent = this.root;
            this.root.keys.push(key);
            // this.root.childPoints.push(leaf.point);
            this.root.children.push(leaf.point);
            this.root.makeDirty();
            return
        }

        let node: Node = await this.searchNode(key);
        await node.insert(key, data);
    }


    /** Update TODO 是否可以操作多条数据？ */

    /** key不变，仅修改其中部分数据
     * @param key 
     * @param updateFn 
     */
    async update(key, updateFn: (data) => void)

    /** key值改变，
     * @param oldKey 
     * @param newKey 
     * @param updateFn 
     */
    async update(oldKey, newKey, updateFn: (data) => void)

    async update(startKey, endKey, matchFn: (key) => boolean, updateFn: (data) => void)
    async update(startKey, endKey, matchFn: (key) => boolean, getNewKeyFn: (data) => any, updateFn: (data) => void)
    async update(...args): Promise<number> {
        // 更改一个key的数据，key不变
        if (args.length === 2) {
            let [key, updateFn] = args;
            let node: Node = await this.searchNode(key);
            let index: number = node.keys.findIndex(k => k === key);
            if (index >= 0) {
                let data = node.datas[index];
                updateFn(data);
                node.makeDirty();
                return 1;
            }
            return 0;
        }

        // 更新一个key
        if (args.length === 3) {
            let [oldKey, newKey, updateFn] = args;
            let target: Node = await this.searchNode(newKey);
            if (target.keys.findIndex(k => k === newKey) >= 0) {
                // throw new Error(``);
                throw new Error(`key(${oldKey})无法修改成(${newKey})，因为已经存在了！`)
            }

            let node: Node = await this.searchNode(oldKey);
            let index: number = node.keys.findIndex(k => k === oldKey);
            if (index >= 0) {
                let data = node.datas[index];
                updateFn(data);
                await node.delete(oldKey);
                await this.insert(newKey, data);
                return 1;
            }
            return 0;
        }

        // 更新指定范围的数据，只是更新数据部分
        if (args.length === 4) {
            let startKey, endKey, matchFn: (key) => boolean, updateFn: (data) => void;
            [startKey, endKey, matchFn, updateFn] = args;
            let dataNums = 0;
            await this.traverseNodes(startKey, endKey, (node: Node) => {
                let isUpdated = false;
                node.keys.forEach((key, index) => {
                    if (matchFn(key)) {
                        isUpdated = true;
                        dataNums++;
                        // TODO 
                        updateFn(node.datas[index]);
                    }
                })
                if (isUpdated) node.makeDirty();
            })
            return dataNums;
        }

        // 更新指定范围的数据，且只是更新key
        if (args.length === 5) {
            let startKey, endKey, matchFn: (key) => boolean, getNewKeyFn: (data) => any, updateFn: (data) => void;
            [startKey, endKey, matchFn, getNewKeyFn, updateFn] = args;

            let keyDatas = await this.queryKeysAndDatas(startKey, endKey);
            keyDatas = keyDatas.filter(val => matchFn(val.key));

            for (let index = 0; index < keyDatas.length; index++) {
                let keyData = keyDatas[index];
                let key = keyData.key, data = keyData.data;
                updateFn(data);
                let newKey = getNewKeyFn(data);
                if (this.search(newKey)) {
                    throw new Error(`key(${keyData.key})无法修改成(${newKey})，因为已经存在了！`);
                }
                await this.delete(key);
                await this.insert(newKey, data);
            }
            return keyDatas.length;
        }

        /* let source: Node = await this.searchNode(oldKey);
        if (!source) throw new Error(`${oldKey} is not exits! `);

        let target: Node = await this.searchNode(newKey);
        if (target.keys.findIndex(k => k === newKey) >= 0) {
            // newKey 已经存在，直接删除 oldKey 的即可
            // TODO
            source.delete(oldKey);
            // TODO delete data
            return
        }

        if (source.isLeaf) {
            let keys = source.keys;
            if (newKey > keys[0] && newKey < keys[keys.length - 1]) {
                source.deleteKey(source.keys.findIndex(K => k === oldKey));
                source.insert(newKey, newData);
                return
            }
        }

        source.delete(oldKey);
        this.insert(newKey, newData); */
    }

    /** TODO 删除 */
    // async delete() /** 全部删除 */
    async delete(key) /* 等值删除 */
    async delete(startKey, endKey) /* 范围删除 */
    async delete(startKey, endKey, isIncludeStart: boolean, isIncludeEnd: boolean)
    /** 范围删除的另外一种调用方法 */
    async delete(startKey, endKey, matchFn: (key) => boolean)
    async delete(...args): Promise<number> {
        if (args.length === 0) {
            // TODO
            return
        }
        // 
        if (args.length === 1) {
            let key = args[0];
            let node: Node = await this.searchNode(key);
            if (node) {
                await node.delete(key);
            }
            return 1;
        }
        // 
        if (args.length === 3) {
            let startKey = args[0], endKey = args[1], matchFn: (key) => boolean = args[2];
            let keys = await this.queryKeys(startKey, endKey);
            keys = keys.filter(k => matchFn(k));
            for (let index = 0; index < keys.length; index++) {
                let key = keys[index];
                let node: Node = await this.searchNode(key);
                if (node) {
                    await node.delete(key);
                }
            }
            return keys.length;
        }

        // 定义参数
        let startKey, endKey, isIncludeStart: boolean, isIncludeEnd: boolean;
        if (args.length == 2) {
            startKey = args[0], endKey = args[1], isIncludeStart = true, isIncludeEnd = true;
        } else {
            startKey = args[0], endKey = args[1], isIncludeStart = args[2], isIncludeEnd = args[3];
        }

        if (startKey > endKey) {
            return 0;
        }

        // TODO 实现
        throw new Error(`not impletements!`);

    }

    /** 转换数据，按层来划分 level[] -> node[] */
    async transfrom(): Promise<Node[][]> {
        let result = [];
        let nodes: Node[] = [this.root];
        while (nodes.length) {
            let temp = [];
            for (let i = 0; i < nodes.length; i++) {
                let node = nodes[i];
                let children: Node[] = []
                if (!node.isLeaf) {
                    for (let j = 0; j < node.keys.length; j++) {
                        // let point = node.childPoints[j];
                        // let child: Node = await node.readNode(point);
                        let child: Node = await node.getChild(j);
                        children.push(child);
                        if (child.parent !== node) {
                            // TODO测试用 检查父子关系
                            console.log(node);
                        }
                    }
                }
                temp = temp.concat(children);
            }
            result.push(nodes);
            nodes = temp;
        }
        return result;
    }

    /** 打印。（以树形的方式打印，方便查看） */
    async print() {
        console.log('------------------------- print tree -----------------------');
        let temp = [];
        let result = await this.transfrom();
        result = result.reverse();
        let arr = result.map((level) => {
            let start = 0;
            let strArray = level.map(node => {
                console.log(`keys.length: ${node.keys.length}, keys: ${node.keys.join("-")}`);
                let str = `[${node.toString()}]`;
                // 叶子节点作为基准
                if (!temp.length) return str;

                let len = node.keys.length;
                // let len = node.length;
                if (!len) return str;
                let strLen = temp.slice(start, start + len).join('  ').length;
                start += len;
                return Util.stringify.alignString(str, strLen);
            })
            temp = strArray;
            return strArray.join('  ');
        })
        arr.reverse().forEach(s => console.log(s));
        console.log(`\n`);
    }

    /** TODO 测试用，检查树的所有节点 */
    async check() {
        let nodes = await this.getAllNodes();
        let message = '';
        nodes.forEach(node => {
            try {
                node.check()
            } catch (e) {
                message = message + e.message + "\n";
            }
        })
        if (message) {
            throw new Error(message);
        } else {
            return true;
        }
    }

    /* check() {
        let num = 0;
        let loop = (node) => {
            if (!node) return;
            num++;
            if (node.children.length) {
                node.children.forEach((child: TreeNode, i) => {
                    if (i > 0) {
                        if (node.keys[i - 1] > node.keys[i]) {
                            throw new Error(`key(${node.keys[i - 1]}) sort error, node: [${node.keys}].`);
                        }
                    }
                    let key = node.keys[i];
                    let len = child.keys.length;
                    let index = child.keys.indexOf(key);
                    if (index === -1 || index !== (len - 1)) {
                        throw new Error(`key(${key}) position error, node: [${node.keys}].`);
                    }
                    loop(child);
                })
            }
        }

        try {
            loop(this.root);
            console.log(`Check ${num} node, is OK. `);
        } catch (e) {
            console.error(`Check node occur Error: ${e.message}`);
            this.print();
        }
    } */

    /** 获取所有 key */
    async getAllKeys() {
        let result = [];
        let nodes = await this.getAllLeafNodes();
        // console.log(`toArray getAllLeafNodes --- ${nodes.length}`);
        nodes.forEach(node => {
            result = result.concat(node.keys);
        });
        return result;
    }

}


export {
    // NodeType,
    // NodeState,
    BPlusTree
}
