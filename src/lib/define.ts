// 全局声明的类型

/** SCHEMA（概要/模式）数据结构 */
export interface ISCHEMA {
	dbName: string
	creator?: string
	createTime: string
	tables: {
		tableName: string
		fields: {
			fieldName: string
            fieldType: string
            hasIndex?: boolean
		}[]
		primaryKey: string
		autoIncrement: boolean
	}[]
}

/** 树形结构节点 */
export interface INODE {
    parent?: INODE,
    children?: INODE[],
    toEqual?: (node: INODE) => boolean
}

/** 关系（表）名 */
export type RELATION_NAME = {
    name: string,
    alias?: string;
}

/** 关系（表）的属性名 */
export type RELATION_ATTR = string[];

/** 属性的值 */
export type ATTRIBUTE_VAL = number | string;

/** SQL语句类型 */
export enum SQL_STATEMENT_TYPE {
    CREATETABLE = "CREATETABLE",
    CREATEINDEX = "CREATEINDEX",
    DROPTABLE = "DROPTABLE",
    DROPINDEX = "DROPINDEX",
    LOAD = "LOAD",
    SET = "SET",
    HELP = "HELP",
    PRINT = "PRINT",
    QUERY = "QUERY",
    INSERT = "INSERT",
    UPDATE = "UPDATE",
    DELETE = "DELETE"
}

/**  DML 语句类型 */
/* export enum DML_STATEMENT_TYPE {
    SELECT = "SELECT",
    INSERT = "INSERT",
    DELETE = "DELETE"
} */

/** Join 类型 */
export enum JOIN_TYPE {
    INNER = "INNER",
    LEFT = "LEFT",
    RIGHT = "RIGHT"
}

/** 排序 类型（升序、降序）*/
export enum ORDER_TYPE {
    DESC = "DESC",
    ASC = "ASC"
}
