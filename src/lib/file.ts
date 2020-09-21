import * as fs from "fs";
import * as util from "util";

/**
 * TODO: 优化方向，可以参考 Java 的 memory-mapped files
 * 关于为什么不用 stream ？
 * 读取磁盘的 page 有随机性，极有可能是不连续的，而 stream 则是连续的，会读取不需要的 page
 */
export default class File {

    constructor(path: string, mode?) {
        this.fd = fs.openSync(path, 'r+');
        // this.pointer = 0;
        this.path = path;
    }
    /** 文件路径 */ 
    path: string;
    /** 文件描述符 */
    fd;
    // pointer: number;

    /**
     * 获取该文件的描述符
     */
    async getFd() {
        return this.fd;
    }

    /**
     * 从文件 pos 位置开始读取 size 字节，默认4K
     */
    async read(pos: number, size?: number) {

        size = size || 4096;
        let buf: Buffer = Buffer.alloc(size);
        // this.pointer = pos + size;
        let result = await util.promisify(fs.read)(this.fd, buf, 0, size, pos);
        return result;
    }

    /**
     * 从文件 pos 位置开始写入 size 字节
     */
    async write(pos: number, buf: Buffer) {

        let size = buf.length;
        // this.pointer = pos + size;
        let result = await util.promisify(fs.write)(this.fd, buf, 0, size, pos);
        return result
    }

    /**
     * 关闭文件
     */ 
    async close() {
        await util.promisify(fs.close)(this.fd);
    }

}
