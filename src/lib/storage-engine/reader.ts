import { TupleDesc, Type, Tuple, Field, StringField, NumberField } from "../table";

export interface IDataReader {
    getSize(): number;
    // bufferParse(...args): { byteNum: number, data: any }
    // toBuffer(data): Buffer

    parseData(...args)
    writeData(...args)
}

export class TupleReader implements IDataReader {
    
    constructor(desc: TupleDesc) {
        this.desc = desc;
    }

    desc: TupleDesc;

    parseData(buf: Buffer, index: number) {
        let byteNum = 0;
        let fields: Field[] = this.desc.tdItems.map(item => {
            let value = Type.getFiledInBuffer(buf, index + byteNum, item.type);
            byteNum += Type.getLen(item.type);
            if (item.type == Type.STRING) {
                return new StringField(item.name, <string>value);
            } else {
                return new NumberField(item.name, <number>value);
            }
        })
        let tuple = new Tuple(this.desc, fields);
        return {
            byteNum: byteNum,
            data: tuple
        }
    }
    writeData(buf: Buffer, index: number, data: Tuple) {
        let byteNum = 0;
        data.fields.forEach((field: Field) => {
            Type.putFiledInBuffer(buf, index + byteNum, field);
            byteNum += Type.getLen(field.type);
        })
        return {
            byteNum,
        }
    }
    getSize(): number {
        return this.desc.getSize();
        // throw new Error("Method not implemented.");
    }

    // bufferParse(...args: any[]): { byteNum: number; data: any; } {
    //     // throw new Error("Method not implemented.");
    //     let byteNum = 0;
    //     let fields: Field[] = this.tupleDesc.tdItems.map(item => {
    //         let value = Type.getFiledInBuffer(buf, index + byteNum, item.type);
    //         byteNum += Type.getLen(item.type);
    //         if (item.type == Type.STRING) {
    //             return new StringField(item.name, <string>value);
    //         } else {
    //             return new NumberField(item.name, <number>value);
    //         }
    //     })
    //     let tuple = new Tuple(this.tupleDesc, fields);
    //     return {
    //         byteNum,
    //         data: tuple
    //     }
    // }
    // toBuffer(data: Tuple): Buffer {

    //     data.fields.forEach((field: Field) => {
    //         Type.putFiledInBuffer(buf, index + byteNum, field);
    //         byteNum += Type.getLen(field.type);
    //     })

    //     /* data.tdItems.forEach((item) => {
    //         item.type
    //         let field = 
    //         Type.putFiledInBuffer(buf, index + byteNum, field);

    //         byteNum += Type.getLen(field.type);
    //     })  */
    // }

}

// TODO
export class KeyReader implements IDataReader {
    constructor() {

    }
    parseData() {
        throw new Error("Method not implemented.");
    }
    writeData() {
        throw new Error("Method not implemented.");
    }
    getSize(): number {
        throw new Error("Method not implemented.");
    }
    bufferParse(...args: any[]): { byteNum: number; data: any; } {
        throw new Error("Method not implemented.");
    }
    toBuffer(): Buffer {
        throw new Error("Method not implemented.");
    }

}
