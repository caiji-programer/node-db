
// 该类实现了缓冲池的缓存算法
// 此算法在 innodb 存储引擎中叫做 midpoint insertion strategy

import * as LRUCache from "./lru-cache";

// 配置项
type ConfigOption = {
    max: number,
    pct?: number
}

// 元素 所在的位置
enum EleLoc { 
    // 缓冲池的新生代里
    NEW = 2,
    // 缓冲池的老生代里
    OLD = 1,
    // 不在缓冲池里
    NULL = 0 
};

class MidpointInsertionCache <T> {
    // option 可以是数字
    constructor(option: number | ConfigOption) {

        if (typeof option === "number") {
            this.MAX = option;
        } else {
            this.MAX = option.max;
            this.OLD_BLOCKS_PCT = option.pct;
        }

        this.reset();
    }
    // 最大容量
    MAX: number = 200;
    // 老生代占的比例，默认是3/8
    OLD_BLOCKS_PCT: number = 3/8;
    // 老生代
    oldSublist: LRUCache;
    // 新生代
    newSublist: LRUCache;

    get length () {
        return this.newLength + this.oldLength;
    }

    get oldLength() {
        return this.oldSublist.length;
    }

    get newLength() {
        return this.newSublist.length;
    }

    // 查找元素所在的位置
    find(key: string | number): EleLoc {
        if (this.newSublist.has(key)) {
            return EleLoc.NEW
        }
        if (this.oldSublist.has(key)) {
            return EleLoc.OLD
        }
        return EleLoc.NULL
    }

    /** 设置缓存
     *  如果有元素溢出旧返回该元素，否则返回 null，
     *  值得注意的是：LRUCache 的 set 方法可能失败返回 false，
     *              不过，前提是元素的长度不一样，
     *              因此本类中每个元素的大小都固定为1，不会返回 false
     */ 
    set(key: string | number, value: T): T {

        // 如果在新生代里，则移动到新生代最前
        if (this.newSublist.has(key)) {
            this.newSublist.set(key, value);

        // 如果在老生代里，则移动到新生代最前；如果新生代有溢出的元素，就移到旧生代前
        } else if (this.oldSublist.has(key)) {
            this.moveToNewSublist(key, value);

        // 如果不在缓冲池里，则添加到旧生代前
        } else {
            // 有溢出元素时，set方法返回的不是T类型，而是 Entry 类型(在LRUCache里定义)
            // Entry : {key: any, value: T}
            let result = this.oldSublist.set(key, value);
            if (!(typeof result === "boolean")) {
                return result.value || null;
            }
        }
        return null
    }

    // 获取元素
    get(key: string | number): T {
        if (this.newSublist.has(key)) {
            return this.newSublist.get(key)
        }
        if (this.oldSublist.has(key)) {
            let ele: T = this.oldSublist.get(key);
            this.moveToNewSublist(key, ele);
            return ele
        }
        return null
    }

    // 老生代的元素移动到新生代里
    private moveToNewSublist(key, ele: T) {
        
        let result = this.newSublist.set(key, ele);

        if (result === false) {
            throw new Error("can't set Sublist item");
        }

        this.oldSublist.del(key);

        // 新生代还有空间，没有元素溢出
        if (result === true) {
            return
        }

        // 新生代已经满了，result 就是返回的最后一个 item, 经过了 Entry 包装
        // 需要把 item 移到 旧生代的前面
        this.oldSublist.set(result.key, result.value);
    }

    // 删除
    del(key: string | number) {
        if (this.newSublist.has(key)) {
            return this.newSublist.del(key)
        }
        if (this.oldSublist.has(key)) {
            return this.oldSublist.del(key)
        }
        return null
    }

    // 重置
    reset() {
        // 老生代占整个链长度的比例，默认是3/8  OLD_BLOCKS_PCT
        let oldSublistLen: number = Math.floor(this.MAX * this.OLD_BLOCKS_PCT);
        let newSublistLen: number = this.MAX - oldSublistLen;
        // 老生代(old sublist)
        this.oldSublist = new LRUCache(oldSublistLen);
        // 新生代(new sublist)
        this.newSublist = new LRUCache(newSublistLen); 
    }

    // 遍历
    forEach(func: Function) {
        this.newSublist.forEach(func);
        this.oldSublist.forEach(func);
    }
}

export default MidpointInsertionCache;
