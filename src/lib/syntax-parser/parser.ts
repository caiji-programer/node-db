import { Token, TokenType } from "./token";
import Lexer from "./lexer";
import { ExpressionMatcher, ExpressionNode, ExpressionLeafNode, ExpressionAtom, ExpressionInternalNode, ExpressionUtil } from "./expression";
import { RELATION_NAME, RELATION_ATTR, SQL_STATEMENT_TYPE, JOIN_TYPE, ORDER_TYPE, ATTRIBUTE_VAL } from "../define";
import { traversal } from "../traversal";
import { table } from "console";
import { OperatorType } from ".";


// export default function parse(source) {
//     let lexer = new Lexer(source);
//     let tokens = lexer.getTokens();
//     let tree = new SQLSyntaxTree(tokens);
//     let ast = tree.build();
//     return ast;
// }



type SQLAST = ISelectStatement | IInsertStatement | IUpdateStatement | IDeleteStatement;

interface IStatement {
    type: SQL_STATEMENT_TYPE
}

interface ISelectStatement extends IStatement {
    type: SQL_STATEMENT_TYPE.QUERY,
    /** 是否是相关子查询
     *  TODO: 多数情况下是子查询的WHERE子句中引用了外部查询的关系，
     *  TODO: 目前，其他情况暂时不考虑处理
     */
    isCorrelative: boolean,
    selectElements: RELATION_ATTR[],
    /** tableSources里的关系 */
    sourceNames: string[],
    tableSources: ITableSource[],
    where?: Condition,
    orderBy?: IOrderByClause,
}

interface IInsertStatement extends IStatement {
    type: SQL_STATEMENT_TYPE.INSERT,
    tabelName: string,
    fieldNames: string[],
    values: ATTRIBUTE_VAL[][] | ISelectStatement;
}

interface IUpdateStatement extends IStatement {
    type: SQL_STATEMENT_TYPE.UPDATE,
    tabelName: string,
    setFields: IFieldSetter[],
    where?: Condition
}

interface IFieldSetter {
    name: string,
    value: ATTRIBUTE_VAL | Condition
}

interface IDeleteStatement extends IStatement {
    type: SQL_STATEMENT_TYPE.DELETE,
    tabelName: string,
    where?: Condition
}

interface ISubQueryStatement {
    statement: ISelectStatement,
    alias?: string
}

interface ITableSource {
    table: TableSourceItem,
    joins?: IJoinClause[]
}

type TableSourceItem = RELATION_NAME | ISubQueryStatement;
// interface ITableSourceItem {
//     name: string,
//     alias?: string
// }
type Condition = ExpressionNode;

interface IJoinClause {
    type: JOIN_TYPE,
    table: TableSourceItem,
    attrs?: RELATION_ATTR[]
}

interface IOrderByClause {
    attr: RELATION_ATTR,
    type?: ORDER_TYPE
}

// 查找选择语句里的关系
function findRelationsFromSelectStatement(statement: ISelectStatement): string[] {
    function findRelationsFromTableSourceItem(item: TableSourceItem): string[] {
        if (!item) return [];
        let names: string[] = [], statement = (<ISubQueryStatement>item).statement;
        if (statement) {
            names.push(item.alias);
            // TODO 递归子查询？
            // names = names.concat(findRelationsFromSelectStatement(statement));
        } else {
            names.push((<RELATION_NAME>item).name);
        }
        return names;
    }

    let names: string[] = [];
    statement.tableSources.forEach(source => {
        names = names.concat(findRelationsFromTableSourceItem(source.table));
        // names.push(source.table.alias || (<RELATION_NAME>source.table).name);
        if (source.joins && source.joins.length) {
            source.joins.forEach(join => {
                names = names.concat(findRelationsFromTableSourceItem(join.table));
                // names.push(join.table.alias || (<RELATION_NAME>join.table).name);
            })
        }
    });
    return names
}


/** 关系和属性引用（用来表示SQL语句中关系和属性的引用情况，用于语义检查）
 *  TODO 语法树阶段可以检查部分属性的归属？相关子查询里的某些属性可能无法判断？
 *  TODO 应该是可以。因为引用外部的关系是要明确具体的关系？
 *  TODO 待确认
 * 
 *  TODO 此数据结构并不太好，待优化！
 *  TODO 此数据结构并不太好，待优化！
 *  TODO 此数据结构并不太好，待优化！
 */
class RelationAttrReference {
    constructor() {
        this.attr = new Map<RELATION_ATTR, string[]>();
        this.relation = new Map<string, RELATION_NAME>();
        this.tempRelation = new Map<string, string[]>();
    }
    /** 属性: <RELATION_ATTR, 属性所属的关系> （所属的关系时多个时无法确定具体） */
    attr: Map<RELATION_ATTR, string[]>;
    /** 关系: <关系或别名, RELATION_NAME> */
    relation: Map<string, RELATION_NAME>;
    /** 临时关系: <子查询的别名, 所依赖的关系及临时关系> */
    tempRelation: Map<string, string[]>;
    /** 多个关系组成一个集合，即：tableSources里的关系集合: <关系或别名[]> */
    // aggregateRelation: new Array<string[]>()

    /** 是否存在关系|临时关系 */
    hasRelation(name: string) {
        if (this.relation.has(name)) {
            return true;
        }
        if (this.tempRelation.has(name)) {
            return true;
        }
        return false;
    }

    /** 将关系或临时关系转换成关系集合（即：将关系别名、临时关系转换成关系名集合） */
    transfromRelations(names: string[]): string[] {
        let result: string[] = [];
        names.forEach(name => {
            let rel, rels;
            if (rel = this.relation.get(name)) {
                if (!result.includes(rel.name)) {
                    result.push(rel.name);
                }
            } else if (rels = this.tempRelation.get(name)) {
                let temps = this.transfromRelations(rels);
                temps.forEach(name => {
                    if (!result.includes(name)) {
                        result.push(name);
                    }
                })
            }
        })
        return result;
    }
}


class SQLParser extends ExpressionMatcher {

    // constructor(tokens: Token[]) {
    constructor(sql: string) {
        // this.tokens = tokens.filter(token => token.type !== TokenType.SPACES);
        // super(tokens);
        super();
        this.ast = this.parse(sql);
    }

    ast: SQLAST;

    // TODO 此数据结构并不太好，待优化
    // TODO 此数据结构并不太好，待优化
    // TODO 此数据结构并不太好，待优化
    /** 属性&关系的引用情况，主要用于语义检查 */
    ref: RelationAttrReference = new RelationAttrReference();

    parse(source): SQLAST {
        let lexer = new Lexer(source);
        let tokens = lexer.getTokens();
        this.tokenPos = 0;
        this.tokens = tokens.filter(token => token.type !== TokenType.SPACES);
        if (this.tokens.length === 0) {
            return null
        }

        let result = this.parseDDL();
        if (!result) {
            result = this.parseDML();
        }
        return result;
    }

    // parseCommand(){}
    // parseUtility(){}

    parseDDL() {
        return null;
    }

    parseDML(): SQLAST {
        let first = this.tokens[0];
        // let first = this.peek();
        if (first.type === TokenType.SELECT) {
            return this.parseSelectStatement();
        } else if (first.type === TokenType.INSERT) {
            return this.parseInsertStatement();
        } else if (first.type === TokenType.UPDATE) {
            return this.parseUpdateStatement();
        } else if (first.type === TokenType.DELETE) {
            return this.parseDeleteStatement();
        } else {
            return null;
        }
    }

    parseCreateTable() { }

    parseCreateIndex() { }

    // INSERT INTO table_name ( field1, field2,...fieldN ) VALUES ( value1, value2,...valueN ), ( value1, value2,...valueN );
    parseInsertStatement(): IInsertStatement {
        if (!this.expectMany(TokenType.INSERT, TokenType.INTO)) {
            return null;
        }
        let pos = this.tokenPos, token: Token, tabelName;
        token = this.expect(TokenType.STRING);
        if (token) {
            tabelName = token.value;
        }

        let fieldNames = this.parseInsertStatementFields();
        let values, val;
        if (this.expect(TokenType.VALUES)) {
            if(val = this.parseInsertStatementValues()) {
                values = [val];
                while (this.expect(TokenType.COMMA) && (val = this.parseInsertStatementValues())) {
                    values.push(val);
                }
            } else {
                this.throwError("parseInsertStatementValues")
            }
        } else if (values = this.parseSelectStatement()) {

        } else {
            this.throwError("parseInsertStatement");
        }

        return {
            type: SQL_STATEMENT_TYPE.INSERT,
            tabelName,
            fieldNames,
            values
        }
    }

    // ( field1, field2,...fieldN )
    parseInsertStatementFields(): string[] {
        if (this.expect(TokenType.LPAREN)) {
            let token: Token, tokens, fieldNames: string[] = [];
            if (token = this.expect(TokenType.STRING)) {
                fieldNames.push(token.value);
                while (tokens = this.expectMany(TokenType.COMMA, TokenType.STRING)) {
                    fieldNames.push(tokens[1].value);
                }
                if (this.expect(TokenType.RPAREN)) {
                    return fieldNames;
                }
            }
            this.throwError('parseInsertStatementFields Error!');
        }
        return null;
    }

    // ( value1, value2,...valueN )
    parseInsertStatementValues(): ATTRIBUTE_VAL[] {
        if (this.expect(TokenType.LPAREN)) {
            let node: ExpressionLeafNode, values: ATTRIBUTE_VAL[] = [];
            // let valueTokenTypes = [TokenType.INT, TokenType.FLOAT, TokenType.QSTRING];
            // if (token = this.expectOptional(...valueTokenTypes)) {
            if (node = this.parseConstant()) {
                values.push(node.value);
                // while (this.expect(TokenType.COMMA) && (token = this.expectOptional(...valueTokenTypes))) {
                while (this.expect(TokenType.COMMA) && (node = this.parseConstant())) {
                    values.push(node.value);
                }
                if (this.expect(TokenType.RPAREN)) {
                    return values;
                }
            }
            this.throwError('parseInsertStatementValues Error!');
        }
        return null;
    }

    // UPDATE table_name SET field1=new-value1, field2=new-value2 [WHERE Clause]
    parseUpdateStatement(): IUpdateStatement {
        if (this.expect(TokenType.UPDATE)) {
            let token: Token, tabelName: string, ele, setFields = [];
            if (token = this.expect(TokenType.STRING)) {
                tabelName = token.value;
                if (this.expect(TokenType.SET)) {
                    while (ele = this.parseUpdateElement()) {
                        setFields.push(ele);
                        if (this.expect(TokenType.COMMA)) {
                            continue;
                        }
                        break;
                    }
                    let where = this.parseWhereClause();
                    return {
                        type: SQL_STATEMENT_TYPE.UPDATE,
                        tabelName,
                        setFields,
                        where,
                    }
                }
            }
        }
        return null;
    }

    // field1=value
    parseUpdateElement(): { name: string, value: ATTRIBUTE_VAL | Condition } {
        let token: Token, exp = this.parseExpression();
        if (exp instanceof ExpressionInternalNode) {
            if (exp.op.type === OperatorType.EQ && exp.children.length === 2) {
                if (ExpressionUtil.isAttr(exp.children[0])) {
                    return {
                        name: (<ExpressionLeafNode<RELATION_ATTR>>exp.children[0]).value.slice(-1).pop(),
                        value: exp.children[1]
                    }
                }
            }
        }
        /* if (token = this.expect(TokenType.STRING)) {
            if (this.expect(TokenType.EQ)) {
                if (exp = this.parseConstant()) {
                    return {
                        name: token.value,
                        value: exp.value
                    }
                }
                if (exp = this.parseExpression()) {
                    return {
                        name: token.value,
                        value: exp
                    }
                }
            }
        } */
        return null;
    }

    // DELETE FROM table_name [WHERE Clause]
    parseDeleteStatement(): IDeleteStatement {
        if (this.expectMany(TokenType.DELETE, TokenType.FROM)) {
            let token: Token, tabelName: string, where;
            if (token = this.expect(TokenType.STRING)) {
                tabelName = token.value;
                where = this.parseWhereClause();
                return {
                    type: SQL_STATEMENT_TYPE.DELETE,
                    tabelName,
                    where
                }
            } else {
                this.throwError("parseDeleteStatement error");
            }
        }

        return null
    }


    // SELECT selectElements fromClause orderByClause? limitClause
    // SELECT selectElements FROM tableSources (WHERE whereExpr=expression)? orderByClause? limitClause
    parseSelectStatement(): ISelectStatement {
        if (!this.expect(TokenType.SELECT)) {
            return null;
        }
        let selectElements = this.parseSelectElements();
        let tableSources = this.parseTableSources();
        if (!tableSources || !tableSources.length) {
            this.throwError(`SELECT 语句必须包含 FROM Clause!`);
        }
        let where = this.parseWhereClause();
        let orderBy = this.parseOrderByClause();
        // let limit = this.parseLimitClause();
        let result: ISelectStatement = {
            type: SQL_STATEMENT_TYPE.QUERY,
            isCorrelative: false,
            selectElements,
            sourceNames: [],
            tableSources,
            where,
            orderBy
        };

        // TODO 给未确认归属的属性确定所属关系 
        // 属性名可能相同，但归可能不同，所以不能所有放在 relationAttrReference.attr

        // 统计所有属性，用于构建关系代数表达式前的语义检查
        let names: string[] = findRelationsFromSelectStatement(result);
        result.sourceNames = names;
        // TODO 暂时用数字作为aggregateRelation的key，理论上有可能跟其他关系名重复，需要处理
        // let aggregateRelationKey = this.ref.aggregateRelation.length + "";
        // this.ref.aggregateRelation.push(names);
        selectElements.forEach(ele => {
            if (ele.length === 1) {
                // ele.unshift(aggregateRelationKey);
                // 确认属性的归属范围
                this.ref.attr.set(ele, names);
            }
        });

        if (where) {
            traversal(where, (node) => {
                if (node instanceof ExpressionLeafNode) {
                    if (node.type == ExpressionAtom.ATTR) {
                        let attr = <RELATION_ATTR>node.value
                        if (attr.length === 1) {
                            // attr.unshift(aggregateRelationKey);
                            // 确认属性的归属范围
                            this.ref.attr.set(attr, names);
                        } else {
                            // 引用了外部查询的关系，即认定为相关子查询
                            if (!names.includes(attr[0])) {
                                result.isCorrelative = true;
                            }
                        }
                    }
                }
            })
        }

        return result;
    }

    parseSelectElements(): RELATION_ATTR[] {
        if (this.expect(TokenType.STAR)) {
            return [];
        }

        let element = this.parseAttr();
        if (!element) {
            return null;
        }

        let result = [element];
        while (this.expect(TokenType.COMMA)) {
            element = this.parseAttr();
            if (element) {
                result.push(element);
            } else {
                return null;
            }
        }
        return result;
    }

    // 可以是多个表
    parseTableSources(): ITableSource[] {
        if (this.expect(TokenType.FROM)) {
            let result = [], tableSource: ITableSource;
            while (tableSource = this.parseTableSource()) {
                result.push(tableSource);
                if (!this.expect(TokenType.COMMA)) {
                    break;
                }
            }
            if (result.length == 0) this.throwError(`FROM 后面应该接一个关系或者是子查询！`)
            return result;
        }
        return null;
    }

    parseTableSource(): ITableSource {
        let item: TableSourceItem = this.parseTableSourceItem();
        if (item) {
            let joins = [], join: IJoinClause = null;
            while (join = this.parseJoinClause()) {
                joins.push(join);
            }
            return {
                table: item,
                joins
            };
        }
        return null;
    }

    parsSubQueryStatement(): ISubQueryStatement {
        let pos = this.tokenPos;
        if (this.expect(TokenType.LPAREN)) {
            let statement = this.parseSelectStatement(), token, alias;
            // FROM类型的子查询一定是要有别名
            if (statement && this.expect(TokenType.RPAREN) && (token = this.expect(TokenType.STRING))) {
                alias = token.value;
                // 统计该临时关系（子查询）所依赖的关系，如果依赖的关系是也是临时的（子查询），则只需统计别名不用递归
                let dependentRelations = findRelationsFromSelectStatement(statement);
                this.ref.tempRelation.set(alias, dependentRelations);
                return {
                    statement,
                    alias
                }
            }
        }
        this.tokenPos = pos;
        return null;
    }

    parseTableSourceItem(): TableSourceItem {
        let result: TableSourceItem;
        // 可以是子查询
        if (result = this.parsSubQueryStatement()) {
            return result;
        }
        let token: Token = this.expect(TokenType.STRING);
        if (token) {
            result = { name: token.value };
            token = this.expect(TokenType.STRING);
            if (token) {
                result.alias = token.value;
                this.ref.relation.set(result.alias, result);
            }
            this.ref.relation.set(result.name, result);
            return result
        }
        return null;
    }

    // TODO
    parseJoinClause(): IJoinClause {
        let type: JOIN_TYPE;
        if (this.expect(TokenType.JOIN)) {
            type = JOIN_TYPE.INNER;
        } else if (this.expectMany(TokenType.INNER, TokenType.JOIN)) {
            type = JOIN_TYPE.INNER;
        } else if (this.expectMany(TokenType.LEFT, TokenType.JOIN)) {
            type = JOIN_TYPE.LEFT;
        } else if (this.expectMany(TokenType.RIGHT, TokenType.JOIN)) {
            type = JOIN_TYPE.RIGHT;
        } else {
            return null;
        }

        let table = this.parseTableSourceItem(), attrs: RELATION_ATTR[] = [], tokens: Token[];
        if (!table) this.throwError(`JOIN后面应该是一个关系或者子查询！`);
        if (this.expect(TokenType.ON)) {
            let left, right;
            if ((left = this.parseAttr()) && this.expect(TokenType.EQ) && (right = this.parseAttr())) {
                attrs = [left, right]
            } else {
                this.throwError("JoinClause ON 后面应该是一个等式！");
            }
        }
        return {
            type,
            table,
            attrs
        }
    }

    // -> WHERE EXPRESSION
    parseWhereClause(): Condition {
        if (this.hasNext() && this.expect(TokenType.WHERE)) {
            let exp = this.parseExpression();
            if (!exp) this.throwError(`WHERE关键字后面应该是一个表达式！`);
            return exp;
        }
        return null;
    }

    //  relattr -> STRING DOT STRING
    parseAttr(): RELATION_ATTR {
        let token = this.expect(TokenType.STRING), result: string[] = [];
        if (token) {
            result.push(token.value);
            let tokens = this.expectMany(TokenType.DOT, TokenType.STRING);
            if (tokens) {
                result.push(tokens[1].value);
                this.ref.attr.set(result, [result[0]]);
                return result;
            }
            // this.ref.attr.set(result, null);
            return result;
        }
        return null;
    }

    // 
    parseOrderByClause(): IOrderByClause {
        if (this.hasNext() && this.expectMany(TokenType.ORDER, TokenType.BY)) {
            let attr = this.parseAttr();
            if (attr) {
                let result = this.expectOptional(TokenType.DESC, TokenType.ASC);
                let type = ORDER_TYPE.ASC;
                if (result && result.type === TokenType.DESC) {
                    type = ORDER_TYPE.DESC;
                }
                return {
                    attr,
                    type
                }
            }
            return null;
        }
        return null;
    }

    parseDropTable() { }

    parseDropIndex() { }

    parseNonmtAttrtypeList() { }

    parseNonmtSelectClause() { }

    parseNonmtAggrelattrList() { }

    parseNonmtRelationList() { }

    parseNonmtCondList() { }

    parseAggrelattr() { }

    parseNonmtValueList() { }

    // parseValue() { }

    parseAttrtype() { }

    // parseRelAttr() { }



    parseOptOrderByClause() { }

    parseOptGroupByClause() { }

    // parseCondition(){}

    // parseRelAttrOrValue() { }

    throwError(message) {
        let desc: string = this.tokens.slice(this.tokenPos, 3).join(" ");
        throw new Error(`Parse SQL statement occurred error: ${message}. Postion: ${desc}`);
    }
}

export {
    SQL_STATEMENT_TYPE,
    ISelectStatement,
    IInsertStatement,
    IUpdateStatement,
    IDeleteStatement,
    ISubQueryStatement,
    ITableSource,
    TableSourceItem,
    IJoinClause,
    IOrderByClause,
    IFieldSetter,
    SQLAST,
    SQLParser,
    RelationAttrReference
}

/*
interface Node {
    type: NodeType;
    any;
}

enum NodeType {
    N_CREATETABLE,
    N_CREATEINDEX,
    N_DROPTABLE,
    N_DROPINDEX,
    N_LOAD,
    N_SET,
    N_HELP,
    N_PRINT,
    N_QUERY,
    N_INSERT,
    N_DELETE,
    N_UPDATE,
    N_RELATTR,
    N_ORDERATTR,
    N_AGGRELATTR,
    N_CONDITION,
    N_RELATTR_OR_VALUE,
    N_ATTRTYPE,
    N_VALUE,
    N_RELATION,
    N_STATISTICS,
    N_LIST,
    N_EXIT
};
*/
