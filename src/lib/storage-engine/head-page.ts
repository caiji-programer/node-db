import Page from "./page";
import Util from "../../util";

/**
 *  HeadPage: 继承Page，用于记录数据页的使用情况
 *      headPageNum(4Byte)   文件的HeadPage的数量，只在第一个HeadPage里，其他为0000；
 *      headPageIndex(4Byte) 此HeadPage是文件中的第几个；
 *      UsedBitMap(4088Byte) 对应着4088*8个Page的使用状态
 */
class HeadPage extends Page {

    constructor(file, pos, buf: Buffer) {
        super(file, pos, buf);
        // super(file, pos, buf);
        this.index = buf.readInt32BE(4);
    }

    static  MAP_CONTENT_PAGE_NUM: number = 4088 * 8;

    index;

    bitMap;
    
    pagesBitMap;

    isSlotUsed(i: number): boolean {
        // buffer前面的两个四字节需要跳过
        i += 8 * 8;
        let bit = Util.buffer.readBit(this.buffer, i);
        return bit === 1;
    }

    findEmptySlotIndex(): number {
        // 跳过八个字节开始查找
        let index = Util.buffer.findBinary0Index(this.buffer, 8);
        if (index === -1) return -1;
        return index - 8 * 8;
    }

    changeSlotState(i: number, isUsed: boolean) {
        let val = isUsed ? 1 : 0;
        // buffer前面的两个四字节需要跳过
        // let index = i + 8 * 8;
        i += 8 * 8;
        Util.buffer.writeBit(this.buffer, i, val);
        this.makeDirty();
    }

    changeHeadPageNum(num: number) {
        this.buffer.writeInt32BE(num, 0);
        this.makeDirty();
    }

}

export default HeadPage;
