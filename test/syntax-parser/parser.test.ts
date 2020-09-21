import { SQLParser } from "../../src/lib/syntax-parser/parser";
import { Operator, OperatorType, ExpressionAtom, ExpressionLeafNode, ExpressionInternalNode, ExpressionNode } from "../../src/lib/syntax-parser/expression";


let selectTestCases = [

    {
        input: "SELECT runoob_id, runoob_title, runoob_author, submission_date FROM runoob_tbl WHERE runoob_id = 100 ORDER BY  submission_date ASC",
        reference: {
            attr: ["runoob_id", "runoob_title", "runoob_author", "submission_date"],
            relation: ["runoob_tbl"],
            tempRelation: []
        },
        getAST: () => {
            return {
                selectElements: [["runoob_id"], ["runoob_title"], ["runoob_author"], ["submission_date"]],
                tableSources: [{
                    joins: [],
                    table: {
                        name: "runoob_tbl"
                    }
                }],
                where: new ExpressionInternalNode(
                    new Operator(OperatorType.EQ, "="),
                    [
                        new ExpressionLeafNode(ExpressionAtom.ATTR, ["runoob_id"]),
                        new ExpressionLeafNode(ExpressionAtom.CONSTANT, "100")
                    ]
                ),
                orderBy: { attr: ["submission_date"], type: 1 }
            }
        },
    },
    {
        input: "SELECT movieTitle FROM StarsIn WHERE starName IN (SELECT name FROM MovieStar WHERE birthdate LIKE '%1960')",
        reference: {
            attr: ["movieTitle", "starName", "name", "birthdate"],
            relation: ["StarsIn", "MovieStar"],
            tempRelation: []
        },
        getAST: () => {
            return {
                selectElements: [["movieTitle"]],
                tableSources: [
                    {
                        table: { name: "StarsIn" },
                        joins: []
                    }
                ],
                where: new ExpressionInternalNode(
                    new Operator(OperatorType.IN, "IN"),
                    [
                        new ExpressionLeafNode(ExpressionAtom.ATTR, ["starName"]),
                        new ExpressionLeafNode(ExpressionAtom.SUB_QUERY, {
                            selectElements: [["name"]],
                            tableSources: [{
                                joins: [],
                                table: { name: "MovieStar" }
                            }],
                            where: new ExpressionInternalNode(
                                new Operator(OperatorType.LIKE, "LIKE"),
                                [
                                    new ExpressionLeafNode(ExpressionAtom.ATTR, ["birthdate"]),
                                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, "%1960")
                                ]
                            ),
                            orderBy: null
                        }),
                    ]
                ),
                orderBy: null
            }
        }
    },
    {
        input: "SELECT a.runoob_id, a.runoob_author, b.runoob_count FROM runoob_tbl a INNER JOIN tcount_tbl b ON a.runoob_author = b.runoob_author;",
        reference: {
            attr: ["runoob_id", "runoob_author", "runoob_count"],
            relation: ["runoob_tbl", "a", "tcount_tbl", "b"],
            tempRelation: []
        },
        getAST: () => {
            return {
                selectElements: [["a", "runoob_id"], ["a", "runoob_author"], ["b", "runoob_count"]],
                tableSources: [
                    {
                        table: {
                            name: "runoob_tbl",
                            alias: "a",
                        },
                        joins: [
                            {
                                type: 0,
                                table: { name: "tcount_tbl", alias: "b" },
                                condition: new ExpressionInternalNode(
                                    new Operator(OperatorType.EQ, "="),
                                    [
                                        new ExpressionLeafNode(ExpressionAtom.ATTR, ["a", "runoob_author"]),
                                        new ExpressionLeafNode(ExpressionAtom.ATTR, ["b", "runoob_author"])
                                    ]
                                )
                            }
                        ]
                    }
                ],
                where: null,
                orderBy: null
            }
        }
    }
];
describe('Test: lib/syntax-parser/parser.ts; selectStatements:', () => {
    selectTestCases.forEach(testCase => {
        let parser = new SQLParser(testCase.input);
        let ref = parser.ref;
        let exp = testCase.getAST();
        test(`parse: ${testCase.input}`, () => {
            // 比较AST
            expect(parser.ast).toEqual(exp);
            // 属性
            let attr = Array.from(ref.attr.keys()).map(attr => attr.pop());
            expect(attr).toEqual(expect.arrayContaining(testCase.reference.attr));
            expect(testCase.reference.attr).toEqual(expect.arrayContaining(attr));
            // 关系
            let relNames = Array.from(ref.relation.keys()).map(relName => relName);
            expect(relNames).toEqual(expect.arrayContaining(testCase.reference.relation));
            expect(testCase.reference.relation).toEqual(expect.arrayContaining(relNames));
            // 临时关系
            relNames = Array.from(ref.tempRelation.keys()).map(relName => relName);
            expect(relNames).toEqual(expect.arrayContaining(testCase.reference.tempRelation));
            expect(testCase.reference.tempRelation).toEqual(expect.arrayContaining(relNames));
        });
    });
})

// 
let insertTestCases = [

]
describe('Test: lib/syntax-parser/parser.ts; insertStatements:', () => {
    insertTestCases.forEach(testCase => {
        let parser = new SQLParser(testCase.input);
        let result = parser.ast;
        test(`parse: ${testCase.input}`, () => {
            expect(true).toEqual(true);
        })
    })
})

// 
