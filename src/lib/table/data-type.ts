import * as fs from "fs";
import { Field, StringField, NumberField } from "./field";

/**
 * 目前只有 NUMBER STRING 两种类型；TODO:后面可以考虑再增加
 */
enum Type { NUMBER = "number", STRING = "string", INT = "int" };

namespace Type {

	const STRING_LEN = 128;

	export function getLen(type: Type) {
		if (type === Type.STRING) {
			return STRING_LEN + 4;
		} else {
			return 4;
		}
	}

	/**
	 * 验证数据类型
	 */
	export function verify(type: Type, value: any): boolean {
		if (type === Type.NUMBER) {
			return typeof value === "number";
		} else if (type === Type.STRING) {
			return typeof value === "string";
		} else if (type === Type.INT) {
			return false;
		}
	}

	/**
	 * 转换数据类型
	 */
	export function transform(type: Type, value: any): number | string {
		try {
			if (type === Type.NUMBER) {
				return Number(value);
			} else if (type === Type.STRING) {
				return String(value);
			} else if (type === Type.INT) {
				// TODO + INT类型
				return
			}
		} catch (e) {
			throw new Error(`Type transform Error: ${value} can't transform to ${type} type!`);
		}
	}

	export function getType(t: string) {
		t = t.toLowerCase();
		if (t === "number") {
			return Type.NUMBER;
		} else if (t === "string") {
			return Type.STRING;
		} else if (t === "int") {
			return Type.INT;
		} else {
			throw new Error("doesn't exit this type!");
		}
	}

	export function getField(readStream: fs.ReadStream, type: Type) {
		let field;
		if (type === Type.STRING) {
			// 该字段的长度
			let strLen = readStream.read(4).readInt32BE();
			// 裁剪后实际的内容
			let field: string = readStream.read(STRING_LEN).slice(0, strLen).toString();
			return field;
		} else {
			// TODO java jvm默认的是大端，node应该用哪种，待定？
			// 用指定的字节序格式（readInt32BE() 返回大端序， readInt32LE() 返回小端序）
			// 从 buf 中指定的 offset 读取一个有符号的 32 位整数值。
			let field: number = readStream.read(4).readInt32BE();
			return field;
		}
	}

	/**
	 * 从buffer里读取一个字段 
	 * 	@buf  buffer
	 * 	@offset 指定位置
	 *  @type 字段类型
	 */
	export function getFiledInBuffer(buf: Buffer, offset: number, type: Type) {
		// let field: Field;
		if (type === Type.STRING) {
			// 该字段的长度
			// let strLen = readStream.read(4).readInt32BE();
			let strLen = buf.readInt32BE(offset);
			// 裁剪后实际的内容
			// let field: string = readStream.read(STRING_LEN).slice(0, strLen).toString();
			let value: string = buf.slice(offset + 4, offset + 4 + strLen).toString();
			// return new StringField(value);
			return value;
		} else {
			// TODO java jvm默认的是大端，node应该用哪种，待定？
			// 用指定的字节序格式（readInt32BE() 返回大端序， readInt32LE() 返回小端序）
			// 从 buf 中指定的 offset 读取一个有符号的 32 位整数值。
			// let field: number = readStream.read(4).readInt32BE();
			let value: number = buf.readInt32BE(offset);
			// return new NumberField(value);
			return value;
		}
	}

	/**	
	 * 将字段写进 buffer 里面
	 * @buf  buffer
	 * @offset 指定位置
	 * @field	字段
	 */
	export function putFiledInBuffer(buf: Buffer, offset: number, field: Field)
	export function putFiledInBuffer(buf: Buffer, offset: number, type: Type, value: number|string)
	export function putFiledInBuffer(...args) {
		// let field;
		// let valueType = typeof value;
		let buf: Buffer = args[0], offset: number = args[1], type: Type, value: number|string; 
		if (args.length === 3) {
			type = args[2].type;
			value = args[2].value;			
		} else if (args.length === 4) {
			type = args[2];
			value = args[3];
		} else {
			let n: never
		}

		if (type === Type.STRING) {

			if (value === null) {
				buf.writeInt32BE(0, offset);
			} else {
				// TODO 判断 len 是否超出范围
				let len = Buffer.byteLength(<string>value);
				buf.writeInt32BE(len, offset);
				buf.write(<string>value, offset + 4, len);
			}

		} else if (type === Type.NUMBER) {

			if (value === null) {
				return
			} else {
				buf.writeInt32BE(<number>value, offset);
			}

		}
	}
}

export default Type;