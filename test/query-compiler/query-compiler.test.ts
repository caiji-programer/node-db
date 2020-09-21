import { SQLParser } from "../../src/lib/syntax-parser/parser";
import { QueryCompiler } from "../../src/lib/query-compiler/query-compiler";
import { inspector1 } from "../../src/lib/query-compiler/inspector-samples";


const testCases = [
    {
        input: "select movieTitle from StarsIn where starName in (select name from MovieStar where birthdate like '%1960')",
        isError: false,
        matchers: [],
    },
    {
        input: "select salary from instructor where salary < 10000;",
        isError: true,
        matchers: ["instructor", "salary"],
    },
    {
        input: "select s1 from t1 where s1 > (select s1 from t2 where id = 1);",
        isError: true,
        matchers: ["s1", "t1", "t2", "id"],
    },
    {
        input: `SELECT department_n FROM departments d WHERE EXISTS(SELECT * FROM employee e WHERE d.department_did=e.d_id);`,
        isError: true,
        matchers: ["department_n", "employee", "department_did", "d_id"],
    },
    {
        input: `SELECT departmentName FROM departments d, (
                select t1.bbb from table1 t1 join tab2 t2 on t1.id = t2.id join (
                    select id, ccc from table3 where id = 1000
                ) t3 on t1.id = t3.d_id 
            ) e WHERE d.department_id IN( SELECT did FROM employee);`,
        isError: true,
        matchers: ["departmentName", "bbb", "tab2", "id", "d_id", "employee"],
    },
    // {
    //     input: "",
    //     isError: false,
    //     matchers: [],
    // }
]

let compiler = new QueryCompiler(inspector1);

describe('Test: lib/query-compiler.ts', () => {

    testCases.forEach(testCase => {
        // console.log(testCase.input);
        let parser = new SQLParser(testCase.input);
        test(`test pretreatment(): ${testCase.input}`, () => {
            try {
                compiler.pretreatment(parser);

            } catch (e) {
                if (testCase.isError) {
                    let exp = expect(() => { throw e });
                    testCase.matchers.forEach(m => {
                        exp.toThrowError(m)
                    })

                } else {
                    expect(testCase.isError).toBeTruthy()
                }
            }
        })
    });
});