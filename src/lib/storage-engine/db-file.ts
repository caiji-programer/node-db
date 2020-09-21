import * as fs from 'fs';
import * as path from "path";

import File from "../file";
import Page from './page';
import HeadPage from './head-page';
import StorageEngine from './storage-engine';


interface FileHeadInfo {
    headPageNum: number;
    pageUsedMap: Map<number, Buffer>
}


/** 文件Id生成器，每个文件对应唯一的id；
 *  id为8位数字组成的字符串
 */
export class IdGenerator {

    private static count: number = 1;

    private static idMap = new Map<string, string>();

    /** 获取文件的id */
    static getId(filePath: string): string {
        filePath = path.resolve(filePath);
        // console.log(`filePath: ${filePath}`);
        let id = this.idMap.get(filePath);
        if (!id) {
            id = ("00000000" + this.count).slice(-8);
            this.idMap.set(filePath, id);
            this.count++;
        }
        // console.log("id: ", id)
        return id;
    }
}


/**
 *  TODO: 已经做了修改
 *  所有文件都继承该类，如：BPTreeFile(B+树数据文件), DataFile（普通数据文件）, IndexFile（索引文件）
 *  所有文件的通用数据结构：
 *      1个HeadPage 跟着 4088*8 个ContentPage，如此重复。
 *      HeadPage: 继承Page，用于记录ContentPage的使用情况（见head-file.ts）；
 *      ContentPage: 没有固定结构，不同文件的ContentPage数据结构不一样，没有实现类，直接用Page。
 */
class DBFile extends File {

    constructor(path, storage?: StorageEngine) {
        super(path);
        this.id = IdGenerator.getId(path);
        this.storage = storage;
    }

    /** 文件id */
    id: string;

    storage: StorageEngine;

    headPageMap: Map<number, HeadPage>;
    headPageNum: number;

    pageNum: number;

    // headInfo: FileHeadInfo

    // TODO 思考：读取所有HeadPage是否有必要？还是需要时再读取？
    // 先读取所有HeapPage
    async init() {
        try {

            this.pageNum = fs.statSync(this.path).size / Page.PAGE_SIZE;
            // 

            let result = await this.read(0, Page.PAGE_SIZE);
            let buf = result.buffer;
            this.headPageNum = buf.readInt32BE(0);
            this.headPageMap = new Map<number, HeadPage>();
            this.headPageMap.set(0, new HeadPage(this, 0, buf));

            if (this.headPageNum > 1) {
                for (let i = 1; i < this.headPageNum; i++) {
                    let pos = (HeadPage.MAP_CONTENT_PAGE_NUM + 1) * i;
                    result = await this.read(pos, Page.PAGE_SIZE);
                    buf = result.buffer;
                    this.headPageMap.set(i, new HeadPage(this, i, buf));
                }
            }

            // TODO


        } catch (e) {
            throw e;
        }
    }

    /** TODO 重置第一个HeadPage */
    async resetHeader() {
        let headBuf = Buffer.alloc(Page.PAGE_SIZE), page = new HeadPage(this, 0, headBuf);
        // 新建只有一个HeadPage
        headBuf.writeInt32BE(1, 0);
        // 当前HeadPage是首个
        headBuf.writeInt32BE(0, 4);
        await this.writePage(page);
    }

    isPageUsed(index): boolean {
        if (!this.headPageMap) throw new Error(`HeadPage should parse at first! `);
        let i = index % 4089, j = Math.floor(index / 4089);
        // HeadPage 默认为已经被使用
        if (i === 0) {
            return true;
        }

        let page = this.headPageMap.get(j);
        if (!page) {
            return false;
            // let page = await this.readPage(index);
        }
        return page.isSlotUsed(i - 1);
    }

    /** 获取指定的page（先从缓存里取，没有则读取文件） */
    async getPage(index: number) {
        // point === 0 时为 HeadPage
        if (!index) return null;
        // 
        let isUsed = this.isPageUsed(index);
        if (!isUsed) return null;

        let pageKey = this.id + index;
        let page: Page;
        if (this.storage) {
            page = this.storage.bufferPool.getPage(pageKey);
            if (page) return page;
        }
        let result = await this.read(index * Page.PAGE_SIZE, Page.PAGE_SIZE);
        page = new Page(this, index, result.buffer);
        if (this.storage) {
            await this.storage.bufferPool.push(page)
        }
        return page;
    }

    /** 存储page（存在缓存，不写入文件） */
    async storePage(page) {
        if (this.storage) {
            await this.storage.bufferPool.push(page);
        }
    }

    // TODO delete
    async readPage(index: number) {
        // TODO pageNum 可能会变化
        // TODO pageNum 可能会变化
        // if (index < 0 || index >= this.pageNum) return null;
        let result = await this.read(index * Page.PAGE_SIZE, Page.PAGE_SIZE);
        let page = new Page(this, index, result.buffer);
        return page;
    }

    // async writePage(index: number, buf: Buffer) {
    async writePage(page: Page) {
        let buffer: Buffer = page.buffer, pos: number = page.pos * Page.PAGE_SIZE;
        let result = await this.write(pos, buffer);
        return result.bytesWritten;
    }

    /** 将所有HeadPage写入文件 */
    async writeAllHeadPages() {
        for (let [key, page] of this.headPageMap) {
            await this.writePage(page);
        }
        return this.headPageMap.size;
    }

    // 分配一个空Page，返回该page的位置
    alloc() {
        // TODO 
        let index: number;
        let result = this.findEmptyPagePos();
        if (!result) {
            // TODO 待测试
            let buf = Buffer.alloc(Page.PAGE_SIZE);
            let page = new HeadPage(this, this.pageNum, buf);
            index = this.pageNum;

            page.index = this.headPageNum;
            page.makeDirty();

            this.pageNum++;
            this.headPageNum++;

            // 第一个headPage也要修改；
            let firstHeadPage: HeadPage = this.headPageMap.get(0);
            firstHeadPage.changeHeadPageNum(this.headPageNum);
            // firstHeadPage.makeDirty(); 已经调用过

        } else {
            // index = (HeadPage.MAP_CONTENT_PAGE_NUM + 1) * result.part + result.index
            // let map: Buffer = this.headInfo.pageUsedMap.get(result.part);
            let page = result.page;
            //  index = result.index;
            result.page.changeSlotState(result.index, true);
            index = page.pos + result.index + 1;
            // return page.pos + pos.index + 1;
            // Util.buffer.writeBit(map, pos.index, 1);
        }
        // map
        // console.log(`alloc page: ${index}`);
        return index;
    }

    // 释放指定的Page
    free(index: number) {
        // throw new Error("should implement free()!");
        let i = index % 4089, j = Math.floor(index / 4089);
        let page = this.headPageMap.get(j);
        if (page) {
            page.changeSlotState(i - 1, false);
            // console.log(`free page: ${index}`);
        } else {
            console.error(`can't free page: ${index}`);
        }
    }

    findEmptyPagePos(): { page: HeadPage, index: number } {
        let index, num: number = this.headPageNum, page: HeadPage;
        for (let part = 0; part < num; part++) {
            page = this.headPageMap.get(part);
            // 所有headPage是经过预读的，正常情况下不应该有buf为空的情况
            if (!page) continue;
            index = page.findEmptySlotIndex();
            if (index !== -1) {
                return {
                    page,
                    index,
                    // part,
                    // // 每个part前面还有一个HeadPage
                    // index: index + 1
                }
            }
        }
        return null;
    }

    traversalPage: () => {}
}

export default DBFile;
