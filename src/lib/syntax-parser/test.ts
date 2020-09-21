import Lexer from "./lexer";
import { SQLParser } from "./parser";
import { Token, TokenType } from "./token";
import { ExpressionAtom, ExpressionNode, ExpressionLeafNode, ExpressionInternalNode } from "./expression";


// Test lexer.ts
/*
let data = require("./sql.json").data;

data.forEach(str => {
    let lexer = new Lexer(str);
    let tokens = lexer.getTokens();
    console.log(`sql: ${str}`);
    console.log(tokens);
});
*/

// Test parser.ts
// /*
let str = "SELECT a.runoob_id, a.runoob_author, b.runoob_count FROM runoob_tbl a INNER JOIN tcount_tbl b ON a.runoob_author = b.runoob_author;";

let arr = [
    
    /* "select salary from instructor where salary < 10000;",
    // "SELECT runoob_id, runoob_title, runoob_author, submission_date FROM runoob_tbl",
    // "SELECT * from runoob_tbl WHERE runoob_author='菜鸟教程';",
    "SELECT runoob_id, runoob_title, runoob_author, submission_date FROM runoob_tbl WHERE runoob_id = 100 ORDER BY  submission_date ASC",

    "SELECT movieTitle FROM StarsIn WHERE starName IN (SELECT name FROM MovieStar WHERE birthdate LIKE '%1960')",
    // "SELECT a.runoob_id, a.runoob_author, b.runoob_count FROM runoob_tbl a, tcount_tbl b WHERE a.runoob_author = b.runoob_author;",
    
    `SELECT a.runoob_id, a.runoob_author, b.runoob_count, runoob_field_e FROM (
        select runoob_field_a, temp_A.id, runoob_field_b from (
            select runoob_field_c, runoob_field_d from runoob_active where num > 2000
        ) temp_A, runoob_art where temp_A.id > 100
    ) temp_B, runoob_tbl a INNER JOIN tcount_tbl b ON a.runoob_author = b.runoob_author;`,
    "SELECT a.runoob_id, a.runoob_author, b.runoob_count FROM runoob_tbl a INNER JOIN tcount_tbl b ON a.runoob_author = b.runoob_author;" */
    // `INSERT INTO table_name ( field1, field2, fieldN ) VALUES ( "value1", "value2", "valueN" );`,
    `UPDATE table_name SET field1="value1", field2="value2" WHERE id = 222; `,
    `UPDATE table_name SET field1=field1+1, field2=field2+1 WHERE id = 222; `,
    `DELETE FROM table_name WHERE id = 222;`,
    // ``,
];

arr.forEach(sql => {
    // let result = new SQLParser().parse(sql);
    let result = new SQLParser(sql);
    console.log(result);
});

console.log("end...");
// */



function printTree(node) {

    let i = 0;
    let getVariable = () => {
        i++;
        return "A" + i;
    }

    let loop = (node) => {
        // 内部节点
        if (node.children && node.children.length) {
            let childrenResult = node.children.map(n => {
                return loop(n);
            });
            let v = getVariable();
            console.log(`${v} = ${node.op.type} (${childrenResult.join("), (")})`);
            return v;
        } else {
            let val = node.value;
            if (val) {
                if (val.value) return val.value.toString();
                return val.toString();
            } else {
                return "null value";
            }
        }
    }
    console.log("--------------print-------------");
    loop(node);
    console.log("--------------------------------");
}
