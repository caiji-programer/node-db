import { INODE, RELATION_ATTR } from "src/lib/define";

import { Token, TokenType } from "./token";
import Matcher from "./matcher";
import { traversal } from "../traversal";
import { Operator, OperatorType, operator2Function } from "./operator";
import { Tuple } from "../table";


/** 表达式节点（包括内部节点和叶子节点） */
type ExpressionNode = ExpressionInternalNode | ExpressionLeafNode;

/** 表达式内部节点 */
class ExpressionInternalNode implements INODE {
    constructor(op: Operator, children: ExpressionNode[]) {
        this.op = op;
        this.children = children;
        this.children.forEach(child => {
            child.parent = this;
            if (child.hasSubQuery) this.hasSubQuery = true;
        });
    }
    hasSubQuery: boolean = false;
    parent?: ExpressionInternalNode;
    op: Operator;
    children: ExpressionNode[];
    /** 中序遍历节点，并将所有元素（内部节点返回Operator，叶子节点返回value）合并为一个新数组返回 */
    flat(): any[] {
        let results: any[] = this.children.map(child => child.flat());
        if (results.length) {
            results.splice(1, 0, [this.op]);
            return [].concat(...results);
        } else {
            return [this.op];
        }
    }
    /* match(fn: (node: ExpressionInternalNode) => boolean): boolean {
        return fn(this);
    } */
}
/** 表达式叶子节点 */
class ExpressionLeafNode<T = any> implements INODE {
    constructor(type: ExpressionAtom, value: T) {
        this.type = type;
        this.value = value;
        this.hasSubQuery = type === ExpressionAtom.SUB_QUERY;
    }
    hasSubQuery: boolean = false;
    parent?: ExpressionInternalNode;
    type: ExpressionAtom;
    value: T;
    flat(): T[] {
        /** 直接返回此节点的value */
        return [this.value]
    }
    /* match(fn: (node: ExpressionLeafNode) => boolean): boolean {
        return fn(this);
    } */
}

/** 表达式叶子节点的类型 */
enum ExpressionAtom {
    CONSTANT = "CONSTANT",
    ATTR = "ATTR",
    SUB_QUERY = "SUB_QUERY"
}

/***/
enum ConstantType {
    STRING = "STRING",
    NUMBER = "NUMBER",
    BOOLEAN = "BOOLEAN",
    NULL = "NULL"
}

// 常量：字符串、数字、布尔值、空等
const constantTokenTypes = [
    TokenType.FLOAT,
    TokenType.INT,
    TokenType.TRUE,
    TokenType.FALSE,
    TokenType.NULL,
    TokenType.QSTRING
];

/** 单个Token 映射 操作符 */
const tokenOperatoMap = new Map<TokenType, OperatorType>();
tokenOperatoMap.set(TokenType.NOT_S, OperatorType.NOT_S);
tokenOperatoMap.set(TokenType.STAR, OperatorType.MUL);
tokenOperatoMap.set(TokenType.DIV, OperatorType.DIV);
tokenOperatoMap.set(TokenType.SUB, OperatorType.SUB);
tokenOperatoMap.set(TokenType.ADD, OperatorType.ADD);
tokenOperatoMap.set(TokenType.EQ, OperatorType.EQ);
tokenOperatoMap.set(TokenType.GT, OperatorType.GT);
tokenOperatoMap.set(TokenType.GE, OperatorType.GE);
tokenOperatoMap.set(TokenType.LT, OperatorType.LT);
tokenOperatoMap.set(TokenType.LE, OperatorType.LE);
tokenOperatoMap.set(TokenType.NE, OperatorType.NE);
tokenOperatoMap.set(TokenType.IS, OperatorType.IS);
tokenOperatoMap.set(TokenType.LIKE, OperatorType.LIKE);
tokenOperatoMap.set(TokenType.EXISTS, OperatorType.EXISTS);
tokenOperatoMap.set(TokenType.IN, OperatorType.IN);
tokenOperatoMap.set(TokenType.ANY, OperatorType.ANY);
tokenOperatoMap.set(TokenType.ALL, OperatorType.ALL);
tokenOperatoMap.set(TokenType.SOME, OperatorType.SOME);

tokenOperatoMap.set(TokenType.BETWEEN, OperatorType.BETWEEN);
tokenOperatoMap.set(TokenType.NOT, OperatorType.NOT);
tokenOperatoMap.set(TokenType.AND_S, OperatorType.AND);
tokenOperatoMap.set(TokenType.AND, OperatorType.AND);
tokenOperatoMap.set(TokenType.OR_S, OperatorType.OR);
tokenOperatoMap.set(TokenType.OR, OperatorType.OR);

/** 操作符的Token类型 */
const operatorTokenTypes: TokenType[] = Array.from(tokenOperatoMap.keys());

/** 将有序的Operator|ExpressionNode构建成树形结构。
 *  注：这里的Operator符合从低优先级到高优先级的排序，
 *      因此，可以从后往前构建。
 */
const orderNodesTransfromExpTree = (nodes: (Operator | ExpressionNode)[]): ExpressionNode => {
    let node, right, left;
    while (node = nodes.pop()) {
        if (node instanceof Operator) {
            // 一元运算符
            if (node.isUnary()) {
                right = new ExpressionInternalNode(node, [right]);
            } else {
                left = nodes.pop();
                if (left instanceof Operator) {
                    throw new Error("Operator next one should be ExpressionNode!");
                }
                right = new ExpressionInternalNode(node, [left, right]);
            }
        } else {
            right = node;
        }
    }
    return right;
}

/** Array.findIndex的逆序查找 */
const reverseFindIndex = <T>(arr: T[], func: (node: T) => boolean, index?: number) => {
    if (index <= 0) return -1;
    let len = arr.length, ele;
    for (index = (index || len) - 1; index >= 0; index--) {
        ele = arr[index];
        if (ele && func(ele)) {
            return index;
        }
    }
    return -1;
}

// 
const ExpressionUtil = {
    split(node: ExpressionNode): ExpressionNode[] {

        if (node instanceof ExpressionInternalNode) {
            if (node.op.type === OperatorType.AND) {
                // node.children.map(child => ExpressionUtil.split(child)).flat()
                let nodesArr = node.children.map(child => ExpressionUtil.split(child));
                return [].concat(...nodesArr)
            }
        }
        return [node];
    },
    merge(...nodes: ExpressionNode[]): ExpressionNode {
        if (nodes && nodes.length) {
            if (nodes.length === 1) {
                return nodes[0];
            }
            return new ExpressionInternalNode(new Operator(OperatorType.AND, "AND"), nodes);
        }
        return null;
    },

    isSubQuery(node: ExpressionNode): boolean {
        return node instanceof ExpressionLeafNode && node.type == ExpressionAtom.SUB_QUERY
    },

    isAttr(node: ExpressionNode): boolean {
        return node instanceof ExpressionLeafNode && node.type == ExpressionAtom.ATTR
    },

    isConstant(node: ExpressionNode): boolean {
        return node instanceof ExpressionLeafNode && node.type == ExpressionAtom.CONSTANT
    }
    
}


/**  */
class ExpressionMatcher extends Matcher {

    constructor(tokens?: Token[]) {
        // if (tokens && tokens.length) {
        super(tokens);
        // }
    }
    //
    // root: ExpressionNode;
    /** 常量：字符串、数字、布尔值、空等 */
    parseConstant(): ExpressionLeafNode {
        let cons = this.expectOptional(...constantTokenTypes), val;
        if (cons) {
            TokenType.FLOAT,
            TokenType.INT,
            TokenType.TRUE,
            TokenType.FALSE,
            TokenType.NULL,
            TokenType.QSTRING
            if (cons.type === TokenType.QSTRING && cons.value) {
                val = cons.value.replace(/['"]/g, "")
            } else if (cons.type === TokenType.INT || cons.type === TokenType.FLOAT) {
                val = Number(cons.value);
            } else if (cons.type === TokenType.TRUE) {
                val = true;
            } else if (cons.type === TokenType.FALSE) {
                val = false;
            } else if (cons.type === TokenType.NULL) {
                val = null;
            }
            return new ExpressionLeafNode(ExpressionAtom.CONSTANT, val);
        }
        return null;
    }

    /** 解析匹配操作符 */
    parseOperator(): Operator {
        let type: OperatorType, additionalOp: OperatorType, token: Token;
        // 先判断连续两个Token组成的Operator
        // IS
        if (this.expect(TokenType.IS)) {
            type = OperatorType.IS;
            if (this.expect(TokenType.NOT)) {
                additionalOp = OperatorType.NOT;
            }
            return new Operator(type, type.toString(), additionalOp);
        }
        // IN、BETWEEN、LIKE
        if (this.expect(TokenType.NOT)) {
            type = OperatorType.NOT;
            if ((token = this.expectOptional(TokenType.IN, TokenType.BETWEEN, TokenType.LIKE))) {
                additionalOp = type;
                type = tokenOperatoMap.get(token.type);
            }
            return new Operator(type, type.toString(), additionalOp);
        }
        // ANY、SOME、ALL
        if (token = this.expectOptional(TokenType.EQ, TokenType.GT, TokenType.LT, TokenType.GE, TokenType.LE, TokenType.NE)) {
            let value = token.value;
            type = tokenOperatoMap.get(token.type);
            if (token = this.expectOptional(TokenType.ALL, TokenType.ANY, TokenType.SOME)) {
                additionalOp = type;
                type = tokenOperatoMap.get(token.type);
                value = type.toString();
            }
            return new Operator(type, value, additionalOp);
        }

        if (!type) {
            token = this.expectOptional(...operatorTokenTypes);
            if (!token) return null;
            type = tokenOperatoMap.get(token.type);
        }
        return new Operator(type, token.value);
    }

    /**
     * 解析匹配表达式
     * @fn 满足特定条件时不再解析，直接返回ExpressionNode
     */
    parseExpression(fn?: (node) => boolean): ExpressionNode {
        let stack: (Operator | ExpressionNode)[] = [];
        while (this.hasNext()) {
            let node, pos = this.tokenPos;
            // 匹配原子项
            if (node = this.parseExpressionAtom()) {
                if (fn && fn(node)) {
                    this.tokenPos = pos;
                    break;
                }
                stack.push(node);
                continue;
            }
            // 匹配操作符
            if (node = this.parseOperator()) {
                if (fn && fn(node)) {
                    this.tokenPos = pos;
                    break;
                }
                let index: number;
                // BETWEEN/NOTBETWEEN 语句需要特殊处理
                if (node.type === OperatorType.AND) {
                    // 往前面找操作符BETWEEN/NOTBETWEEN
                    index = reverseFindIndex(stack, (ele) => {
                        if (ele instanceof Operator) {
                            return ele.type === OperatorType.BETWEEN;
                        }
                        return false;
                    })
                    if (index >= 0) {
                        let nodes = stack.splice(index + 1, stack.length);
                        let start = orderNodesTransfromExpTree(nodes);
                        let op = stack.pop();
                        let predicate = stack.pop();
                        // 匹配到比AND优先级更低的操作符
                        let end = this.parseExpression((node) => {
                            if (node instanceof Operator) {
                                // return operatorLevelCompare(node.type, OperatorType.AND) <= 0;
                                return node.compare(OperatorType.AND) <= 0;
                            }
                            return false;
                        });
                        let betweenNode = new ExpressionInternalNode(<Operator>op, [<ExpressionNode>predicate, start, end]);
                        stack.push(betweenNode);
                        break;
                    }
                }
                // 判断当前操作符前面是否有优先级更高的 
                index = reverseFindIndex(stack, (ele) => {
                    if (ele instanceof Operator) {
                        // return operatorLevelCompare(ele.type, node.type) > 0;
                        return ele.compare(node.type) > 0;
                    }
                    return false
                });
                if (index >= 0) {
                    // 往前找到优先级小于等于当前操作符的位置
                    index = reverseFindIndex(stack, (ele) => {
                        if (ele instanceof Operator) {
                            // return operatorLevelCompare(ele.type, node.type) <= 0;
                            return ele.compare(node.type) < 0;
                        }
                        return false;
                    });
                    let nodes = stack.splice(index + 1, stack.length);
                    stack.push(orderNodesTransfromExpTree(nodes));
                }
                stack.push(node);
                continue;
            }
            // 如果当前token没办法匹配为原子项或者操作符（如：子表达式结束后是右括号），则跳出循环
            break;
        }

        if (stack.length) {
            return orderNodesTransfromExpTree(stack);
        }
        return null;
    }

    /** 解析表达式原子项（常量、属性、子查询、嵌套表达式） */
    parseExpressionAtom(): ExpressionNode {
        let result;
        if (result = this.parseConstant()) return result;
        // 关系的属性
        if (result = this.parseAttr()) {
            return new ExpressionLeafNode(ExpressionAtom.ATTR, result);
        }
        // TODO 函数（暂时不支持）
        // 子查询/子表达式
        if (this.expect(TokenType.LPAREN)) {
            if ((result = this.parseSelectStatement()) && this.expect(TokenType.RPAREN)) {
                return new ExpressionLeafNode(ExpressionAtom.SUB_QUERY, result);
            }
            if ((result = this.parseExpression()) && this.expect(TokenType.RPAREN)) {
                return result
            }
            let token = this.peek()
            throw new Error(`括号内必须为子查询或者子表达式，且以右括号结尾！出现了${token.type}: ${token.value}。`)
        }
        return null;
    }

    /** parseAttr() 由子类来实现 */
    parseAttr(): any {
        throw new Error("Sub class should rewrite parseAttr() !");
    }
    /** parseSelectStatement() 由子类来实现 */
    parseSelectStatement(): any {
        throw new Error("Sub class should rewrite parseSelectStatement() !");
    }

}


/** 计算表达式结果
 *  @extendFn 扩展方法，处理无法识别的操作符、操作数
 */
function calcExpression(node: ExpressionNode, extendFn: (n: ExpressionLeafNode) => any) {
    if (node instanceof ExpressionInternalNode) {
        let args = node.children.map(child => calcExpression(child, extendFn));
        let fn = operator2Function(node.op)
        if (fn) {
            try {
                return fn(...args);
            } catch(e) {
                console.error(`操作符 '${node.op}' 函数调用时出错：${e.message}！`);
            }
        } else {
            console.error(`操作符 '${node.op}' 函数不存在！`);
        }
    } else {
        // 常数
        if (node.type === ExpressionAtom.CONSTANT) {
            return node.value;
        // 非常数（字段或者是子查询）由extendFn来处理
        } else if (extendFn) {
            return extendFn(node);
        }
    }
    return
}

/** 计算表达式（Tuple为数据源） */
function calcExpressionByTuple(condition: ExpressionNode, tuple: Tuple) {
    let result = calcExpression(condition, (node) => {
        if (node.type === ExpressionAtom.ATTR) {
            let fieldName = (<RELATION_ATTR>node.value).slice(-1).pop();
            if (tuple.hasField(fieldName)) {
                return tuple.getField(fieldName).value;
            } else {
                throw new Error(`字段不存在：${fieldName}`);
            }
        } else {
            throw new Error(`期望表达式类型为ATTR，但接收到：${node.type}`);
        }
    })
    return result;
}

export {
    // Operator,
    // OperatorType,
    ExpressionAtom,
    ExpressionNode,
    ExpressionLeafNode,
    ExpressionInternalNode,
    ExpressionMatcher,
    calcExpression,
    calcExpressionByTuple,
    ExpressionUtil
}
