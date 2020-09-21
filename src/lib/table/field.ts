import Type from "./data-type";

interface Field {

    type: Type;

    name: string;

    value: any;

    // TODO 考虑字段值为null的情况，序列化该如何处理
    /** 序列化，将value写入Buffer；TODO 考虑字段值为null的情况 */
    serialize(buf: Buffer, offset: number);

    /** 比较 */
    compare(op, value: Field): boolean;

    /** Hash code. */
    // hashCode();

    /** 判断相等 */
    toEqual(field: Field): boolean;

    toString(): string;

}

/** NumberField */
class NumberField implements Field {
    constructor(name: string, value: number) {
        this.name = name;
        this.value = value;
    }

    type: Type = Type.NUMBER;

    name: string;

    value: number;

    serialize(buf: Buffer, offset?: number) {
        offset = offset || 0;
        if (this.value === null) {
            buf.writeInt32BE(0, offset);
        } else {
            buf.writeInt32BE(this.value, offset);
        }
    }

    // TODO
    compare(op: any, value: Field): boolean {
        throw new Error("Method not implemented.");
    }

    toEqual(field: Field): boolean {
        return this.type === field.type && this.value === field.value;
    }

    toString(): string {
        return this.value.toString();
    }

}

/** StringField */
class StringField implements Field {
    constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }

    type: Type = Type.STRING;

    name: string;

    value: string;

    serialize(buf: Buffer, offset?) {
        offset = offset || 0;
        if (this.value === null) {
            buf.writeInt32BE(0, offset);
        } else {
            // TODO 判断 len 是否超出范围
            let len = Buffer.byteLength(this.value);
            buf.writeInt32BE(len, offset);
            buf.write(this.value, offset + 4, len);
        }
    }

    // TODO
    compare(op: any, value: Field): boolean {
        throw new Error("Method not implemented.");
    }

    toEqual(field: Field): boolean {
        return this.type === field.type && this.value === field.value;
    }

    toString(): string {
        return this.value;
    }

}


export {
    Field,
    NumberField,
    StringField,
}
