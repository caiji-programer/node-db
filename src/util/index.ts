import buffer from "./buffer-util";
import random from "./random-util";
import stringify from "./stringify-util";
import { printTable } from "./print-util";

/** 对await包装，返回错误和结果 */
function awaitWrap<T = any, U = any>(promise: Promise<T>): Promise<[U | null, T | null]> {
    return promise
        .then<[null, T]>((data: T) => [null, data])
        .catch<[U, null]>(err => [err, null])
}
export default class Util {
    static buffer = buffer;
    static random = random;
    static stringify = stringify;
    static awaitWrap = awaitWrap;
    static printTable = printTable;
}
