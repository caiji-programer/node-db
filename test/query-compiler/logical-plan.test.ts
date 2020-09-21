import { QueryCompiler } from "../../src/lib/query-compiler/query-compiler";
import { RelAlgOpType, RelAlgProjectNode, RelAlgSelectNode, RelAlgRelationNode, RelAlgCartProNode, RelAlgDistinctNode, RelAlgJoinNode } from "../../src/lib/query-compiler/relational-algebra"
import { LogicalPlan } from "../../src/lib/query-compiler/logical-plan";
import { SQLParser } from "../../src/lib/syntax-parser/parser";
import { inspector1 } from "../../src/lib/query-compiler/inspector-samples"
import { simplifyExpressionNode } from "../../src/lib/query-compiler/simplify-structure";

/** 扩展匹配器 */
expect.extend({
    /** 比较ExpressionNode，主要判断是否有关键字段 */
    toMatchExpressionNode(received, keys: string[]) {
        let str = simplifyExpressionNode(received), isPass = true, message;
        let notMatchKeys = keys.filter(key => !str.includes(key));
        if (notMatchKeys.length) {
            isPass = false;
            message = `ExpressionNode has not ${notMatchKeys.join(",")}`;
        } else {
            isPass = true;
            message = `ExpressionNode has ${keys.join(",")}`;
        }
        return {
            pass: isPass,
            message: () => message
        };
    }
})

const newExpect: any = expect;

const compiler: QueryCompiler = new QueryCompiler(inspector1);

/** 
 * 这个文件里的测试用例 《表达式》 部分不作比较了
 * 相关的测试用例在 syntax-parser/parser.test.ts 和 syntax-parser/expression.test.ts
 */

const testCases = [
    /* {
        input: "select salary from instructor where salary < 10000;",
        calculate: () => {
            let preCalculationNodes = [];
            let primary = new RelAlgProjectNode(
                [["salary"]],
                new RelAlgSelectNode(
                    // 表达式不作比较
                    expect.anything(),
                    new RelAlgRelationNode({
                        name: "instructor"
                    })
                )
            )
            return { preCalculationNodes, primary };
        }
    }, */
    // 非相关子查询
    {
        input: "select movieTitle from StarsIn where starName in (select name from MovieStar where birthdate like '%1960')",
        calculate: () => {
            let preCalculationNodes = [];
            let primary = new RelAlgProjectNode(
                [["movieTitle"]],
                new RelAlgSelectNode(
                    // expect.anything(),
                    // (<any>expect).toMatchExpressionNode(["name", "starName"]),
                    newExpect.toMatchExpressionNode(["name", "starName"]),
                    new RelAlgCartProNode([
                        new RelAlgRelationNode({
                            name: "StarsIn"
                        }),
                        new RelAlgDistinctNode(
                            new RelAlgProjectNode(
                                [["name"]],
                                new RelAlgSelectNode(
                                    // expect.anything(),
                                    newExpect.toMatchExpressionNode(["birthdate", "%1960"]),
                                    new RelAlgRelationNode(
                                        {
                                            name: "MovieStar"
                                        }
                                    )
                                )
                            )
                        ),
                    ])
                )
            )
            return { preCalculationNodes, primary };
        }
    },
    {
        input: `SELECT department_name FROM departments d, (
                select t1.aaa from table1 t1 join table2 t2 on t1.id = t2.id join (
                    select id, ccc from table3 where id = (select id from table4 where name = "Jack")
                ) t3 on t1.id = t3.id where t1.aaa < (select eee from table5 where id = 2000)
            ) e WHERE d.department_id IN( SELECT did FROM employees);`,
        calculate: () => {
            let preCalculationNodes = [
                new RelAlgProjectNode(
                    [["id"]],
                    new RelAlgSelectNode(
                        expect.anything(),
                        new RelAlgRelationNode({
                            name: "table4"
                        })
                    )
                ),
                new RelAlgProjectNode(
                    [["eee"]],
                    new RelAlgSelectNode(
                        expect.anything(),
                        new RelAlgRelationNode({
                            name: "table5"
                        })
                    )
                )
            ];
            let primary = new RelAlgProjectNode(
                [["department_name"]],
                new RelAlgSelectNode(
                    expect.anything(),
                    new RelAlgCartProNode([
                        new RelAlgCartProNode([
                            new RelAlgRelationNode({
                                name: "departments"
                            }),
                            new RelAlgProjectNode(
                                [expect.arrayContaining(["aaa"])],
                                new RelAlgSelectNode(
                                    expect.anything(),
                                    new RelAlgJoinNode(
                                        [expect.arrayContaining(["id"]), expect.arrayContaining(["id"])],
                                        [
                                            new RelAlgJoinNode(
                                                [expect.arrayContaining(["id"]), expect.arrayContaining(["id"])],
                                                [new RelAlgRelationNode({
                                                    name: "table1"
                                                }),
                                                new RelAlgRelationNode({
                                                    name: "table2"
                                                })],
                                            ),
                                            new RelAlgProjectNode(
                                                [["id"], ["ccc"]],
                                                new RelAlgSelectNode(
                                                    expect.anything(),
                                                    new RelAlgRelationNode({
                                                        name: "table3"
                                                    })
                                                )
                                            )
                                        ]

                                    )
                                )
                            )
                        ]),
                        new RelAlgDistinctNode(
                            new RelAlgProjectNode(
                                [["did"]],
                                new RelAlgRelationNode({
                                    name: "employees"
                                })
                            )
                        )
                    ])
                )
            );
            return { preCalculationNodes, primary };
        }
    },
    // 相关子查询
    {
        // input: `SELECT department_name FROM departments d WHERE EXISTS(
        //         SELECT * FROM employees e WHERE d.department_id=e.did AND 200<e.id
        //     ) AND 100<d.location_id;`,

        input: `SELECT department_name FROM departments d WHERE EXISTS(
                SELECT * FROM employees e WHERE d.department_id=e.did AND 200<e.id
                ) AND 100<d.location_id;`,
        calculate: () => {
            let preCalculationNodes = [];
            let primary = new RelAlgProjectNode(
                [["department_name"]],
                new RelAlgSelectNode(
                    // expect.anything(),
                    newExpect.toMatchExpressionNode(["d.location_id"]),
                    new RelAlgSelectNode(
                        // expect.anything(),
                        newExpect.toMatchExpressionNode(["d.department_id", "e.did"]),
                        new RelAlgCartProNode([
                            new RelAlgRelationNode({
                                name: "departments",
                                alias: "d"
                            }),
                            new RelAlgSelectNode(
                                // expect.anything(),
                                newExpect.toMatchExpressionNode(["e.id"]),
                                new RelAlgRelationNode({
                                    name: "employees",
                                    alias: "e"
                                })
                            )
                        ])
                    )
                )
            );
            return { preCalculationNodes, primary }
        }
    }

    /*
    {
        input: "select s1 from t1 where s1 > any (select s1 from t2);",
        calculate: () => {
            let preCalculationNodes = [];
            let primary = {}
            return { preCalculationNodes, primary };
        }
    }
    */
]


describe('Test: lib/logical-plan.ts', () => {
    testCases.forEach(testCase => {
        
        let expPlan = testCase.calculate();
        let plan = compiler.generateLogicalPlan(testCase.input);

        test(`generate logical plan: ${testCase.input}`, () => {
            expect(plan.preCalculationNodes).toMatchObject(expPlan.preCalculationNodes);
            // expect(plan.primary).toEqual(expPlan.primary);
            expect(plan.primary).toMatchObject(expPlan.primary);
        });
    });
});
