import { ExpressionNode, calcExpression, ExpressionAtom } from "../syntax-parser";
import { RELATION_NAME, RELATION_ATTR, INODE } from "../define";
import { Tuple, Table, TupleDesc, Field } from "../table";

/**
 * 关系代数运算类型 (Relational Algebra Operation Type)
 */
enum RelAlgOpType {
    /** 关系代数运算：选择 */
    SELECT = "SELECT",
    /** 关系代数运算：投影 */
    PROJECT = "PROJECT",
    /** 关系代数运算：消除重复 */
    DISTINCT = "DISTINCT",
    /** 关系代数运算：并 */
    UNION = "UNION",
    /** 关系代数运算：差(difference) */
    DIFF = "DIFF",
    /** 关系代数运算：交(intersection) */
    INTER = "INTER",
    /** 关系代数运算：更名 */
    RENAME = "RENAME",
    /** 关系代数运算：笛卡尔积(Cartesian Product) */
    CART_PRO = "CART_PRO",
    /** 关系代数运算：连接 */
    JOIN = "JOIN",
    /** 关系代数运算：左连接 */
    LEFT_JOIN = "LEFT_JOIN",
    /** 关系代数运算：右连接 */
    RIGHT_JOIN = "RIGHT_JOIN",
    /** 关系代数运算：全连接 */
    FULL_JOIN = "FULL_JOIN",
    /** 关系代数运算的操作数：关系（表） */
    // RELATION = "RELATION"
}

type CONDITION = ExpressionNode;


interface IRelAlgNode extends INODE {
    type: RelAlgOpType;
    params: any[];
    parent?: INODE;
    children?: INODE[];
    childDataSources: Table[];
    calc(): Table
}

/** 关系代数节点 包括：投影|选择|去重|连接|笛卡尔积|...|扩展节点（即：关系节点的不同实现） */
// type RelAlgNode = RelAlgProjectNode | RelAlgSelectNode | RelAlgDistinctNode | RelAlgJoinNode | RelAlgCartProNode | RelAlgRelationNode;
type RelAlgNode<T extends INODE> = RelAlgProjectNode<T> | RelAlgSelectNode<T> | RelAlgDistinctNode<T> | RelAlgJoinNode<T> | RelAlgCartProNode<T> | T;




/** 运算符迭代器（抽象类） */
abstract class OpIterator {
    index: number
    open() { }
    next() { }
    close() { }
}


/** 投影运算节点 RelAlgProjectNode */
class RelAlgProjectNode<Node extends INODE> implements IRelAlgNode, OpIterator {
    constructor(attrs: RELATION_ATTR[], node: RelAlgNode<any>) {
        this.type = RelAlgOpType.PROJECT;
        this.params = attrs;
        this.children = [node];
        node.parent = this;
    }
    type: RelAlgOpType;
    params: RELATION_ATTR[];
    parent: RelAlgNode<Node>;
    children: [RelAlgNode<Node>];
    childDataSources: Table[];

    calc(): Table {
        if (this.childDataSources.length !== 1) {
            throw new Error(`投影运算只能有一个操作数！`);
        }
        let names = this.params.map(attr => attr[attr.length - 1]);
        let table = this.childDataSources[0];
        let desc = table.tupleDesc;
        let items = desc.tdItems.filter(item => {
            return names.includes(item.name)
        })
        desc = new TupleDesc(items);

        let tuples = this.childDataSources[0].tuples;
        tuples = tuples.map(t => {
            let fields: Field[] = t.fields.filter(field => {
                return names.includes(field.name)
            })
            return new Tuple(desc, fields);
        })

        return new Table(null, desc, tuples);
    }

    /** 投影的字段 */
    fieldNames: string[];
    // 
    index: number;
    open(): void {
        if (this.childDataSources.length !== 1) {
            throw new Error(`投影运算只能有一个操作数！`);
        }
        if (!this.params.length) {
            throw new Error(`没有投影字段！`);
        }
        this.index = 0;
        this.fieldNames = this.params.map(attr => attr[attr.length - 1]);
    }
    next(): Tuple {
        if (this.index >= this.childDataSources[0].tuples.length) {
            return null;
        }
        let t = this.childDataSources[0].tuples[this.index];
        t.tupleDesc.tdItems = t.tupleDesc.tdItems.filter(item => this.fieldNames.includes(item.name));
        t.fields = t.fields.filter(f => f)
        return t;
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}

/** 选择运算节点 RelAlgSelectNode */
class RelAlgSelectNode<Node extends INODE> implements IRelAlgNode, OpIterator {
    constructor(condition: ExpressionNode, node: RelAlgNode<any>) {
        this.type = RelAlgOpType.SELECT;
        this.params = [condition];
        this.children = [node]
        node.parent = this;
    }
    type: RelAlgOpType;
    params: [ExpressionNode];
    parent: RelAlgNode<Node>;
    children: [RelAlgNode<Node>];
    childDataSources: Table[];

    calc(): Table {
        if (this.childDataSources.length !== 1) {
            throw new Error(`选择运算只能有一个操作数！`);
        }
        let table = this.childDataSources[0];
        let cond = this.params[0];
        if (cond.hasSubQuery) {
            throw new Error(`选择条件存在子查询！`);
        }

        table.tuples = table.tuples.filter(t => {
            return calcExpression(cond, (node) => {
                if (node.type === ExpressionAtom.ATTR) {
                    let fieldName = (<RELATION_ATTR>node.value).slice(-1).pop();
                    if (t.hasField(fieldName)) {
                        return t.getField(fieldName).value;
                    }
                    // TODO 需要考虑连接后字段名称改变的问题
                    fieldName = (<RELATION_ATTR>node.value).join(".");
                    if (t.hasField(fieldName)) {
                        return t.getField(fieldName).value;
                    }
                    throw new Error(`字段不存在：${fieldName}`);
                } else {
                    throw new Error(`期望表达式类型为ATTR，但接收到：${node.type}`);
                }
            })
        })
        return table;
    }

    index: number;
    open(): void {
        this.index = 0;
    }
    next(): Tuple {
        this.childDataSources
        return
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}

/** 去重运算节点 RelAlgDistinctNode */
class RelAlgDistinctNode<Node extends INODE> implements IRelAlgNode, OpIterator {
    constructor(node: RelAlgNode<any>) {
        this.type = RelAlgOpType.DISTINCT;
        this.children = [node];
        node.parent = this;
    }
    type: RelAlgOpType;
    params: null;
    parent: RelAlgNode<Node>;
    children: [RelAlgNode<Node>];
    childDataSources: Table[];

    calc(): Table {
        if (this.childDataSources.length !== 1) {
            throw new Error(`去重运算只能有一个操作数！`);
        }
        let table = this.childDataSources[0];

        return
    }

    index: number;
    open(): void {
        this.index = 0;
    }
    next(): Tuple {
        this.childDataSources
        return
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}

/** 连接运算节点 RelAlgJoinNode */
class RelAlgJoinNode<Node extends INODE> implements IRelAlgNode, OpIterator {
    constructor(attrs: RELATION_ATTR[], nodes: RelAlgNode<any>[]) {
        this.type = RelAlgOpType.JOIN;
        this.params = attrs;
        this.children = nodes;
        nodes.forEach(node => node.parent = this);
    }
    type: RelAlgOpType;
    params: RELATION_ATTR[];
    parent: RelAlgNode<Node>;
    children: RelAlgNode<Node>[];
    childDataSources: Table[];

    calc(): Table {
        if (this.childDataSources.length < 2) {
            throw new Error(`连接运算至少要有两个操作数！`);
        }
        let t0: Table, t1: Table, t0FieldName, t1FieldName;
        if (this.params && this.params.length) {
            if (this.params.length !== 2 || this.params[0].length !== 2 || this.params[1].length !== 2) {
                throw new Error(`连接条件不合法！`);
            }
            this.childDataSources.forEach(source => {
                if (source.name === this.params[0][0]) {
                    t0 = source;
                    t0FieldName = this.params[0][1];
                } else if (source.name === this.params[1][0]) {
                    t1 = source;
                    t1FieldName = this.params[1][1];
                } else {
                    throw new Error(`连接条件的表名不合法！`);
                }
            })
        } else {
            t0 = this.childDataSources[0];
            t1 = this.childDataSources[1];
            t0FieldName = t0.primaryKey;
            t1FieldName = t0.primaryKey;
        }

        let t0Map = new Map<number | string, Tuple[]>();
        let t1Map = new Map<number | string, Tuple[]>();

        t0.tuples.forEach(tuple => {
            let fieldVal = tuple.getField(t0FieldName).value;
            let tuples = t0Map.get(fieldVal);
            if (tuples) {
                tuples.push(tuple);
            } else {
                t0Map.set(fieldVal, [tuple]);
            }
        });

        t1.tuples.forEach(tuple => {
            let fieldVal = tuple.getField(t1FieldName).value;
            let tuples = t1Map.get(fieldVal);
            if (tuples) {
                tuples.push(tuple);
            } else {
                t1Map.set(fieldVal, [tuple]);
            }
        });

        // TODO 如果没有两个表没有经过连接/积，字段名需要更新，还没做判断
        let items = t0.tupleDesc.tdItems.map(item => {
            return {
                name: t0.name + "." + item.name,
                type: item.type
            }
        }).concat(t1.tupleDesc.tdItems.map(item => {
            return {
                name: t1.name + "." + item.name,
                type: item.type
            }
        }))
        // let desc = t0.tupleDesc.merge(t1.tupleDesc);
        let desc: TupleDesc = new TupleDesc(items);
        let tuples = [];

        t0Map.forEach((t0Tuples, key) => {
            let t1Tuples = t1Map.get(key);
            if (t1Tuples) {
                t0Tuples.forEach((tuple: Tuple) => {
                    tuple.fields.forEach((f, i) => f.name = items[i].name);
                    let fieldNums = tuple.fields.length;
                    t1Tuples.forEach(t => {
                        t.fields.forEach((f, j) => f.name = items[fieldNums + j].name);
                        tuples.push(new Tuple(desc, tuple.fields.concat(t.fields)));
                    })
                })
            }
        });

        return new Table(`${t0.name} join ${t1.name}`, desc, tuples);
    }

    index: number;
    open(): void {
        this.index = 0;
    }
    next(): Tuple {
        this.childDataSources
        return
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}

/** 笛卡尔积运算节点 RelAlgCartProNode */
class RelAlgCartProNode<Node extends INODE> implements IRelAlgNode, OpIterator {
    constructor(nodes: RelAlgNode<any>[]) {
        this.type = RelAlgOpType.CART_PRO;
        this.children = nodes;
        nodes.forEach(node => node.parent = this);
    }
    type: RelAlgOpType;
    params: null;
    parent: RelAlgNode<Node>;
    children: RelAlgNode<Node>[];
    childDataSources: Table[];
    calc(): Table {
        if (this.childDataSources.length < 2) {
            throw new Error(`笛卡尔积运算至少要有两个操作数！`);
        }
        let t0 = this.childDataSources[0];
        let t1 = this.childDataSources[1];

        // TODO 如果没有两个表没有经过连接/积，字段名需要更新，还没做判断
        let items = t0.tupleDesc.tdItems.map(item => {
            return {
                name: t0.name + "." + item.name,
                type: item.type
            }
        }).concat(t1.tupleDesc.tdItems.map(item => {
            return {
                name: t1.name + "." + item.name,
                type: item.type
            }
        }))

        let desc: TupleDesc = new TupleDesc(items);
        let tuples = [];

        // TODO 如果没有两个表没有经过连接/积，字段名需要更新，还没做判断
        t0.tuples.forEach((tuple: Tuple) => {
            tuple.fields.forEach((f, i) => f.name = items[i].name);
            let fieldNums = tuple.fields.length;
            t1.tuples.forEach(t => {
                t.fields.forEach((f, j) => f.name = items[fieldNums + j].name);
                tuples.push(new Tuple(desc, tuple.fields.concat(t.fields)));
            })
        })

        return new Table(`${t0.name} * ${t1.name}`, desc, tuples);
    }

    index: number;
    open(): void {
        this.index = 0;
    }
    next(): Tuple {
        this.childDataSources
        return
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}

/** 关系运算节点 RelAlgRelationNode */
/* class RelAlgRelationNode<Node extends INODE> implements IRelAlgNode, OpIterator {
    constructor(name: RELATION_NAME) {
        this.type = RelAlgOpType.RELATION;
        this.params = [name];
    }
    type: RelAlgOpType;
    params: RELATION_NAME[];
    parent: RelAlgNode;
} */



// TODO 暂时做简单声明
class Relation {
    constructor(name, attrs) {
        this.name = name;
        this.attrs = attrs;
    }
    name: string;
    attrs: string[];
    hasAttr(attr: string): boolean {
        return this.attrs.includes(attr);
    }
}

// TODO 优化关系代数表达式
function optimizeRelAlgExpression(exp: RelAlgNode<any>): RelAlgNode<any> {
    // TODO
    return exp
}

export {
    RelAlgOpType,
    RelAlgSelectNode,
    RelAlgProjectNode,
    RelAlgDistinctNode,
    RelAlgJoinNode,
    RelAlgCartProNode,
    // RelAlgRelationNode,
    RelAlgNode,
    Relation,
    optimizeRelAlgExpression
}
