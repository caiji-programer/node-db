import * as path from "path";

import { StorageEngine } from "./lib/storage-engine";
import { Table, TableFieldInspector, Type, Field, TupleDesc, Tuple, NumberField, StringField } from "./lib/table";
import { ExpressionLeafNode, ExpressionAtom } from "./lib/syntax-parser";
import { OperatorType } from "./lib/syntax-parser/operator";
import { QueryCompiler, PhysicalPlan, PhysicalNode, ScanNode } from "./lib/query-compiler";
import { RelAlgProjectNode, RelAlgSelectNode } from "./lib/query-compiler/relational-algebra";
import { InsertNode, UpdateNode, DeleteNode, ISubPlanPlaceholder } from "./lib/query-compiler/plan";
import { traversal, asyncPostTraversal, replace } from "./lib/traversal";
import Util from "./util";
import { ISCHEMA, ATTRIBUTE_VAL } from "./lib/define";


enum DBStatus { INITIALLING = 0, STARTING = 1, STARTED = 2, ERROR = 3, CLOSEING = 4, CLOSED = 5 };

interface DBConfig {
	dbPath: string,
	dbName: string,
	schemaFile?: string
}

export default class NodeDB {

	constructor(config: DBConfig) {
		// this.init(config);
		this.config = config;
		// this.engine = new StorageEngine();
		// this.compiler = new QueryCompiler();
	}

	status: DBStatus;
	config: DBConfig;

	engine: StorageEngine;
	compiler: QueryCompiler;

	// TODO 日志文件；
	// logFile: any;
	timers: any;

	/** 初始化：读取schema文件做一系列处理 */
	async init() {

		this.status = DBStatus.INITIALLING;

		let filePath = path.resolve(this.config.dbPath, this.config.dbName, this.config.schemaFile || "schema.json");
		// let tables = await this.loadSchema(filePath);
		if (!(/\.json$/).test(filePath)) {
			throw new Error(`schema file: '${filePath}' is invalid file, only recived json file!`);
		}

		let engineConf = {
			schemaFilePath: filePath
		}

		let schema: ISCHEMA = require(filePath);
		let tables = schema.tables.map(table => {
			let desc = new TupleDesc(table.fields.map(f => {
				return {
					type: Type.getType(f.fieldType),
					name: f.fieldName
				}
			}));
			return new Table(table.tableName, desc);
		})
		let inspector = new TableFieldInspector(tables)

		this.compiler = new QueryCompiler(inspector);
		// 
		this.engine = new StorageEngine(engineConf, schema);
		// 
		await this.engine.start();
		// 
		this.status = DBStatus.STARTED;
	}

	// TODO
	async reset() {
		await this.init();
	}

	// 
	/* async loadSchema(path): Promise<Table[]> {

		if (!(/\.json$/).test(path)) {
			throw new Error(`schema file: '${path}' is invalid file, only recived json file!`);
		}

		let schema: ISCHEMA = require(path);

		try {
			let tables = schema.tables.map(table => {
				let tableName = table.tableName;
				// let fileName = `${this.config.dbPath}/${this.config.dbName}/${tableName}.dat`
				let types: Type[] = [], names: string[] = [];
				table.fields.map(field => {
					names.push(field.fieldName);
					types.push(Type.getType(field.fieldType));
				})
				let desc = new TupleDesc(types, names);
				return new Table(tableName, desc);
			})
			return tables;

		} catch (e) {
			throw new Error(`schemaFile 文件数据有误：${e.message}`);

		}

	} */

	// start(callback) {}


	// async cmd() {
	/**	解析命令行
	 * 	通过命令行可以修改DB的配置，查看DB的状态等等
	 */
	async command(cmd: string) {
		if (true) {
			return await this.query(cmd);
		}
	}

	// TODO
	async query(sql: string): Promise<{
		ast,
		plan: PhysicalPlan,
		result: Table|number
	}> {
		if (this.status !== DBStatus.STARTED) {
			throw new Error("Database is not STARTED!");
		}

		try {
			// TODO 
			let ast = null;
			// compiler编译SQL并生成物理计划
			let plan = this.compiler.generatePhysicalPlan(sql);
			// 执行计划
			let result = await this.execPlan(plan);

			return {
				ast,
				plan,
				result
			}

		} catch (err) {
			throw new Error(`query error: ${err.massage}!`);

		}
	}

	/** 执行物理计划 */
	async execPlan(plan: PhysicalPlan): Promise<Table | number> {

		let err, subPlanResults, result: Table | number;

		if (plan.subPlans.length) {
			/* subPlanResults = await Promise.all(plan.subPlans.map(p => {
				return this.execPlan(p);
			})) */
			[err, subPlanResults] = await Util.awaitWrap(Promise.all(plan.subPlans.map(p => {
				return this.execPlan(p);
			})));

			if (err) throw new Error(err);

		}

		[err, result] = await await Util.awaitWrap(this.execPhysicalNode(plan.primary, subPlanResults));
		if (err) throw new Error(err);
		return result
	}

	/** 执行物理计划的节点 */
	async execPhysicalNode(node: PhysicalNode, subPlanResults: Table[]): Promise<Table | number> {
		//
		if (node instanceof ScanNode) {
			// let table = await this.engine.query(node.name, node.condition);
			// TODO
			let table
			if (node.fieldName) {
				table = await this.engine.query(node.name, node.fieldName, node.range);
			} else {
				table = await this.engine.query(node.name);
			}
			return table;
		}

		//  插入操作
		if (node instanceof InsertNode) {
			let tableName = node.name;
			let attrValuesArr = <ATTRIBUTE_VAL[][]>node.data;
			let result
			if (attrValuesArr.length) {
				let desc = this.engine.catalog.getDesc(tableName);
				let tuples = attrValuesArr.map((values => {
					let fields: Field[] = desc.tdItems.map(item => {
						return item.type === Type.NUMBER ? new NumberField(item.name, null) : new StringField(item.name, null);
					})
					node.fieldNames.forEach((name, index) => {
						let i = desc.findFieldNameIndex(name);
						if (i !== -1) {
							fields[i].value = values[index];
						}
					})
					return new Tuple(desc, fields);
				}))
				result = await this.engine.insert(tableName, tuples);
			} else {
				let p = <ISubPlanPlaceholder>node.data;
				let table = subPlanResults[p.key];
				result = await this.engine.insert(tableName, table.tuples);
			}
			return result;
		}

		// 更新操作 
		if (node instanceof UpdateNode) {
			// TODO 
			let result: number;

			if (node.range) {
				// await this.engine.update(node.condition, node.fieldName, node.range);
				result = await this.engine.update(node.name, node.fieldName, node.range, node.setFields);
			} else {
				// await this.engine.update(node.name, node.condition);
				result = await this.engine.update(node.name, node.condition, node.setFields);
			}
			return result;
		}

		// 删除操作
		if (node instanceof DeleteNode) {
			// 
			let result: number;
			if (node.range) {
				result = await this.engine.delete(node.name, node.fieldName, node.range);
			} else {
				result = await this.engine.delete(node.name, node.condition);
			}
			return result;
		}

		if (node instanceof RelAlgSelectNode) {
			let cond = node.params[0];
			// 判断是否存在子查询
			if (cond.hasSubQuery) {
				traversal(cond, (n: ExpressionLeafNode<ISubPlanPlaceholder>) => {
					// 找到子查询叶子节点，并且用子查询计划的结果代替
					if (n instanceof ExpressionLeafNode && n.type === ExpressionAtom.SUB_QUERY) {
						let parent = n.parent;
						let parentOp = n.parent.op;
						let table = subPlanResults[n.value.key];
						// EXISTS操作符
						if (parentOp.type == OperatorType.EXISTS) {
							let isExist = table.tuples.length ? true : false;
							let newNode = new ExpressionLeafNode(ExpressionAtom.CONSTANT, isExist)
							replace(n, newNode, true);

							// 比较运算符
						} else if (parentOp.isCompare()) {
							if (table.tuples.length === 1) {
								let fields = table.tuples[0].fields
								if (fields.length === 1) {
									let val = fields[0].value
									let newNode = new ExpressionLeafNode(ExpressionAtom.CONSTANT, val)
									replace(n, newNode, true);
									return false;
								}
							}
							throw new Error(`比较运算符只接受单个值，该子查询有误`);

						} else {
							throw new Error(`无法处理该运算符（${parentOp.type}）的子查询`)
						}
					}
				})

				cond.hasSubQuery = false;
			}
		}

		let [err, childResults] = await Util.awaitWrap(Promise.all(node.children.map(child => {
			return this.execPhysicalNode(child, subPlanResults);
		})));

		if (err) throw new Error(err);

		node.childDataSources = <Table[]>childResults;
		return node.calc();

	}


	generateTimer(seconds, callback) {
		this.timers.push(new Date());
		setTimeout(() => {
			/* this.bufferPool.flushAllDirtyPages((num) => {
				console.log(`Aready flush ${num} pages`);
				if (this.timers.length) {
					this.timers.pop();
				}
				callback();
			}); */
		}, seconds * 1000);
	}
}


async function scan(name: string): Promise<Table> {
	return new Promise((resolve) => {
		setTimeout(() => {
			console.log(`Scan Node ${name}`);
			// let td = new TupleDesc([], []);
			let desc = new TupleDesc([Type.NUMBER, Type.STRING], ["id", "name"]);
			let tuples = [new Tuple(desc, [
				new NumberField("id", 1),
				new StringField("name", "111")
			]), new Tuple(desc, [
				new NumberField("id", 2),
				new StringField("name", "222")
			])];
			let table = new Table(name, desc, tuples);
			resolve(table);
		}, 1000)
	})
}
