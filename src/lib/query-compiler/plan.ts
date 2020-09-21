import { RelAlgNode, RelAlgOpType, RelAlgProjectNode, RelAlgJoinNode, RelAlgCartProNode, RelAlgSelectNode, RelAlgDistinctNode } from "./relational-algebra";
import { SQLAST, SQLParser, SQL_STATEMENT_TYPE, ISelectStatement, TableSourceItem, ISubQueryStatement, RelationAttrReference, IInsertStatement, IUpdateStatement, IDeleteStatement, IFieldSetter } from "../syntax-parser/parser";
import { RELATION_NAME, RELATION_ATTR, INODE, ATTRIBUTE_VAL } from "../define";
import { Operator, OperatorType, ExpressionAtom, ExpressionNode, ExpressionLeafNode, ExpressionInternalNode, ExpressionUtil } from "../syntax-parser";
import { find, findAll, traversal, replace } from "../traversal";
import { simplifyExpressionNode } from "./simplify-structure";


/**  */
export interface IPlan<P> {
    /** 子计划（可以有多个） */
    subPlans: IPlan<P>[];
    /** 主计划（只能有一个） */
    primary: P
}

/** 子查询占位符，表示该值是子查询的结果 */
export interface ISubPlanPlaceholder {
    key: number,
    value: any
}

/** 关系节点（作为逻辑节点的叶子节点） */
export class RelationNode implements INODE {
    constructor(name: RELATION_NAME) {
        this.params = [name];
    }
    params: RELATION_NAME[];
    parent?: LogicalNode;
}

/**  */
export enum ScanType {
    // 等值扫描
    EQUAL = 0,
    // 比较扫描
    COMPARE = 1
}
/** 扫描范围 */
/* export interface IScanRange {
    type: ScanType
    equal?
    start?
    isIncludeStart?: boolean
    end?
    isIncludeEnd?: boolean;
} */

export class ScanRange {
    constructor(type: ScanType) {
        this.type = type
    }
    type: ScanType;
    equal?
    start?
    isIncludeStart?: boolean
    end?
    isIncludeEnd?: boolean;
    match: (val) => boolean;
}

/** 扫描节点（作为物理节点的叶子节点） */
export class ScanNode implements INODE {
    // constructor(name: string, condition?: ExpressionNode) {
    constructor(name: string, fieldName?: string, range?: ScanRange) {
        this.name = name;
        this.fieldName = fieldName;
        this.range = range;
        // this.condition = condition
    }
    name: string;
    fieldName?: string
    range?: ScanRange;
    // condition: ExpressionNode;
    parent?: PhysicalNode;
    toString() {
        let result = "";
        if (this.fieldName && this.range) {
            if (this.range.type === ScanType.EQUAL) {
                result += `: ${this.fieldName}=${this.range.equal}`;
            } else {
                result += `: ${this.fieldName}∈`;
                result += this.range.isIncludeStart ? "[" : "(";
                result += `${this.range.start},${this.range.end}`;
                result += this.range.isIncludeEnd ? "]" : ")";
            }
        }
        return result;
    }
}

/** 插入 */
export class InsertNode implements INODE {
    constructor(name: string, fieldNames: string[], data: ATTRIBUTE_VAL[][] | ISubPlanPlaceholder) {
        this.name = name;
        this.fieldNames = fieldNames;
        this.data = data;
    }
    name: string;
    fieldNames: string[];
    data: ATTRIBUTE_VAL[][] | ISubPlanPlaceholder;
    parent: null;
    toString() {
        let result = "";
        if (this.data instanceof Array) {
            result += this.data.map(d => `(${d.join(',')})`).join(";");
        } else {
            result += `SubQuery(${this.data.key})`;
        }
        return result;
    }
}

/** 更新 */
export class UpdateNode implements INODE {
    constructor(name: string, setFields, condition?: ExpressionNode)
    constructor(name: string, setFields, fieldName: string, range: ScanRange)
    constructor(...args) {
        this.name = args[0];
        this.setFields = args[1];
        if (args.length === 4) {
            this.fieldName = args[2];
            this.range = args[3];
        } else if (args[2]) {
            this.condition = args[2];
        }
    }
    name: string;
    setFields: IFieldSetter[];
    fieldName?: string;
    range?: ScanRange;
    condition?: ExpressionNode;
    parent: null;
    toString() {
        let result = "";
        result += this.setFields.map(f => `${f.name}=${f.value}`).join(",");
        if (this.condition) {
            result += simplifyExpressionNode(this.condition);
        } else {
            if (this.range.type === ScanType.EQUAL) {
                result += `: ${this.fieldName}=${this.range.equal}`;
            } else {
                result += `: ${this.fieldName}∈`;
                result += this.range.isIncludeStart ? "[" : "(";
                result += `${this.range.start},${this.range.end}`;
                result += this.range.isIncludeEnd ? "]" : ")";
            }
        }
        return result;
    }
}

/** 删除 */
export class DeleteNode implements INODE {
    constructor(name: string, condition?: ExpressionNode)
    constructor(name: string, fieldName: string, range: ScanRange)
    constructor(...args) {
        this.name = args[0];
        if (args.length === 3) {
            this.fieldName = args[1];
            this.range = args[2];
        } else {
            this.condition = args[1];
        }
    }
    name: string;
    fieldName?: string;
    range?: ScanRange;
    condition?: ExpressionNode;
    parent: null;
    toString() {
        let result = "";
        if (this.condition) {
            result += simplifyExpressionNode(this.condition);
        } else {
            if (this.range.type === ScanType.EQUAL) {
                result += `: ${this.fieldName}=${this.range.equal}`;
            } else {
                result += `: ${this.fieldName}∈`;
                result += this.range.isIncludeStart ? "[" : "(";
                result += `${this.range.start},${this.range.end}`;
                result += this.range.isIncludeEnd ? "]" : ")";
            }
        }
        return result;
    }
}

/** 作为物理计划节点的基础（需要与存储引擎交互） */
// export type BasicNode = ScanNode | InsertNode | UpdateNode | DeleteNode;

/** 逻辑计划的节点 */
export type LogicalNode = RelAlgNode<RelationNode | InsertNode | UpdateNode | DeleteNode>;

/** 物理计划的节点 */
export type PhysicalNode = RelAlgNode<ScanNode | InsertNode | UpdateNode | DeleteNode>;
/** 物理计划 */
export type PhysicalPlan = IPlan<PhysicalNode>;


/** 逻辑计划 */
export class LogicalPlan implements IPlan<LogicalNode> {

    // constructor(parser: SQLParser) {
    constructor(ast: SQLAST, ref: RelationAttrReference) {
        this.ast = ast;
        this.ref = ref;
        this.primary = this.AST2LogicalPlan(ast);
    }

    subPlans: LogicalPlan[] = [];

    primary: LogicalNode;

    ast: SQLAST;

    ref: RelationAttrReference;

    /** AST to LogicalPlan */
    AST2LogicalPlan(ast: SQLAST): LogicalNode {
        if (ast.type === SQL_STATEMENT_TYPE.QUERY) {
            return this.selectStatement2RelAlgNode(<ISelectStatement>ast);

        } else if (ast.type === SQL_STATEMENT_TYPE.INSERT) {
            return this.insertStatement2RelAlgNode(<IInsertStatement>ast);

        } else if (ast.type === SQL_STATEMENT_TYPE.UPDATE) {
            return this.updateStatement2RelAlgNode(<IUpdateStatement>ast);

        } else if (ast.type === SQL_STATEMENT_TYPE.DELETE) {
            return this.deleteStatement2RelAlgNode(<IDeleteStatement>ast);

        } else {
            // TODO 处理其他类型的SQL
        }
        return null;
    }

    // 
    selectStatement2RelAlgNode(ast: ISelectStatement) {

        let elements = ast.selectElements, where = ast.where, tableSources = ast.tableSources;
        /** 一个关系或子查询转换成RelAlgNode */
        let tableSourceItem2Node = (item: TableSourceItem) => {
            if ((<ISubQueryStatement>item).statement) {
                return this.selectStatement2RelAlgNode((<ISubQueryStatement>item).statement)
            } else {
                return new RelationNode(<RELATION_NAME>item);
            }
        }

        let nodes = tableSources.map(source => {
            let node: LogicalNode = tableSourceItem2Node(source.table);
            if (source.joins && source.joins.length) {
                source.joins.forEach(join => {
                    node = new RelAlgJoinNode(
                        join.attrs,
                        [
                            node,
                            tableSourceItem2Node(join.table)
                        ]
                    )
                })
            }
            return node;
        })
        let node: LogicalNode = nodes.length > 1 ? new RelAlgCartProNode(nodes) : nodes[0];
        // 
        if (where) {
            // 判断是否有子查询
            if (where.hasSubQuery) {
                node = this.twoParameterSelection2RelAlgNode(node, where);
            } else {
                node = new RelAlgSelectNode(where, node);
            }
        }
        // 
        if (elements && elements.length) {
            node = new RelAlgProjectNode(elements, node)
        }
        return node
    }

    // 
    insertStatement2RelAlgNode(ast: IInsertStatement) {
        if ((<ATTRIBUTE_VAL[][]>ast.values).length) {
            return new InsertNode(ast.tabelName, ast.fieldNames, <ATTRIBUTE_VAL[][]>ast.values);

        } else if ((<ISelectStatement>ast.values).type === SQL_STATEMENT_TYPE.QUERY) {
            let subPlan = new LogicalPlan(<ISelectStatement>ast.values, this.ref);
            this.subPlans.push(subPlan);
            let data: ISubPlanPlaceholder = {
                key: this.subPlans.length - 1,
                value: null
            }
            return new InsertNode(ast.tabelName, ast.fieldNames, data);

        } else {
            let check: never;
        }
    }

    // 
    updateStatement2RelAlgNode(ast: IUpdateStatement) {
        if (!ast.where) return new UpdateNode(ast.tabelName, ast.setFields);
        // TODO 如果选择条件存在子查询
        let subQueryExps = findAll(ast.where, node => ExpressionUtil.isSubQuery(node));
        if (subQueryExps) {
            // TODO
        }

        let result = condition2Range(ast.where), node;
        if (result) {
            node = new UpdateNode(ast.tabelName, ast.setFields, result.fieldName, result.range);
        } else {
            node = new UpdateNode(ast.tabelName, ast.setFields, ast.where);
        }
        return node;
    }

    // 
    deleteStatement2RelAlgNode(ast: IDeleteStatement) {
        if (!ast.where) return new DeleteNode(ast.tabelName);
        // TODO 如果选择条件存在子查询
        let subQueryExps = findAll(ast.where, node => ExpressionUtil.isSubQuery(node));
        if (subQueryExps) {
            // TODO
        }

        let result = condition2Range(ast.where), node;
        if (result) {
            node = new DeleteNode(ast.tabelName, result.fieldName, result.range);
        } else {
            node = new DeleteNode(ast.tabelName, ast.where);
        }
        return node;
    }

    // 子查询大概有以下几种(根据位置来分)：

    /* 
    1. from型子查询：把内层的查询结果当成临时表，供外层sql再次查询。
        select * from (select cat_id,good_id,good_name from goods order by cat_id asc, good_id desc) as tep group by cat_id;
        查询每个部门的平均工资的工资等级
        SELECT  ag_dep.*,g.`grade_level` FROM ( SELECT AVG(salary) ag,department_id FROM employees  GROUP BY department_id ) ag_dep INNER JOIN job_grades g ON ag_dep.ag BETWEEN lowest_sal AND highest_sal;

    2. where型子查询：即把内层的sql语句查询的结果作为外层sql查询的条件。要求子查询的结果是“单个值”或“一列多行”。    
        ①子查询语句要包含在括号中“()”
        ②一般将子查询放在比较条件的右侧【位置】
        ③单行操作符对应单行子查询，多行操作符对应多行子查询【操作符-区别】

        单行操作符：右边子查询必须返回的是单个值，单行比较运算符（=(等于)、>(大于)、>=(大于等于)、<(小于)、<=(小于等于),<>(不等于)）
        多行操作符：右边子查询可以返回多行，但是必须是单列？（TODO待确认），常见有all、any、in,其中all和any必须与单行比较运算符结合使用

        in子查询：内层查询语句仅返回一个数据列，这个数据列的值将供外层查询语句进行比较。
        in	表示任何一个。栗子：num IN(1,2,3)–>判断num是否在1||2||3值中
        LECT department_name FROM departments d WHERE d.`department_id` IN( SELECT department_id FROM employees)
        
        exists子查询：把外层的查询结果，拿到内层，看内层是否成立，简单来说后面的返回true,外层（也就是前面的语句）才会执行，否则不执行。
        exists	表示判断子查询是否有返回值（true/false）
        LECT department_name FROM departments d WHERE EXISTS(SELECT * FROM employees e WHERE d.`department_id`=e.`department_id`);
        
        any子查询：只要满足内层子查询中的任意一个比较条件，就返回一个结果作为外层查询条件。
        any/some	b表示和子查询返回的任意一个值比较。栗子：num>ANY(1,2,3)–>num>1||num>2||num>3
        
        all子查询：内层子查询返回的结果需同时满足所有内层查询条件。
        all	表示和子查询返回的所有值比较。栗子：num>ALL(1,2,3)–>num>1&&num>2&&num>3

        比较运算符子查询：子查询中可以使用的比较运算符如 “>” “<” “= ” “!=”
    */


    /** 对于where语句包含子查询时，引入关系代数运算符的中间形式，即：两参数选择。
     *  大致的处理方法为：
     *  1. 子查询有必要包含一个 distinct 运算（保证元组数量一致）；
     *  2. 用单参数选择 select 替换两参数选择，条件是：...；
     *  3. 单参数选择的操作数是两个关系的笛卡尔积（如果是两个主键，可以转换成连接）。
     */
    twoParameterSelection2RelAlgNode(rel: LogicalNode, exp: ExpressionNode): LogicalNode {
        // 找出关系的属性
        let findRelationAttr = (node: ExpressionNode): RELATION_ATTR[] => {
            let attrs: RELATION_ATTR[] = [];
            traversal(node, (n) => {
                if (n instanceof ExpressionLeafNode) {
                    if (n.type === ExpressionAtom.ATTR) {
                        let attr = (<RELATION_ATTR>n.value);
                        attrs.push(attr)
                    }
                }
            })
            return attrs;
        }

        // 找出所有子查询（ TODO 暂时不考虑表达式里面子查询的子查询）
        let subQueryExps = findAll(exp, (node) => {
            if (node instanceof ExpressionLeafNode) {
                return node.type === ExpressionAtom.SUB_QUERY
            }
            return false
        })
        // 如果没有子查询
        if (!subQueryExps) {
            return new RelAlgSelectNode(exp, rel);
        }
        // 仅有一个子查询
        if (subQueryExps.length === 1) {
            let node = <ExpressionLeafNode>subQueryExps[0];
            let subQueryStatement = <ISelectStatement>node.value;
            let op = node.parent.op;
            // let siblings = node.parent.children.filter(n => n !== node);

            // 比较操作符（所有单行操作符都是比较操作符）
            // let compareOperatorTyps = [OperatorType.EQ, OperatorType.GT, OperatorType.GE, OperatorType.LT, OperatorType.LE, OperatorType.NE];

            if (subQueryStatement.isCorrelative) {

                let where = <ExpressionInternalNode>subQueryStatement.where,
                    // 
                    selectElements = subQueryStatement.selectElements.slice(0),
                    /** 相关条件表达式 */
                    correlativeExps: ExpressionNode[] = [],
                    /** 非相关条件表达式 */
                    notCorrelativeExps: ExpressionNode[] = [],
                    // 
                    tempNode: LogicalNode = null;
                // 对选择条件（是多个条件的AND）进行划分为相关和非相关两种
                ExpressionUtil.split(where).forEach(n => {
                    let isCorrelative = false;
                    findRelationAttr(n).forEach((attr: RELATION_ATTR) => {
                        let names = this.ref.attr.get(attr);
                        if (!subQueryStatement.sourceNames.includes(names[0])) {
                            isCorrelative = true;
                        }
                    });
                    if (isCorrelative) {
                        correlativeExps.push(n);
                    } else {
                        notCorrelativeExps.push(n);
                    }
                })

                let correlativeCondition = ExpressionUtil.merge(...correlativeExps),
                    notCorrelativeCondition = ExpressionUtil.merge(...notCorrelativeExps);
                // 否定的组合运算符取反
                if (op.additionalOp === OperatorType.NOT) {
                    correlativeCondition = new ExpressionInternalNode(new Operator(OperatorType.NOT, "NOT"), [correlativeCondition]);
                    notCorrelativeCondition = new ExpressionInternalNode(new Operator(OperatorType.NOT, "NOT"), [notCorrelativeCondition]);
                }

                // 非相关条件代替原来的条件
                subQueryStatement.where = notCorrelativeCondition;
                // 加上条件里的相关查询涉及的字段，如果selectElements是所有字段则可以不处理
                if (subQueryStatement.selectElements && subQueryStatement.selectElements.length) {
                    correlativeExps.forEach(exp => {
                        findRelationAttr(exp).forEach((attr: RELATION_ATTR) => {
                            let names = this.ref.attr.get(attr);
                            if (subQueryStatement.sourceNames.includes(names[0])) {
                                // TODO 做去重处理
                                let isExists = subQueryStatement.selectElements.find(ele => {
                                    return ele[0] === attr[0] && ele[1] === attr[1]
                                });
                                if (!isExists) {
                                    subQueryStatement.selectElements.push(attr);
                                }
                            }
                        })
                    })
                }
                // 
                tempNode = this.selectStatement2RelAlgNode(subQueryStatement);

                // 相关条件上推
                tempNode = new RelAlgSelectNode(
                    correlativeCondition,
                    new RelAlgCartProNode([
                        rel,
                        tempNode
                    ])
                )

                // 单行操作符（比较操作符）
                if (op.isCompare()) {
                    let attr = selectElements[0];
                    // 确定属性归属（TODO: 是否需要？）
                    if (attr.length === 1) {
                        attr.unshift(subQueryStatement.sourceNames[0]);
                    }
                    let newNode = new ExpressionLeafNode(ExpressionAtom.ATTR, selectElements[0]);
                    replace(node, newNode);
                    return new RelAlgSelectNode(exp, tempNode);
                }

                // EXISTS
                if (op.type === OperatorType.EXISTS) {
                    if (!node.parent) {
                        return tempNode;
                    }
                    let newNode = new ExpressionLeafNode(ExpressionAtom.CONSTANT, true);
                    replace(node, newNode);
                    return new RelAlgSelectNode(exp, tempNode);
                }

                // IN
                // TODO 目前还没支持元组作为操作数，只支持单个属性
                if (op.type === OperatorType.IN) {
                    let attr: RELATION_ATTR = subQueryStatement.selectElements[0];
                    let newNode = new ExpressionLeafNode(ExpressionAtom.ATTR, attr);
                    node.parent.op = new Operator(OperatorType.EQ, "=");
                    replace(node, newNode);
                    return new RelAlgSelectNode(exp, tempNode);
                }

                // ALL/ANY/SOME
                if (op.type === OperatorType.ALL || op.type === OperatorType.ANY || op.type === OperatorType.SOME) {
                    throw new Error(`all/any/some 运算目前没有实现！`);
                }

            } else {
                /* 非相关子查询 */

                /*  单行操作符： =(等于)、>(大于)、>=(大于等于)、<(小于)、<=(小于等于),<>(不等于)）
                                因为单行操作符的自查询部分返回一个值，可以优先执行返回结果，用于选择操作符的一个条件
                    exists运算符：当子查询进行操作，有返回结果的时候，该语句才会执行
                 */
                if (op.isCompare() || op.type === OperatorType.EXISTS) {
                    // let preCalculationNode = this.selectStatement2RelAlgNode(subQueryStatement);
                    // this.subPlans.push(preCalculationNode);
                    let subPlan = new LogicalPlan(subQueryStatement, this.ref);
                    this.subPlans.push(subPlan);

                    // 用占位符替代
                    let newNode = new ExpressionLeafNode<ISubPlanPlaceholder>(ExpressionAtom.SUB_QUERY, {
                        key: this.subPlans.length - 1,
                        value: null
                    })
                    replace(node, newNode);
                    return new RelAlgSelectNode(exp, rel)
                }

                // IN
                if (op.type === OperatorType.IN) {
                    // TODO 如果子查询的投影字段只有一个并且为主键可以转化为join
                    let attr: RELATION_ATTR = subQueryStatement.selectElements[0];
                    let newNode = new ExpressionLeafNode(ExpressionAtom.ATTR, attr);
                    node.parent.op = new Operator(OperatorType.EQ, "=");
                    replace(node, newNode);
                    return new RelAlgSelectNode(
                        exp,
                        new RelAlgCartProNode([
                            rel,
                            new RelAlgDistinctNode(this.selectStatement2RelAlgNode(subQueryStatement))
                        ])
                    )
                }

                //  TODO ALL,ANY操作符大致有以下两种处理方法
                if (op.type === OperatorType.ALL || op.type === OperatorType.ANY || op.type === OperatorType.SOME) {
                    throw new Error(`all/any/some 运算目前没有实现！`);
                }

            }


        } else {
            // 存在多个子查询

            // TODO 完善多子查询的条件语句
            // TODO 条件上推条件合并
            throw new Error(`目前不支持条件语句存在多个子查询的查询语句`);

        }

        return null;
    }

    /** 转换成物理查询计划 */
    toPhysicalPlan(): PhysicalPlan {
        let primary: PhysicalNode = relationNode2ScanNode(this.primary);
        let subPlans: PhysicalPlan[] = this.subPlans.map(plan => plan.toPhysicalPlan());
        return {
            subPlans,
            primary
        }
    }

}


/** 比较表达式转换成Range（需要考虑：属性、常量和运算符都会影响结果） */
function compareExpression2Range(op: Operator, nodes: ExpressionNode[]): {
    fieldName
    start,
    isIncludeStart: boolean,
    end,
    isIncludeEnd: boolean
} {
    if (op.isCompare() && nodes.length == 2) {
        let attrNode, constNode;
        let fieldName, start, isIncludeStart: boolean, end, isIncludeEnd: boolean;

        if (ExpressionUtil.isAttr(nodes[0]) && ExpressionUtil.isConstant(nodes[1])) {
            [attrNode, constNode] = nodes;
            fieldName = (<ExpressionLeafNode<RELATION_ATTR>>attrNode).value.slice(-1).pop();
            if (op.type === OperatorType.GE) {
                start = constNode.value;
                isIncludeStart = true;
            } else if (op.type === OperatorType.GT) {
                start = constNode.value;
                isIncludeStart = false;
            } else if (op.type === OperatorType.LE) {
                end = constNode.value;
                isIncludeEnd = true;
            } else if (op.type === OperatorType.LT) {
                end = constNode.value;
                isIncludeEnd = false;
            } else {
                return null;
            }
        }

        if (ExpressionUtil.isConstant(nodes[0]) && ExpressionUtil.isAttr(nodes[1])) {
            [constNode, attrNode] = nodes;
            fieldName = (<ExpressionLeafNode<RELATION_ATTR>>attrNode).value.slice(-1).pop();
            if (op.type === OperatorType.GE) {
                end = constNode.value;
                isIncludeEnd = true;
            } else if (op.type === OperatorType.GT) {
                end = constNode.value;
                isIncludeEnd = false;
            } else if (op.type === OperatorType.LE) {
                start = constNode.value;
                isIncludeStart = true;
            } else if (op.type === OperatorType.LT) {
                start = constNode.value;
                isIncludeStart = false;
            } else {
                return null;
            }
        }

        if (attrNode && constNode) {
            return {
                fieldName,
                start,
                isIncludeStart,
                end,
                isIncludeEnd
            }
        }
    }
    return
}

/** 简单条件转换成范围 */
function condition2Range(condition: ExpressionNode): { fieldName: string, range: ScanRange } {
    let fieldName: string, range: ScanRange;
    if (condition instanceof ExpressionInternalNode) {
        let type = condition.op.type, children = condition.children;
        // 符合 field between const ang const 模式
        if (type === OperatorType.BETWEEN && children.length == 3) {
            let isAttr = ExpressionUtil.isAttr(children[0]);
            let isConstant = ExpressionUtil.isConstant(children[1]) && ExpressionUtil.isConstant(children[2])
            // let isConstant = children.slice(1).every((child) => ExpressionUtil.isConstant(child));
            if (isAttr && isConstant) {
                fieldName = (<ExpressionLeafNode>children[0]).value.slice(-1).pop();
                range = new ScanRange(ScanType.COMPARE);
                range.start = (<ExpressionLeafNode>children[1]).value;
                range.isIncludeStart = true;
                range.end = (<ExpressionLeafNode>children[2]).value;
                range.isIncludeEnd = true;
            }
        }

        // 符合 field = const 模式
        if (type === OperatorType.EQ && children.length == 2) {
            let attrNode = children.find(child => ExpressionUtil.isAttr(child));
            let constNode = children.find(child => ExpressionUtil.isConstant(child));
            if (attrNode && constNode) {
                fieldName = (<ExpressionLeafNode>attrNode).value.slice(-1).pop();
                range = new ScanRange(ScanType.EQUAL);
                range.equal = (<ExpressionLeafNode>constNode).value;
            }
        }

        // 符合 field compare const 模式
        let r = compareExpression2Range(condition.op, children)
        if (r) {
            fieldName = r.fieldName;
            range = new ScanRange(ScanType.COMPARE);
            range.start = r.start;
            range.isIncludeStart = r.isIncludeStart;
            range.end = r.end;
            range.isIncludeEnd = r.isIncludeEnd
        }
        /* if (condition.op.isCompare() && children.length == 2) {
            let attrNode = <ExpressionLeafNode>children.find(child => ExpressionUtil.isAttr(child));
            let constNode = <ExpressionLeafNode>children.find(child => ExpressionUtil.isConstant(child));
            if (attrNode && constNode) {
                let start, isIncludeStart: boolean, end, isIncludeEnd: boolean;
                if (type === OperatorType.GE) {
                    start = constNode.value;
                    isIncludeStart = true;
                } else if (type === OperatorType.GT) {
                    start = constNode.value;
                    isIncludeStart = false;
                } else if (type === OperatorType.LE) {
                    end = constNode.value;
                    isIncludeEnd = true;
                } else if (type === OperatorType.LT) {
                    end = constNode.value;
                    isIncludeEnd = false;
                }
                range = {
                    type: ScanType.COMPARE,
                    start,
                    isIncludeStart,
                    end,
                    isIncludeEnd
                }
            }
        } */

        // 符合 field > constant &&  field < constant 模式
        // TODO field > constant && field > constant 的情况应该合并起来
        if (type === OperatorType.AND && children.length == 2) {
            let start, isIncludeStart: boolean, end, isIncludeEnd: boolean;
            // let results = children.map(child => {
            let names = children.map(child => {
                if (child instanceof ExpressionInternalNode) {
                    // return compareExpression2Range(child.op, child.children)
                    let result = compareExpression2Range(child.op, child.children)
                    if (result) {
                        fieldName = result.fieldName;
                        start = result.start;
                        isIncludeStart = result.isIncludeStart;
                        end = result.end;
                        isIncludeEnd = result.isIncludeEnd;
                        return result.fieldName;
                    }
                }
            })

            if (names[0] === names[1]) {
                if (start !== undefined && end !== undefined) {
                    range = new ScanRange(ScanType.COMPARE);
                    range.start = start;
                    range.isIncludeStart = isIncludeStart;
                    range.end = end;
                    range.isIncludeEnd = isIncludeEnd;
                }
            }
        }
    }

    if (range) {
        range.match = range2MatchFn(range);
        return {
            fieldName,
            range
        }
    }
    return null;

}

/** ScanRange 转换成 匹配函数 */
export function range2MatchFn(range: ScanRange) {
    return (val) => {
        if (range.type === ScanType.EQUAL) {
            return val === range.equal;
        }
        let isMatchStart = true, isMatchEnd = true;
        if (range.start !== undefined) {
            if (range.isIncludeStart) {
                isMatchStart = range.start <= val;
            } else {
                isMatchStart = range.start < val;
            }
        }
        if (range.end !== undefined) {
            if (range.isIncludeEnd) {
                isMatchEnd = val <= range.end;
            } else {
                isMatchEnd = val < range.end;
            }
        }
        return isMatchStart && isMatchEnd;
    }
}

/** LogicalNode转换为PhysicalNode（将RelationNode替换成ScanNode即可） */
function relationNode2ScanNode(relNode: LogicalNode): PhysicalNode {
    let result: PhysicalNode = <PhysicalNode>relNode;
    traversal(relNode, (node) => {
        if (node instanceof RelationNode) {
            let relName = node.params[0].name,
                parent = node.parent,
                newNode: PhysicalNode;
            if (parent) {
                // if (parent.type === RelAlgOpType.SELECT) {
                if (parent instanceof RelAlgSelectNode) {
                    // 表达式里有索引属性

                    /* 简单选择 */
                    // if 主索引 码属性 等值比较
                    // if 主索引 非码属性 等值比较
                    // if 辅助索引 等值比较
                    // if 主索引 比较
                    // if 辅助索引 比较

                    /* 复杂选择 */
                    // 合取选择
                    // 析取选择

                    let [condition] = parent.params;
                    let r = condition2Range(condition);

                    if (r) {
                        newNode = new ScanNode(relName, r.fieldName, r.range);
                        // TODO 需要处理排序
                        // newNode = new PhysicalOpNode(new SortScan());

                        if (parent.parent) {
                            replace<PhysicalNode>(parent, newNode, true);

                        } else {
                            result = newNode;
                        }

                    } else {
                        // 全表扫描
                        newNode = new ScanNode(relName);
                        replace<PhysicalNode>(node, newNode, true);
                    }

                } else {
                    // 全表扫描
                    newNode = new ScanNode(relName);
                    replace<PhysicalNode>(node, newNode, true);
                }

            } else {
                result = new ScanNode(relName);
            }

        }
    })
    return result;
}


/*
    TODO expressionNode里存在两个或者多个子查询如何处理？

    MySQL 关联子查询  关联子查询是指一个包含对表的引用的子查询，
    该表也显示在外部查询中。通俗一点来讲，就是子查询引用到了主查询的数据数据。

    TODO 子查询不想关时，如何处理？
    TODO 子查询相关时策略比较复杂，又该如何处理？
*/
