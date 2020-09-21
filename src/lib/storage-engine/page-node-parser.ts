import Page from "./page";
import { IDataReader } from "./reader";


interface ParseResult<T = any> {
    byteNum: number;
    data: T;
}


const PageNodeHeaderPropertys = [
    {name:'type', len: 1},
    {name:'offset', len: 4},
    {name:'prev', len: 4},
    {name:'next', len: 4},
    {name:'level', len: 1},
    {name:'slots', len: 2},
];

/** PageNodeHeader记录B+树文件Page的数据以外的关键信息，只用于BPlusTree的PageNode */
class PageNodeHeader {

    constructor(type?: number, offset?: number, prev?: number, next?: number, level?: number, slots?: number) {
        this.type = type || null;
        this.offset = offset || null;
        this.prev = prev || null;
        this.next = next || null;
        this.level = level || null;
        this.slots = slots || null;
    }
    // 节点类型 1 Byte
    type: number;
    // TODO 4 Byte 校验和暂时不做处理
    // TODO checksum;
    // 节点在文件的位置 4 Byte
    offset: number;
    // 前一个节点的位置（限于叶子节点） 4 Byte
    prev: number;
    // 下一个节点的位置（限于叶子节点） 4 Byte
    next: number;
    // 节点所在层次（目前没用到） 1 Byte
    level: number;
    // 节点的插槽（即：key或者data）的数量 2 Byte
    slots: number;
    // TODO
    // TODO bitMap;
    static len = 16;

    getLen() {
        let len = 0;
        PageNodeHeaderPropertys.forEach(prop => len += prop.len);
        return len;
    }
}


class PageNodeParser<T extends IDataReader> {
    // constructor(table: Table) {
    constructor(reader: T) {
        this.reader = reader;
        // 计算叶子节点的容量
        // let tupleUsedByteNum =  this.keyLen + this.tupleDesc.getSize();
        
        let tupleUsedByteNum =  this.keyLen + this.reader.getSize();
        this.leafOrder = Math.floor((Page.PAGE_SIZE - PageNodeHeader.len) / tupleUsedByteNum);
        this.leafOrder = 4;
        // 计算内部节点的容量
        let keyUsedByteNum = this.keyLen + 4;
        this.internalOrder = Math.floor((Page.PAGE_SIZE - PageNodeHeader.len) / keyUsedByteNum);
        this.internalOrder = 4;
        // console.log(`Page Order: leafOrder: ${this.leafOrder}, internalOrder: ${this.internalOrder}...`);
    }    
    // TODO 目前假定key为四字节的长度
    keyLen: number = 4;

    reader: T;
    // tupleDesc: TupleDesc;
    /** 叶子节点的容量 */
    leafOrder: number;
    /** 内部节点的容量 */
    internalOrder: number;

    parseHeader(buf: Buffer, index: number, isSkip?: boolean): ParseResult {

        if (isSkip) {
            return {
                byteNum: PageNodeHeader.len,
                data: null
            }
        }
        // let index: number = 0,
        let header: PageNodeHeader = new PageNodeHeader();
        PageNodeHeaderPropertys.forEach(prop => {
            let len = prop.len, value;
            switch(len) {
                case 1:
                    value = buf[index];
                    break;
                case 2:
                    value = buf.readInt16LE(index);
                    break;
                case 4:
                    value = buf.readInt32BE(index);
                    break;
                default:
                    // TODO
                    return;
            }

            header[prop.name] = value;
            index += len;
        })

        return {
            byteNum: PageNodeHeader.len,
            data: header
        }
    }

    writeHeader(buf:Buffer, header: PageNodeHeader) {
        let index: number = 0;
        PageNodeHeaderPropertys.forEach(prop => {
            let len = prop.len, value = header[prop.name] || 0;
            switch(len) {
                case 1:
                    buf[index] = value;
                    break;
                case 2:
                    buf.writeInt16LE(value, index);
                    break;
                case 4:
                    buf.writeInt32BE(value, index);
                    break;
                default:
                    // TODO
                    return;
            }
            index += len;
        })
    }

    parseKey(buf: Buffer, index: number, isSkip?: boolean): ParseResult {
        // TODO key不一定是4byte的数字，根据table的primaryKey来定
        // 暂时默认是4byte的数字
        // let key = buf.readInt32BE(index);
        return {
            byteNum: this.keyLen,
            data: isSkip ? null : buf.readInt32BE(index)
        }
    }

    writeKey(buf: Buffer, index, key, isSkip?) {
        buf.writeInt32BE(key, index);
        return {
            byteNum: 4
        }
    }

    parsePoint(buf: Buffer, index: number, isSkip?: boolean): ParseResult {
        return {
            byteNum: 4,
            data: isSkip ? null : buf.readInt32BE(index)
        }
    }

    writePoint(buf: Buffer, index, point, isSkip?) {
        buf.writeInt32BE(point, index);
        return {
            byteNum: 4
        }
    }
    
    parseData<T>(buf: Buffer, index: number, isSkip?: boolean): ParseResult {
        let byteNum = 0;
        /* let fields: Field[] = this.tupleDesc.fields.map((field: Field) => {
            let value = Type.getFiledInBuffer(buf, index + byteNum, field.type); 
            let f = new Field(field.name, field.type, value, field.default);
            byteNum += Type.getLen(field.type);
            return f;
        })
        let tuple = new Tuple(fields, null); */
        
        return this.reader.parseData(buf, index);

        // let data = this.reader.bufferParse();

        /* let fields: Field[] = this.tupleDesc.tdItems.map(item => {
            let value = Type.getFiledInBuffer(buf, index + byteNum, item.type);
            byteNum += Type.getLen(item.type);
            if (item.type == Type.STRING) {
                return new StringField(item.name, <string>value);
            } else {
                return new NumberField(item.name, <number>value);
            }
        })
        let tuple = new Tuple(this.tupleDesc, fields); */

        // return {
        //     byteNum: byteNum,
        //     data: isSkip ? null : data
        // }
    }

    writeData(buf: Buffer, index: number, data) {

        return this.reader.writeData(buf, index, data);

        // let b = this.reader.toBuffer(data);
        // let byteNum = b.length;
        // buf.fill(b, index, index + byteNum);

        // buf.write()
        /* data.fields.forEach((field: Field) => {
            Type.putFiledInBuffer(buf, index + byteNum, field);
            byteNum += Type.getLen(field.type);
        }) */

        // return {
        //     byteNum,
        // }
    }

}

export {
    PageNodeHeader,
    PageNodeParser
}
