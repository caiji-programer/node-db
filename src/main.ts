import { EventEmitter } from "events"
import * as readline from "readline";
import * as chalk from "chalk";
import * as clear from "clear";

import NodeDB from "./node-db";
import Util from "./util";
import { Table } from "./lib/table";


async function run() {
    // 清除屏幕
    clear();
    console.log(chalk.green('SimpleSql start... '));

    const db = new NodeDB({
        dbPath: "storage-files",
        dbName: "default",
        schemaFile: "schema.json"
    });

    await db.init();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const emitter = new EventEmitter();
    const sqls: string[] = [];

    emitter.on("input", async () => {
        let sql: string;
        while (sql = sqls.shift()) {
            rl.pause();
            console.log(`执行语句：${sql}`);
            try {
                let data = await db.command(sql);
                if (data && data.result) {
                    if (typeof data.result === "number") {
                        console.log(chalk.green(`${data.result} rows affected.`));
                    } else if (data.result instanceof Table) {
                        // print
                        Util.printTable(data.result);
                    } else {
                        let err: never;
                    }
                }
            } catch (e) {
                console.error(`执行语句 ${sql} 出现了错误：`);
                console.error(e.message);
            }
            rl.resume();
        }
    })

    rl.on('line', (input: string) => {
        // console.log(`input: ${input}`);
        let sql: string = input.trim();
        sqls.push(sql);
        emitter.emit("input", sql);
    });

}

run();
