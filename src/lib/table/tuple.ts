import TupleDesc from "./tuple-desc";
import { Field } from "./field";
import Type from "./data-type";

export default class Tuple {
    constructor(desc: TupleDesc, fields?: Field[]) {
        this.tupleDesc = desc;
        if (fields) {
            this.fields = fields;
        }
    }

    tupleDesc: TupleDesc;
    /** 字段 */
    fields: Field[] = [];
    /** */
    recordId: any;

    /** 获取元组的长度 */
    getSize() {
        let size: number = 0;
        this.fields.forEach((field: Field) => {
            size += Type.getLen(field.type)
        })
        return size;
    }
    
    /** 判断是否有该字段 */
    hasField(fieldName: string): boolean {
        /* let flag = false; 
        this.fields.forEach((field: Field) => {
            if (fieldName === field.name) {
                flag = true;
            }
        });
        return flag; */
        return this.tupleDesc.hasField(fieldName);
    }

    /**
     * 获取字段值
     * @param {string} fieldName 字段名称
     * @returns {Field} 字段
     */
    getField(fieldName: string): Field {
        let index = this.tupleDesc.findFieldNameIndex(fieldName);
        if (index === -1) {
            return null;
        }
        return this.fields[index];
        /* let fields = this.fields.filter((field: Field) => {
            return fieldName === field.name
        });
        if (fields && fields[0]) {
            return fields[0].value;
        }
        return null; */
    }


    setField(fieldName: string, field: Field) {
        let index = this.tupleDesc.findFieldNameIndex(fieldName);
        if (index === -1) {
            throw new Error(`field ${fieldName} is not exists`);
        }
        this.fields[index] === field;
    }


    /**
     * 设置字段值
     */
    /* set(fieldName: string, value) {
        this.fields.forEach((ele: Field, index) => {
            if (ele.toEqual(fieldName)) {
                // this.fields[index] = value ele.set(value);
                ele.value = value;
            }
        })
    } */

    /**
     * 转换成简单的对象结构，key(fieldName)-value(fieldValue)
     * 对外部提供数据时，可使用此方法
     */
    toSimpleObject(): any {
        let obj: any = {};
        this.fields.map((field: Field) => {
            // TODO
            // obj[field.name] = field.value
        })
        return obj;
    }

    toString() {

    }
}
