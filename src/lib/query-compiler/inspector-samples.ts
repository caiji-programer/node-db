import { RelationAttrInspector } from "./query-compiler";
import { Relation } from "./relational-algebra";

/** 
 * RelationAttrInspector的测试样本
 */

const departments = new Relation("departments", ["department_name", "department_id", "location_id"]);
const employees = new Relation("employees", ["id", "did", "age", "name", "last_name", "job-id", "salary"]);

const instructor = new Relation("instructor", []);

const StarsIn = new Relation("StarsIn", ["id", "starName", "movieTitle"]);
const MovieStar = new Relation("MovieStar", ["id", "name", "birthdate"]);

const table1 = new Relation("table1", ["id", "name", "aaa"]);
const table2 = new Relation("table2", ["id", "name", "bbb"]);
const table3 = new Relation("table3", ["id", "name", "ccc"]);
const table4 = new Relation("table4", ["id", "name", "ddd"]);
const table5 = new Relation("table5", ["id", "name", "eee"]);

/** departments & employees */
const inspector1 =  new RelationAttrInspector([departments, employees, table1, table2, table3, table4, table5, StarsIn, MovieStar]);



export {
    inspector1,
}