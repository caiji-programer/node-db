import Tuple from "./tuple";
import TupleDesc from "./tuple-desc";

export class Table {
    constructor(name, tupleDesc, tuples?) {
        this.name = name;
        this.tupleDesc = tupleDesc;
        if (tuples) {
            this.tuples = tuples;
        }
    }

    // 主键
    private _primaryKey?: string;

    set primaryKey(val) {
        // TODO 需要判断是否有该字段；
        this._primaryKey = val;
    }

    get primaryKey() {
        return this._primaryKey;
    }

    name: string;

    tupleDesc: TupleDesc;

    tuples: Tuple[];

    // fileName: string;

}


/** 表字段检查器 */
export class TableFieldInspector {

    constructor(tables: Table[]) {
        this.tableMap = new Map<string, Table>();
        tables.forEach(table => {
            this.tableMap.set(table.name, table);
        })
    }

    tableMap: Map<string, Table>;

    /** 是否存在表@tableName */
    hasTable(tableName: string): boolean {
        return this.tableMap.has(tableName);
    }

    /** 表@tableName 里是否有字段@fieldName */
    hasField(tableName: string, fieldName: string) {
        let table = this.tableMap.get(tableName);
        if (table) {
            return table.tupleDesc.hasField(fieldName);
        }
        return false;
    }

}
