
// import * as LRUCache from "lru-cache";
// import * as LRUCache from "./lib/lru-cache";
import { default as Cache } from "./midpoint-insertion-cache";
// import HeapFile from "./heap-file";
// import { HeapPage, HeapPageId } from "./heap-page";
import Page from "./page";
import DBFile from "./db-file";

// import Database from "./database"

// TODO 在整表查询时，可能会把真正的热数据冲出来；
// TODO 参考 mysql 里缓冲池的设计；

// TODO 思考！： 
// TODO 除了整个 buffer 缓存作为缓存单位，有没有更好的方案？(考虑需要到buffer转换城js对象的成本有多大)
// TODO 以 tuple 作为单位如何？


/** page 所在的位置 */
enum PageLocation {
    /** 缓冲池的新生代里 */
    NEW = 2,
    /** 缓冲池的老生代里 */
    OLD = 1,
    /** 不在缓冲池里 */
    NULL = 0
};

const config = {

}

/*  BufferPool（缓冲池）
 *  为了减少 IO 访问频率，提高性能，使用缓冲池作为缓存。此类设计参考了 mysql 缓冲池的设计。
 *  传统LRU算法在大表扫描时会使大量的热数据溢出，因此作如下调整：
 *  把缓冲池分为两部分：新生代(newSublist) 和老生代 (oldSublist),
 *  根据 OLD_BLOCKS_PCT（老生代占缓冲池的百分比）来对缓冲池来划分两个区域
 *  更多请参考： doc/buffer-pool.md
 */
class BufferPool {

    constructor(numPages?) {
        //
        this.PAGES_NUM = numPages || BufferPool.DEFAULT_PAGES;

        this.cache = new Cache(this.PAGES_NUM);

        // 缓冲池应该分数据页，索引页和插入缓冲，锁信息等等，参考 mysql 

        this.lockManager = new LockManager();
        // 太小会造成忙碌的查询死锁，太大会浪费等待时间
        this.SLEEP_INTERVAL = 500;
    }
    /** 老生代占缓冲池的百分比 */
    static OLD_BLOCKS_PCT: number = 3 / 8;
    /** 默认的缓冲池页的数量 */
    static DEFAULT_PAGES: number = 200;
    /** 缓冲池页的数量，可以通过配置，默认是 DEFAULT_PAGES */
    PAGES_NUM: number;

    cache: Cache<Page>;

    //锁管理器
    private lockManager: LockManager;

    //事务获取不到锁时需要等待，由于实际用的是sleep来体现等待，此处参数是sleep的时间
    private SLEEP_INTERVAL: number;

    reset() {
        this.cache.reset()
    }

    // 往缓冲池里提添加 page，如果有 page 溢出，则需要判断是否为脏页
    async push(page: Page) {
        let p = this.cache.set(page.pageKey, page);
        // if (p && p.value) {
        if (p && p.isDirty) {
            // 此脏页退出缓冲池前要强制写入磁盘
            console.log("pop page: ", p.pageKey);
            await this.flushPage(p);
        }
        // }
    }

    // 
    async chachePages(pages: Page[]) {
        let i = 0;
        for (let index = 0; index < pages.length; index++) {
            const page: Page = pages[index];
            await this.push(page)
        }
        /*
        let dirtyPages: HeapPage[]= this.getDirtyPages();
        console.log("\n after chachePages,  dirtyPages ------> ");
        dirtyPages.forEach(page => {
            console.log(page.pageKey);
        });
        console.log("\n");
        */
    }

    // 参考 mysql 的 checkPoint 机制
    checkPoint() {

    }

    // 查找page所在的位置（新生代/老生代/缓冲池之外）
    // findPage(pageKey: string): PageLocation {
    //     return this.cache.find(pageKey);
    // }

    // 
    getPageIdMap() {
        // return this.lruCachePages.keys().map(pageId => pageId, true);
    }

    // 查找page所在的位置（新生代/老生代/缓冲池之外）
    findPage(pageKey: string): PageLocation {
        // TODO
        let page = this.cache.find(pageKey);
        return page ? PageLocation.NEW : PageLocation.NULL;
    }


    // 从 新/老生代 里获取指定的 page
    // getPage(tid, pageId) {
    getPage(pageKey: string) {
        return this.cache.get(pageKey);
    }

    // 
    getDirtyPages() {
        let pages: Page[] = [];
        this.cache.forEach((page: Page, key: string) => {
            if (page.isDirty) {
                pages.push(page);
            }
        })
        return pages;
    }

    // 释放 page
    releasePage(pageId) {
        // this.lockManager.unlock()
    }

    // 
    async flushPage(page: Page) {
        console.log(`flush page start, page key: ${page.pageKey}`);
        let file: DBFile = page.file;
        //  = Database.catalog.id2File.get(page.pageId.fileId);
        await file.writePage(page).then((result) => {
            page.isDirty = false;
            console.log(`write page success:  ${page.pageKey}`);
            // console.log(result);
        });
        console.log(`flush page end, page key:  ${page.pageKey}`);
    }

    // 
    async flushPages(pages: Page[]) {
        // TODO 按照文件划分 再一起 flush
        if (pages && pages.length) {
            pages.forEach((page: Page) => {
                this.flushPage(page);
            })
        }
    }

    async flushAllDirtyPages(callback?: Function) {
        let pages = this.getDirtyPages();
        let fileMap = new Map<string, DBFile>();
        let err, result;
        pages.forEach(page => {
            let id = page.file.id;
            if (!fileMap.has(id)) {
                fileMap.set(id, page.file);
            }
        })
        await this.flushPages(pages);
        console.log(`写入 ${pages.length} 个Page`);
        let headPageNum = 0;
        for (let [key, file] of fileMap) {
            headPageNum += await file.writeAllHeadPages();
        }
        console.log(`${fileMap.size} 个文件，共写入 ${headPageNum} 个HeadPage`);
        if (callback) callback(pages.length);
        return pages.length + headPageNum;
    }

}


class LockManager {

}


export default BufferPool;

