import * as path from "path";
import * as chalk from "chalk";

import BufferPool from "./buffer-pool";
import Catalog from "./catalog";
import { Table, Tuple, Field, Type } from "../table";
import { ExpressionNode, calcExpressionByTuple } from "../syntax-parser";
import { IFieldSetter } from "../syntax-parser/parser";
import { ISCHEMA, RELATION_ATTR, ATTRIBUTE_VAL } from "../define";
import { ScanRange, ScanType } from "../query-compiler/plan";
import Util from "src/util";


interface IEngineConf {
	schemaFilePath: string;
}

export default class StorageEngine {

	constructor(config: IEngineConf, schema: ISCHEMA) {
		this.config = config;
		this.catalog = new Catalog(schema);
		this.bufferPool = new BufferPool(1000);
	}
	// 
	config: IEngineConf;
	// 目录
	catalog: Catalog;
	// 缓冲池
	bufferPool: BufferPool;

	async start() {
		let basePath = path.dirname(this.config.schemaFilePath);
		await this.catalog.build(basePath, this);

		// 暂定 每30秒写入所有DirtyPage
		this.generateTimer(30);
	}

	/**	查询数据 入参：表名，字段，范围，是否排序
	 * @param name 表格名称
	 * @param fieldName 字段名称
	 * @param range 扫描范围
	 */
	async query(name: string, fieldName: string, range: ScanRange): Promise<Table>
	async query(name: string): Promise<Table>
	async query(...args): Promise<Table> {
		let name: string = args[0], fieldName: string = null, range: ScanRange;
		let tuples: Tuple[] = [];

		// 判断fieldName是否是primaryKey
		let primaryKey = this.catalog.getPrimaryKey(name);
		let desc = this.catalog.getDesc(name);
		let treeFile = this.catalog.getPrimaryFile(name);

		if (args.length === 3) {
			fieldName = args[1];
			range = args[2];
			if (range.start > range.end) {
				return new Table(name, desc, []);
			}
		}

		if (primaryKey === fieldName) {
			if (range.type == ScanType.EQUAL) {
				// 等值查询
				tuples = await treeFile.query(range.equal);
			} else {
				// 比较查询
				tuples = await treeFile.query(range.start, range.end, range.isIncludeStart, range.isIncludeEnd);
			}
			// 	await treeFile.print();
			// 	tuples = await treeFile.query();

		} else {
			// TODO 判断是否要查询索引文件
			let indexFile = this.catalog.getIndexFile(name, fieldName);
			if (indexFile) {
				// TODO 查询索引文件
				// TODO 再根据结果查询数据文件
			}

			// TODO 目前还没有索引文件
			tuples = await treeFile.query();
			if (range) {
				tuples = tuples.filter(tuple => {
					let val = tuple.getField(fieldName).value;
					return range.match(val);
				});
			}

		}
		// return tuples
		return new Table(name, desc, tuples);
	}

	/** 插入数据
	 * 	@param name 表名
	 * 	@param tuple 插入的元组
	 * 	@param tuples 多个元组
	 */
	async insert(name: string, tuple: Tuple)
	async insert(name: string, tuples: Tuple[])
	async insert(...args) {
		let name: string = args[0];
		let tuples: Tuple[] = args[1].length ? args[1] : [args[1]];
		let ref = this.catalog.getFileRef(name);
		// TODO 处理索引文件
		if (ref) {

		}

		// TODO primarykey 是否为自增长
		let primaryKey = this.catalog.getPrimaryKey(name);
		let treeFile = this.catalog.getPrimaryFile(name);

		for (let index = 0; index < tuples.length; index++) {
			let tuple = tuples[index];
			let field = tuple.getField(primaryKey);
			if (field) {
				await treeFile.insert(field.value, tuple);
			} else {
				throw new Error(`元组没有字段${primaryKey}`);
			}
		}
		return tuples.length;
	}

	/** 更新数据
	 * 	
	 * 
	 */
	async update(name: string, fieldName: string, range: ScanRange, setters: IFieldSetter[])
	async update(name: string, condition: ExpressionNode, setters: IFieldSetter[])
	async update(name: string, setters: IFieldSetter[])
	// async update(name)
	async update(...args) {
		let name: string = args[0], fieldName: string, range: ScanRange, setters: IFieldSetter[], condition: ExpressionNode;
		let result: number = 0;
		// 
		if (args.length === 4) {
			fieldName = args[1];
			range = args[2];
			setters = args[3];
		} else if (args.length === 3) {
			if (args[1]) condition = args[1];
			setters = args[2];
		} else if (args.length === 2) {
			setters = args[1];
		}
		// 
		// TODO 是否需要返回值？？？
		let updateFn = (tuple: Tuple) => {
			// 
			setters.forEach(setter => {
				let field = tuple.getField(setter.name);
				if (typeof setter.value === "string" || typeof setter.value === "number") {
					field.value = setter.value;
				} else {
					field.value = calcExpressionByTuple(<ExpressionNode>setter.value, tuple)
				}
			})
		}
		// 
		let primaryKey = this.catalog.getPrimaryKey(name);
		let treeFile = this.catalog.getPrimaryFile(name);

		let isUpdatePrimaryKey = setters.find(setter => setter.name === primaryKey);
		// 按condition
		if (condition) {

			let ref = this.catalog.getFileRef(name);
			// TODO 处理索引文件
			if (ref) {

			}

			let keys = [];
			let tuples = await treeFile.query();
			tuples = tuples.filter(tuple => {
				let isMatch = calcExpressionByTuple(condition, tuple);
				if (isMatch) {
					keys.push(tuple.getField(primaryKey).value);
				}
				return isMatch;
			})

			if (isUpdatePrimaryKey) {
				// TODO 待优化
				for (let index = 0; index < keys.length; index++) {
					let key = keys[index];
					updateFn(tuples[index]);
					let newKey = tuples[index].getField(primaryKey).value;
					result += await treeFile.update(key, newKey, updateFn);
				}

			} else {
				for (let index = 0; index < keys.length; index++) {
					let key = keys[index];
					result += await treeFile.update(key, updateFn)
				}

			}

		} else {
			// 按range
			if (isUpdatePrimaryKey) {
				if (fieldName === primaryKey) {
					// range
					let getNewKey = (t: Tuple) => {
						return t.getField(primaryKey).value;
					}
					if (range.type === ScanType.EQUAL) {
						result = await treeFile.update(range.equal, range.match, getNewKey, updateFn);

					} else {
						result = await treeFile.update(range.start, range.end, range.match, getNewKey, updateFn);

					}
				}

			} else {
				if (fieldName === primaryKey) {
					if (range.type === ScanType.EQUAL) {
						result = await treeFile.update(range.equal, updateFn);

					} else {
						result = await treeFile.update(range.start, range.end, range.match, updateFn);
					}

				}
			}

		}
		return result;
	}

	/**  */
	async delete(name: string, fieldName: string, range: ScanRange)
	async delete(name: string, condition?: ExpressionNode)
	// async delete(name)
	async delete(...args) {
		let name: string = args[0], fieldName: string, range: ScanRange, condition: ExpressionNode;
		let result: number
		if (args.length === 3) {
			fieldName = args[1];
			range = args[2];
		} else if (args[1]) {
			condition = args[1];
		}

		let primaryKey = this.catalog.getPrimaryKey(name);
		let treeFile = this.catalog.getPrimaryFile(name);

		// 删除primaryKey为特定范围的数据
		if (fieldName === primaryKey) {
			if (range.type === ScanType.EQUAL) {
				result = await treeFile.delete(range.equal);
			} else {
				// TODO 此方法还没有实现
				// await treeFile.delete(range.start, range.end, range.isIncludeStart, range.isIncludeEnd);
				result = await treeFile.delete(range.start, range.end, range.match);
			}
			return result;
			// 删除 其他字段特定范围的数据
		} else {
			let tuples: Tuple[], keys = [];
			if (range) {
				// TODO 判断是否要查询索引文件
				let indexFile = this.catalog.getIndexFile(name, fieldName);
				if (indexFile) {
					// TODO 查询索引文件
					// TODO 再根据结果查询数据文件
				}
				// 
				tuples = await treeFile.query();
				tuples.forEach(tuple => {
					let val = tuple.getField(fieldName).value;
					if (range.match(val)) {
						keys.push(tuple.getField(primaryKey).value);
					}
				})

			} else if (condition) {
				tuples = await treeFile.query();
				tuples.forEach(tuple => {
					let isMatch = calcExpressionByTuple(condition, tuple);
					if (isMatch) {
						keys.push(tuple.getField(primaryKey).value);
					}
				})

			} else {
				// TODO delete 所有数据
				return

			}

			// TODO 优化: 同时删除多条
			if (keys.length) {
				for (let index = 0; index < keys.length; index++) {
					let key = keys[index];
					await treeFile.delete(key);
				}
			}
			return keys.length;

		}
	}

	// TODO 定时Flush的策略需要优化
	generateTimer(seconds, callback?: Function) {
		// this.timers.push(new Date());
		setTimeout(async () => {
			/* this.bufferPool.flushAllDirtyPages((num) => {
				console.log(chalk.green(new Date().toLocaleTimeString()));
				console.log(`Aready flush ${num} pages`);
				if (callback) callback();
				this.generateTimer(seconds, callback);
			}); */
			let [err, num] = await Util.awaitWrap(this.bufferPool.flushAllDirtyPages());
			if (err) {
				console.error(`所有DirtyPage写入出现了错误：`);
				throw new Error(err);
			}

			console.log(chalk.green(new Date().toLocaleTimeString()));
			console.log(`Aready flush ${num} pages`);

			if (callback) callback();
			this.generateTimer(seconds, callback);

		}, seconds * 1000);
	}

}
