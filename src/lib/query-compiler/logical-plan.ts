import { RelAlgNode, RelAlgOpType, RelAlgProjectNode, RelAlgJoinNode, RelAlgCartProNode, RelAlgSelectNode, RelAlgDistinctNode } from "./relational-algebra";
import { SQLAST, SQLParser, SQL_STATEMENT_TYPE, ISelectStatement, TableSourceItem, ISubQueryStatement } from "../syntax-parser/parser";
import { RELATION_NAME, RELATION_ATTR, INODE } from "../define";
import { ExpressionNode, ExpressionLeafNode, ExpressionAtom, Operator, OperatorType, ExpressionInternalNode, ExpressionUtil } from "../syntax-parser/expression";
import { find, findAll, traversal, replace } from "../traversal";
import { RelationAttrInspector } from "./query-compiler";


/* interface PlanStep {
    id: number,
    dependencies: number[],
    value: LogicalNode
} */

/**  */
export type IPlan<P> = {
    subPlans: IPlan<P>[];
    primary: P
}

/**  */
// type RelAlgRelationNode = 
export class RelationNode implements INODE {
    constructor(name: RELATION_NAME) {
        this.params = [name];
    }
    params: RELATION_NAME[];
    parent?: LogicalNode;
}

/**  */
export type LogicalNode = RelAlgNode<RelationNode>

/**  */
export type LogicalPlan = IPlan<LogicalNode>;

/**  */
export function ast2LogicalPlan(ast: SQLAST): LogicalPlan {
    if (ast.type === SQL_STATEMENT_TYPE.QUERY) {
        return this.selectStatement2RelAlgNode(<ISelectStatement>ast);

    } else if (ast.type === SQL_STATEMENT_TYPE.INSERT) {

    }
    return null;
}


export class LogicalPlan2 implements IPlan<LogicalNode> {

    constructor(parser: SQLParser) {

        this.ast = parser.ast;
        this.parser = parser;

        // TODO 预检查在这里处理
        // TODO 预检查在这里处理
        // TODO 预检查在这里处理
        // TODO 预检查在这里处理
        // TODO
        // TODO
        // TODO
        // TODO
        // TODO

        // parser.ref
        this.primary = this.AST2LogicalPlan(this.ast)
    }
    subPlans: LogicalPlan2[];
    // 
    ast: SQLAST;
    // 
    parser: SQLParser;
    // PRIMARY 
    primary: LogicalNode
    // 需要先计算的RelAlgNode
    preCalculationNodes: LogicalNode[] = [];

    /** AST to LogicalPlan */
    AST2LogicalPlan(ast: SQLAST): LogicalNode {
        if (ast.type === SQL_STATEMENT_TYPE.QUERY) {
            return this.selectStatement2RelAlgNode(<ISelectStatement>ast);

        } else if (ast.type === SQL_STATEMENT_TYPE.INSERT) {

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
                        let names = this.parser.ref.attr.get(attr);
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
                            let names = this.parser.ref.attr.get(attr);
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
                    let preCalculationNode = this.selectStatement2RelAlgNode(subQueryStatement);
                    this.preCalculationNodes.push(preCalculationNode);

                    // TODO 数据结构待优化
                    let newNode = new ExpressionLeafNode<DependentValue>(ExpressionAtom.SUB_QUERY, {
                        key: this.preCalculationNodes.length - 1,
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

}


interface DependentValue {
    key: number,
    value: any
}



// TODO 两参数选择
// 为了从条件中去除子查询，引入逻辑运算符的中间形式：两参数选择
class TwoParameterSelectionNode {
    constructor(rel: LogicalNode, exp: ExpressionNode) {
        this.rel = rel;
        this.exp = exp;
    }
    // 
    rel: LogicalNode
    exp: ExpressionNode
    // 
    validate() {
        // 判断是否有多个子查询
    }

    /*     
        TODO expressionNode里存在两个或者多个子查询如何处理？

        MySQL 关联子查询  关联子查询是指一个包含对表的引用的子查询，
        该表也显示在外部查询中。通俗一点来讲，就是子查询引用到了主查询的数据数据。

        TODO 子查询不想关时，如何处理？
        TODO 子查询相关时策略比较复杂，又该如何处理？
    */
    toRelAlgNode() {
        this.validate();

    }
}

/*
function 处理单个子查询 {
    if 非相关子查询 {

        单行操作符：
            因为单行操作符的自查询部分返回一个值，
            可以优先执行返回结果，用于选择操作符的一个条件
            （另：如果先执行就得转换成笛卡尔积，做了很多无用的运算）

        exists运算符：也是作为优先执行的部分

        in, any, all：则转换成笛卡尔积/连接操作

    } else 相关查询 {

        单行操作符，exists运算符 的子查询不应该出现相关查询？可以

        单行操作符，exists运算符：转换成笛卡尔积/连接操作
        TODO: 单行操作符是否可以？

        in, any, all：转换成笛卡尔积/连接操作


    }
} */
