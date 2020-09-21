import * as chalk from "chalk";
import * as clear from "clear";

import NodeDB from "./node-db";
import createServer from "./server/create-server";
import { Response } from "./server/inter";
import { PhysicalNode, PhysicalPlan } from "./lib/query-compiler";
import { Table } from "./lib/table";
import { simplifyPhysicalNode } from "./lib/query-compiler/simplify-structure";

// TODO
function simplePlan(plan: PhysicalPlan, id?: number) {
    return {
        primary: simplifyPhysicalNode(plan.primary, id),
        subPlans: plan.subPlans.map((node, i) => simplePlan(node, i + id + 1))
    }
}

// 
function transfromTable(table: Table) {
    if (table instanceof Table) {
        let columns = table.tupleDesc.tdItems.map(item => item.name);
        let rows = table.tuples.map(t => {
            let obj = {};
            t.fields.forEach(field => {
                obj[field.name] = field.value;
            })
            return obj;
        })
        return {
            name: table.name,
            columns,
            rows
        }
    } else {
        return null;
    }
}

async function run() {
    // 清除屏幕
    clear();
    console.log(chalk.green('NodeDB start... '));

    const db = new NodeDB({
        dbPath: "storage-files",
        dbName: "default",
        schemaFile: "schema.json"
    });

    await db.init();

    const app = createServer(8888);

    app.post('/', async (req, res, next) => {

        let query: string = req.body.query || "";
        query = query.trim();
        if (query) {
            try {
                console.log(chalk.green(`${new Date().toISOString()} : `));
                console.log(`query: ${query} \n\n`);
                let r = await db.command(query);
                let data = {
                    ast: r.ast,
                    plan: simplePlan(r.plan),
                    result: r.result instanceof Table ? transfromTable(r.result): `${r.result} rows affected.`
                };
                return res.json(new Response(1, "Success", data));

            } catch (e) {
                console.error(`${e.message}: ${e.stack}`)
                return res.json(new Response(0, `ERROR: ${e.message}`, null));

            }

        } else {
            return res.json(new Response(0, "Miss param: query", null));

        }
    });

    app.get('/schema', (req, res, next,) => {
        let schema = db.engine.catalog.schema;
        let data = schema.tables.map(t => {
            // t.autoIncrement
            return {
                name: t.tableName,
                primaryKey: t.primaryKey,
                fields: t.fields.map(f => `${f.fieldName}(${f.fieldType})`).join(" | ")
            }
        })
        return res.json(new Response(1, "Success", data));
    })

    app.get('/', (req, res, next) => {
        res.send("Hello World");
    });

}

/**
    select * from t;
    select * from t where id <= 20 and 10 <= id;
    select * from t where id = 2;
    select * from t where id between 30 and 34;

    delete from t where id = 0;
    delete from t where id < 20 or id > 50;
    delete from t where id between 30 and 34;

    insert into t (name, id) values('', );
    insert into t (name, id) values('70_70', 70),('71_71', 71);
    insert into t1 (desc, id, t_id) values('desc_0000', 0, 1),("desc_1111", 1, 2);

    update t set name = "00" where id = 0;
    update t set name = name + id + 1 where id < 10;
    update t set name = "__" + id where name like "name";
    update t set name = "00" where name like "name";

    select * from t,t1 where t.id = t1.t_id;
    select * from t join t1 on t.id = t1.t_id where t1.id <3;
 */

run();
