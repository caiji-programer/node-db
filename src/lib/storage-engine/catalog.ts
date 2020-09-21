import * as path from "path";
import * as fs from "fs";

import DBFile from "./db-file";
import { Table, Type, TupleDesc } from "../table";
import { ISCHEMA } from "../define";
import { BPTreeFile } from ".";
import { PageNodeParser } from "./page-node-parser";
import { createNewBPTreeFile } from "./bptree-file";
import StorageEngine from "./storage-engine";
import { TupleReader, KeyReader } from "./reader";


class FileRef {
    constructor() {

    }
    /** TODO B+树数据文件（暂时只有一种数据文件） */
    primaryFile: BPTreeFile<TupleReader>;
    /** TODO B+树索引文件（后面需要增加其他索引） */
    fileMap: Map<string, BPTreeFile<KeyReader>> = new Map<string, BPTreeFile<KeyReader>>();
    // getFile() {}

    /** 初始化该表的所有相关文件
     *  TODO 索引文件 也需要初始化
     */
    async initFiles() {
        await this.primaryFile.init();
        if (this.fileMap.size) {
            let promises: Promise<any>[] = []
            this.fileMap.forEach(f => promises.push(f.init()));
            await Promise.all(promises);
        }
        return
    }
}


export default class Catalog {
    constructor(schema: ISCHEMA) {
        this.schema = schema;
        this.id2Name = new Map<string, string>();
        this.id2Ref = new Map<string, FileRef>();
        this.name2Id = new Map<string, string>();
        this.name2Ref = new Map<string, FileRef>();
        // this.name2TupleDesc = new Map<string, TupleDesc>();
        this.name2Table = new Map<string, Table>();
    }

    schema: ISCHEMA;
    // id2Name: Map<string, string>;
    // id2File: Map<string, DBFile>;
    // name2Id: Map<string, string>;
    // name2File: Map<string, DBFile>;

    // name2TupleDesc: Map<string, TupleDesc>;
    name2Table: Map<string, Table>;

    id2Name: Map<string, string>;
    id2Ref: Map<string, FileRef>;

    id2File: Map<string, DBFile>;

    name2Id: Map<string, string>;
    name2Ref: Map<string, FileRef>;


    // 建立一个Table时，需要调用此方法建立映射
    /* addTable(name, file) {
        console.log("addTable ", name);
        if (name) {
            // TODO 表名重复了需要处理
            if (this.name2Id.has(name)) {
                return new Error("表名重复了");
            }
            let id = file.getFileId();
            this.id2Name.set(id, name);
            this.id2File.set(id, file);
            this.name2Id.set(name, id);
            this.name2File.set(name, file);
        } else {
            throw new Error("table id or name can be null")
        }
    } */

    /** TODO 建立目录 */
    // build(tables: Table[]) {
    async build(basePath: string, storage: StorageEngine) {
        // TODO
        await Promise.all(this.schema.tables.map(t => {
            // let ref = new FileRef();
            let desc = new TupleDesc(t.fields.map(f => {
                return {
                    type: Type.getType(f.fieldType),
                    name: f.fieldName
                }
            }));
            // this.name2TupleDesc.set(t.tableName, desc);

            let table = new Table(t.tableName, desc);
            let reader = new TupleReader(desc);
            let parser = new PageNodeParser<TupleReader>(reader);
            table.primaryKey = t.primaryKey;
            this.name2Table.set(t.tableName, table);
            // let filePath = path.resolve(basePath, t.tableName, `${t.primaryKey}.dat`);
            let dir = path.join(basePath, t.tableName);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir)
            }
            let filePath = path.resolve(dir, `${t.primaryKey}.dat`)
            // console.log(`BPTreeFile path: ${filePath}`);
            return createNewBPTreeFile(filePath, table).then(() => {

                let ref = new FileRef();
                ref.primaryFile = new BPTreeFile(filePath, parser, storage);
                // ref.primaryFile = file;
                let indexDir = path.join(dir, "index");
                if (!fs.existsSync(indexDir)) {
                    fs.mkdirSync(indexDir);
                }
                t.fields.forEach(field => {
                    if (field.hasIndex) {
                        let filePath = path.resolve(indexDir, `${field.fieldName}.dat`);
                        // TODO KeyReader
                        let parser = new PageNodeParser(new KeyReader());
                        let file = new BPTreeFile(filePath, parser, storage);
                        ref.fileMap.set(field.fieldName, file);
                    }
                })

                this.name2Ref.set(t.tableName, ref);
                return ref.initFiles()
            })

        }))

    }

    addFileRef(name, ref: FileRef) {

    }

    /** TODO 获取FileRef
     * @param name 
     */
    getFileRef(name): FileRef {
        return null;
    }

    getPrimaryFile(tableName: string) {
        let ref = this.name2Ref.get(tableName);
        return ref ? ref.primaryFile : null;
    }

    getIndexFile(tableName: string, fieldName: string) {
        let ref = this.name2Ref.get(tableName);
        if (!ref) return null;
        return ref.fileMap.get(fieldName);
    }

    getPrimaryKey(tableName: string) {
        let table = this.name2Table.get(tableName);
        if (table) {
            return table.primaryKey;
        }
        return null;
    }

    getDesc(tableName) {
        let table = this.name2Table.get(tableName);
        if (table) {
            return table.tupleDesc;
        }
        return null;
    }

}
