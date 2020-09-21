import { middleTraversal, traversal } from "../traversal";
import { ExpressionNode, ExpressionLeafNode, ExpressionAtom } from "../syntax-parser/expression";
import { RELATION_ATTR } from "../define";
import { RelAlgNode, RelAlgOpType, RelAlgProjectNode, RelAlgSelectNode, RelAlgCartProNode, RelAlgJoinNode, RelAlgDistinctNode } from "./relational-algebra";
import { PhysicalNode, ScanNode } from "./plan";
// import { ScanNode } from ".";
// import { ILogicalPlan, IPlanNode } from "./server/inter";


export function simplifyExpressionNode(node: ExpressionNode): string {
    let resultBuf = [];
    middleTraversal(node, (node) => {
        if (node instanceof ExpressionLeafNode) {
            let type = node.type, value;
            if (type === ExpressionAtom.ATTR) {
                value = <RELATION_ATTR>node.value
                resultBuf.push(value.join("."));
            } else if (type === ExpressionAtom.CONSTANT) {
                resultBuf.push(node.value);
            } else if (type === ExpressionAtom.SUB_QUERY) {
                // TODO 子查询的结果数据结构待优化 SUB_QUERY_RESULT
                value = node.value.key;
                resultBuf.push(`[SUB_QUERY_RESULT(index=${value})]`);
            }
        } else {
            resultBuf.push(node.op.toString());
        }
    })
    return resultBuf.join("");
}

export function simplifyRelAlgNode(node: RelAlgNode<any>, id?: number) {
    let name: string, value: string = "", children: any[];
    if (node instanceof RelAlgProjectNode) {
        name = "PROJECT";
        value = node.params.map(attr => attr.join(".")).join(";");
        children = node.children.map(n => simplifyRelAlgNode(n));
    } else if (node instanceof RelAlgSelectNode) {
        name = "SELECT";
        value = simplifyExpressionNode(node.params[0]);
        children = node.children.map(n => simplifyRelAlgNode(n));
    } else if (node instanceof RelAlgCartProNode) {
        name = "CART_PRO";
        children = node.children.map(n => simplifyRelAlgNode(n));
    } else if (node instanceof RelAlgJoinNode) {
        name = "JOIN";
        value = node.params.map(attr => attr.join(".")).join(";");
        children = node.children.map(n => simplifyRelAlgNode(n));
    } else if (node instanceof RelAlgDistinctNode) {
        name = "DISTINCT";
        children = node.children.map(n => simplifyRelAlgNode(n));
        // } else if (node instanceof RelAlgRelationNode) {
        //     name = "RELATION";
        //     value = node.params[0].name;
    } else {
        return null;
    }

    return {
        id: id || 0,
        name,
        value,
        children
    }
}

export function simplifyPhysicalNode(node: PhysicalNode, id?: number) {
    let result = simplifyRelAlgNode(node);
    let children = (<any>node).children ? (<any>node).children.map(n => simplifyPhysicalNode(n)) : null;
    if (!result) {
        let value = node.toString();
        let name = node.constructor.name + " " + (<any>node).name;
        return {
            id: id || 0,
            name,
            value,
            children
        }
    } else {
        result.children = children;
    }
    return result;
}


