//     syntaxParser         translator
// sql  --->    查询表达式树    --->    逻辑查询计划树  --->    物理查询计划树 
//                                      (代数表达式)              

import { SQLParser } from "../syntax-parser/parser";
import { Relation } from "./relational-algebra";
// import { LogicalPlan } from "./logical-plan";
// import { PhysicalPlan } from "./physical-plan";
import { TableFieldInspector } from "../table";
import { LogicalPlan } from "./plan";

export class QueryCompiler {
    // constructor(inspector?: RelationAttrInspector) {
    constructor(inspector?: TableFieldInspector) {
        this.inspector = inspector;
        // this.parser = new SQLParser();
    }

    // parser: SQLParser

    inspector: TableFieldInspector

    generateAST(sql: string) {
        try {
            let parser = new SQLParser(sql);
            let ast = parser.ast;
            return ast;
        } catch (e) {
            throw e;
        }
    }

    /** 预处理（语义检查） */
    // preProcess()  {
    pretreatment(parser: SQLParser) {

        let errors: Error[] = [];
        // 1、检查关系的使用
        // let names = Array.from(parser.ref.relation.values()).map(relation => relation.name);
        // names.forEach(name => {
        parser.ref.relation.forEach((relation, key) => {
            if (!this.inspector.hasTable(relation.name)) {
                errors.push(new Error(`关系 '${relation.name}' 不存在！`));
            }
        })
        // 2、检查并解析属性的使用 
        parser.ref.attr.forEach((names, attr) => {
            let attrName: string = attr.length === 1 ? attr[0] : attr[1];
            let relNames = parser.ref.transfromRelations(names);
            relNames = relNames.filter(name => this.inspector.hasField(name, attrName));
            if (relNames.length === 1) {
                // TODO
                parser.ref.attr.set(attr, relNames);
            } else if (relNames.length === 0) {
                errors.push(new Error(`关系'${names.join(",")}'不存在属性${attrName}！`));
            } else {
                // TODO
                errors.push(new Error("多个关系都有此属性！"));
            }
        })

        // 3、TODO 检查类型

        if (errors.length) {
            throw new Error(`SQL Semantics Checking Error: ${errors.map(e => e.message).join("\n")}`)
        }

    }

    /** 语义检查后，生成一个逻辑查询计划 */
    generateLogicalPlan(sql: string) {
        let parser = new SQLParser(sql);
        this.pretreatment(parser);
        let plan = new LogicalPlan(parser.ast, parser.ref);
        return plan;
    }

    /** 语义检查后，生成一个物理查询计划 */
    generatePhysicalPlan(sql: string) {
        // let ast = this.generateAST(sql);
        let parser = new SQLParser(sql);
        // TODO 先跳过
        this.pretreatment(parser);
        // let logicalPlan = new LogicalPlan(parser);
        let logicalPlan = new LogicalPlan(parser.ast, parser.ref);
        // let physicalPlan = new PhysicalPlan(logicalPlan);
        let physicalPlan = logicalPlan.toPhysicalPlan();
        return physicalPlan;
    }

}

/** 
 *  TODO Delete 已经用TableFieldInspector代替；
 *  关系属性检查器：检查关系，属性等等；
 */
export class RelationAttrInspector {
    constructor(relations: Relation[]) {
        this.relationMap = new Map<string, Relation>();
        relations.forEach(rel => {
            this.relationMap.set(rel.name, rel);
        })
    }

    relationMap: Map<string, Relation>;

    /** 是否存在关系@relationName */
    hasRelation(relationName: string): boolean {
        return this.relationMap.has(relationName);
    }

    /** 关系@relationName 里是否有属性@attr */
    hasAttr(relationName: string, attr: string) {
        let rel = this.relationMap.get(relationName);
        if (rel) {
            return rel.hasAttr(attr);
        }
        return false;
    }

}
