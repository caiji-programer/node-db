
import * as express from "express";
import * as bodyParser from "body-parser";
import * as chalk from "chalk";

import { Response, IQueryResponse, ILogicalPlan, IPlanNode } from "./inter";
import { simplifyRelAlgNode } from "../lib/query-compiler/simplify-structure";
import { QueryCompiler } from "../lib/query-compiler/query-compiler";
import { inspector1 } from "../lib/query-compiler/inspector-samples"

const app = express();
// const compiler = new QueryCompiler(inspector1);
const compiler = new QueryCompiler(null);

app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Content-type');
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS,PATCH");
    res.header('Access-Control-Max-Age', "1728000");//预请求缓存20天
    next();
});
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

app.listen(8888, () => {
    console.log('App listening on port 8888.');
    console.log(chalk.green('Server has started!'));
});

app.post('/', (req, res, next) => {

    let query = req.body.query;
    if (query) {
        try {
            console.log(chalk.green(`${new Date().toISOString()} : `));
            console.log(`generate logical plan: ${query} \n\n`);
            let plan = compiler.generateLogicalPlan(query);
            let lPlan: ILogicalPlan = {
                pre: plan.subPlans.map((node, index) => simplifyRelAlgNode(node, index)),
                primary: simplifyRelAlgNode(plan.primary, plan.subPlans.length)
            }
            let data: IQueryResponse = {
                plan: lPlan,
                result: null
            }
            return res.json(new Response(1, "Success", data));

        } catch (e) {
            return res.json(new Response(0, `Parse SQL ERROR: ${e.message}`, null));

        }

    } else {
        return res.json(new Response(0, "Miss param: query", null));

    }
});

app.get('/', (req, res, next) => {
    res.send("Hello World");
});



