import Type from "./data-type";
import { Field, StringField, NumberField } from "./field";
import Tuple from "./tuple";


/* class TDItem {
    constructor(type, name) {
        this.type = type;
        this.name = name;
    }
    
    type: Type;
    
    name: string;
    
    toEqual(item: TDItem) {
        return this.type === item.type && this.name === item.name;
    }
} */

interface ITDItem {
    type: Type;
    name: string;
}


export default class TupleDesc {

    constructor(items: ITDItem[]) 
    constructor(types: Type[], names: string[])
    constructor(...args){
        if (args.length == 1) {
            this.tdItems = args[0];
            this.numFields = this.tdItems.length;
        } else {
            let types = args[0], names = args[1];            
            if (types.length == 0) {
                throw new Error("类型数组至少包含一个元素");
            }
            if (types.length != names.length) {
                throw new Error("名称数组names长度必须和types一致");
            }
            let numFields = types.length;
            for (let i = 0; i < numFields; i++) {
                this.tdItems[i] = {
                    type: types[i],
                    name: names[i]
                }
                // new ITDItem(types[i], names[i]);
            }
            this.numFields = numFields;
        }
    }
    /**  */
    numFields: number = 0;
    /**  */
    tdItems: ITDItem[] = [];
    /** 元组占用空间大小 */
    getSize(): number {
        let size: number = 0;
        this.tdItems.forEach((item) => {
            size += Type.getLen(item.type)
        })
        return size;
    }

    hasField(name: string): boolean {
        let index = this.tdItems.findIndex((item) => item.name === name);
        return index >= 0;
    }

    findFieldNameIndex(name: string): number {
        return this.tdItems.findIndex((item) => item.name === name);
    }

    getFieldName(index: number) {}

    getFieldType(index: number) {}

    merge(desc: TupleDesc): TupleDesc {
        let items = this.tdItems.concat(desc.tdItems)
        return new TupleDesc(items);
    }


    /* bufferParse(buf: Buffer, index: number) {
        let byteNum = 0;
        let fields: Field[] = this.tdItems.map(item => {
            let value = Type.getFiledInBuffer(buf, index + byteNum, item.type);
            byteNum += Type.getLen(item.type);
            if (item.type == Type.STRING) {
                return new StringField(item.name, <string>value);
            } else {
                return new NumberField(item.name, <number>value);
            }
        })
        let tuple = new Tuple(this, fields);
        return {
            byteNum: byteNum,
            data: tuple
        }
    } */

    toEqual() {}

    toString() {}
}
