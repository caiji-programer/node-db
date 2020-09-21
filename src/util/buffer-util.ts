
const buffer = {

    writeBit(buf: Buffer, index: number, value: number) {
        if (index / 8 >= buf.length) {
            throw new Error(`Buffer error: cross the Buffer's border, the buffer has ${buf.length * 8} bit, 
            but received index: ${index}`);
        }
        // 计算在第几个字节
        let byteNum = Math.floor(index/8);
        // 该字节的第几位
        let posInByte = index % 8;
        // 该字节转换为二进制后可能是1-8位数字
        let target = (buf[byteNum]).toString(2);
        // 
        let targetArr = ('00000000').substring(0, (8 - target.length)).concat(target).split('');
    
        targetArr[posInByte] = (value ? '1' : '0');
        target = targetArr.join('');
        buf[byteNum] = parseInt(target, 2);
    },

    writeBinaryArray(buf: Buffer, offset, arr: number[]) {
        let len = arr.length;
        if (offset + len/8 >= buf.length) {
            throw new Error(`Buffer error: cross the Buffer's border, the buffer has ${buf.length} byte.`);
        }

        let i: number = 0;
        while (i * 8 < len) {
            
            let s = arr.slice(i*8, i*8 + 8).join('');

            if (s.length < 8) {
                s = s.concat('00000000').substring(0, 8);
                // ('00000000').substring(0, (8 - s.length)).concat(s).split('');
            }
            
            buf[offset + i] = parseInt(s, 2)
            i++;
        }

    },

    /** TODO 是否需要考虑大端小端的问题？
    *   TODO 是否需要考虑大端小端的问题？
    */
    readBit(buf: Buffer, index: number) {
        if (index / 8 >= buf.length) {
            throw new Error(`Buffer error: cross the Buffer's border, the buffer has ${buf.length * 8} bit, 
            but received index: ${index}`);
        }
        // 计算在第几个字节
        let byteNum = Math.floor(index/8);
        // 该字节的第几位
        let posInByte = index % 8;
        // 该字节转换为二进制后可能是1-8位数字
        let target = (buf[byteNum]).toString(2);
        // 
        let posInTarget = posInByte - (8 - target.length);
        if (posInTarget >= 0) {
            // target 的每一位只能是0或者1, 所以parseInt没有输入radix也OK
            return parseInt(target[posInTarget]);
        }
        return 0;
    },

    /** TODO 需要考虑大端小端的问题；
    *   将Buffer转换成二进制的字符串；
    */
    toBinaryString(buf: Buffer) {
        let str = '';
        for (const value of buf.values()) {
            // console.log(value);
            str += this.extendStringLength(value.toString(2), 8);
        }
        return str;
    },

    /** TODO 需要考虑大端小端的问题；
    *   将Buffer转换成二进制数字的数组；
    */
    toBinaryArray(buf: Buffer): number[] {
        let arr: number[] = [];
        for (const value of buf.values()) {
            let str = value.toString(2);
            if (str.length !== 8) {
                str = this.extendStringLength(str, 8);
            }
            str.split('').forEach(s => {
                arr.push(parseInt(s));
            })
        }
        return arr;
    },

    // TODO 需要测试
    // TODO 还有分析效率
    findBinaryIndex(buf: Buffer, num) {
        if (num) {
            return this.findBinary1Index(buf);
        }
        return this.findBinary0Index(buf);
    },

    /**
     *  查找Buffer中第一个为0的bit，可以从指定字节开始；
     *  @buf 被查找的Buffer；
     *  @start 指定开始的字节；
     *  @return 返回第一个为0的bit的位置，没有找到则返回 -1；
     */
    findBinary0Index(buf: Buffer, start?: number) {
        let len = buf.length; start = start || 0;
        for (let index = start; index < len; index++) {
            // const element = array[index];
            let element = buf[index];
            if (element === 255) {
                continue;
            }
            if (element < 128) {
                return 8 * index
            }
            // TODO 或者通过位运算更快？
            // TODO 比如：参考 findBinary1Index
            let bitIndex = element.toString(2).indexOf('0');
            if (bitIndex === -1) {
                // TODO 
                console.error(`Error: bitIndex can't be -1!`);
                continue;
            }
            // 到这里时，二进制字符长度一定是8
            return 8 * index + bitIndex;
        }
        return -1;
    },

    /**
     *  查找Buffer中第一个为1的bit，可以从指定字节开始；
     *  @buf 被查找的Buffer；
     *  @start 指定开始的字节；
     *  @return 返回第一个为1的bit的位置，没有找到则返回 -1；
     */
    findBinary1Index(buf: Buffer, start?: number) {
        // 
        let len = buf.length; start = start || 0;
        for (let index = start; index < len; index++) {
            // const element = array[index];
            let element = buf[index];
            let i = 0;
            if (element == 0) {
                continue;
            }
            // 需要判断 i == 8
            while(element !== 1 ) {
                element = element>>1
                i++
            }
            return 8 * index + 7 - i;
        }
        return -1;
    },

    /** 用特定字符延长字符串
     *  @string 原始字符；
     *  @len    延长后的长度；
     *  @word   填充的字符，默认为 '0'；
     *  @dir    0: 延长前面部分；1: 延长后面部分；默认延长前面部分；
     */
    extendStringLength(string, len, word?, dir?) {
        // TODO
        if (string.length > len) {
            // TODO
        }
        let extendString = ''
        word = word || '0';
        // dir = dir || 0;
        for (let index = 0; index < len; index++) {
            extendString += word
        }
        if (dir) {
            return string.concat(extendString.substring(0, (len - string.length)))
        } else {
            return extendString.substring(0, (len - string.length)).concat(string)
        }
    }

}

export default buffer;
