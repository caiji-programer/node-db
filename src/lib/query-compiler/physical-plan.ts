import { LogicalPlan, RelationNode, LogicalNode } from "./logical-plan";
import { traversal, replace } from "../traversal";
import { INODE } from "../define";
import { RelAlgNode, RelAlgOpType, RelAlgSelectNode } from "./relational-algebra";
import { ExpressionNode } from "../syntax-parser";


// type RelAlgNodeOrPhysicalOpNode = RelAlgNode | PhysicalOpNode;

// type PhysicalOpNode = {} & INODE;


export type PhysicalNode = RelAlgNode<ScanNode>;

// TODO implements
export class ScanNode implements INODE {
    constructor(name: string, conditions?: ExpressionNode[]) {
        this.name = name;
        this.conditions = conditions
    }
    name: string;
    conditions: ExpressionNode[];
    parent: PhysicalNode
}



// TODO 此类已经改了
class PhysicalPlan {

    constructor(plan: LogicalPlan) {
        console.log(plan);

        plan.preCalculationNodes.forEach((node: LogicalNode) => {
            this.items.push({
                selectType: SelectType.SUBQUERY,
                node: this.relationNode2ScanNode(node)
            })
        })

        this.items.push({
            selectType: SelectType.PRIMARY,
            node: this.relationNode2ScanNode(plan.primary)
        })
    }


    items: IPhysicalItem[] = [];

    relationNode2ScanNode(relNode: LogicalNode): PhysicalNode {
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

                        let conditions = parent.params;
                        newNode = new ScanNode(relName, conditions);
                        // TODO 需要处理排序
                        // newNode = new PhysicalOpNode(new SortScan());
                        
                        // TODO 子树都不要了
                        replace<PhysicalNode>(parent, newNode);

                    } else {
                        // 全表扫描
                        newNode = new ScanNode(relName);

                        // TODO 子树都不要了
                        replace<PhysicalNode>(node, newNode);
                    }

                } else {
                    result = new ScanNode(relName);

                }
            }
        })
        return result;
    }

    async run() {

    }

}

interface IPhysicalItem {
    selectType: SelectType;
    node: PhysicalNode;
}

enum SelectType { PRIMARY, SUBQUERY };


// type PhysicalOpNode = JoinOpNode | TableScan ;

/** 物理运算符迭代器（抽象类） */
abstract class OpIterator {
    constructor() { }
    open() { }
    next() { }
    close() { }
}

/** 物理运算符节点 */
type PhysicalOpNode = OpIterator & INODE;


/** 全表扫描（对应 RelAlgRelationNode ） */
class PhysicalTableScanNode implements PhysicalOpNode {
    constructor(name) {

    }
    parent;
    open(): void {
        throw new Error("Method not implemented.");
    }
    next(): void {
        throw new Error("Method not implemented.");
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}

/** 索引扫描（对应一个 RelAlgSelectNode 和 RelAlgRelationNode ） */
class PhysicalIndexScanNode implements OpIterator {
    constructor(name) {

    }
    parent;
    open(): void {
        throw new Error("Method not implemented.");
    }
    next(): void {
        throw new Error("Method not implemented.");
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}

// TODO
/** 排序扫描（对应一个RelAlgRelationNode） */
class PhysicalSortScanNode implements OpIterator {
    constructor() {

    }
    parent;
    open(): void {
        throw new Error("Method not implemented.");
    }
    next(): void {
        throw new Error("Method not implemented.");
    }
    close(): void {
        throw new Error("Method not implemented.");
    }
}


/** 投影（对应 RelAlgProjectNode ） */
class PhysicalProjectNode implements PhysicalOpNode {
    parent;
    children;
    open() {

    }
    next() {

    }
    close() {

    }
}

/** 选择（对应 RelAlgSelectNode ） */
class PhysicalSelectNode implements PhysicalOpNode {
    parent;
    children;
    open() {

    }
    next() {

    }
    close() {

    }
}

/** 去重复（对应 RelAlgDistinctNode ） */
class PhysicalDistinctNode implements PhysicalOpNode {
    parent;
    children;
    open() {

    }
    next() {

    }
    close() {

    }
}

/** 连接（对应 RelAlgJoinNode ） */
class PhysicalJoinNode implements PhysicalOpNode {
    parent;
    children;
    open() {

    }
    next() {

    }
    close() {

    }
}

/** 笛卡尔积（对应 RelAlgCartProNode ） */
class PhysicalCartProNode implements PhysicalOpNode {
    parent;
    children;
    open() {

    }
    next() {

    }
    close() {

    }
}


export {
    PhysicalPlan,
    PhysicalOpNode,
    /* PhysicalTableScanNode,
    PhysicalIndexScanNode,
    PhysicalSortScanNode,
    PhysicalProjectNode,
    PhysicalSelectNode,
    PhysicalDistinctNode,
    PhysicalJoinNode,
    PhysicalCartProNode */
}

// 关于执行查询计划有两种：
// 1. 物化
// 2. 流水操作
// TODO 衡量两种方式的代价，在做选择
function execPlan() {

}


