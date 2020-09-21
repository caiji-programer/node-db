import * as chalk from "chalk";

import { Table, Type, Field, Tuple } from "src/lib/table";
import stringify from "./stringify-util";

// 打印的相关配置
const printConfig = {
    fieldContactLength: 3,
    // 字段拼接的分割字符串
    fieldContactString: " | ",
    // 
    leftBlankSpace: "    ",
    // INT 类型字段长度
    intLength: 10,
    // STRING 类型字段长度
    stringLength: 30
}

function getHorizontalLine(types: Type[]) {
    let line = "";
    if (types && types.length) {
        types.forEach((type: Type) => {
            line += "+-"
            if (type === Type.NUMBER) {
                line += stringify.generateRepeatString(printConfig.intLength, "-");
            } else if (type === Type.STRING) {
                line += stringify.generateRepeatString(printConfig.stringLength, "-");
            }
            line += "-";
        })
        line += "+";
    }
    return line;
}

function  printTableHeader(table: Table, paddingLeft: string) {
    let printMessage = "",
        items = table.tupleDesc.tdItems,
        len: number = items.length;
    items.forEach((item, i: number) => {
        if (item.type === Type.NUMBER) {
            printMessage += stringify.alignString(item.name, printConfig.intLength);
        } else if (item.type === Type.STRING) {
            printMessage += stringify.alignString(item.name, printConfig.stringLength);
        }
        if (i < (len - 1)) {
            printMessage += printConfig.fieldContactString
        }
    })
    printMessage = (paddingLeft || "") + "| " + printMessage + " |";
    console.log(printMessage);
}

// Tuple 转换成字符串，用于打印
function getTupleToString(tuple: Tuple): string {
    let str = "", len = tuple.fields.length;
    tuple.fields.forEach((field, i) => {
        if (field.type === Type.NUMBER) {
            str += stringify.alignString(String(field.value), printConfig.intLength);
        } else if (field.type === Type.STRING) {
            str += stringify.alignString(field.value, printConfig.stringLength);
        }
        if (i < (len - 1)) {
            str += printConfig.fieldContactString
        }
    })
    return "| " + str + " |";
}


export function printTable(table: Table, printLineNum?: number) {
    if (table && table.tuples && table.tuples.length) {
        console.log(chalk.green(`\n\n${stringify.generateRepeatString(45, "-")} Table ${table.name} ${stringify.generateRepeatString(45, "-")}\n`));
        //
        let space = printConfig.leftBlankSpace;
        let printMessage = "";

        let types: Type[] = table.tupleDesc.tdItems.map((item) => item.type);
        // let horizontalLine = space + getHorizontalLine(head) + "\n";
        let horizontalLine = space + getHorizontalLine(types) + "\n";

        console.log(horizontalLine);
        printTableHeader(table, space);

        printMessage += horizontalLine;

        printLineNum = printLineNum || table.tuples.length;

        for (let index = 0; index < table.tuples.length; index++) {
            let tuple = table.tuples[index];
            printMessage += (space + getTupleToString(tuple) + "\n");
            printMessage += horizontalLine;

        }

        console.log(printMessage);

        if (printLineNum && table.tuples.length > printLineNum) {
            console.log(chalk.yellow(`${space}Total ${table.tuples.length} lines , but only print ${printLineNum} lines...\n\n\n`));
        }
    } else {
        console.log(" No match data! ");
    }
}

// export default printTable;