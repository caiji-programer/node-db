import { Token, TokenType } from "./token";

export default class Matcher {

    constructor(tokens?: Token[]) {
        if (tokens && tokens.length) {
            this.tokens = tokens.filter(token => token.type !== TokenType.SPACES);
        }
    }

    tokens: Token[] = [];
    tokenPos: number = 0;

    // build() {
    //     throw new Error("Sub class should rewrite build() !");
    // }

    // next(): Token {
    //     return this.tokens[this.tokenPos];
    // }

    hasNext() {
        return this.tokens.length > this.tokenPos;
    }

    peek(): Token {
        let t = this.tokens[this.tokenPos];
        if (!t) return null;
        this.tokenPos++;
        return t;
    }

    lookBack(num: number) {
        this.tokenPos -= num;
    }

    /**
     * 从指定位置找符合类型的Token，默认是从tokenPos开始
     */
    find(type: TokenType, index?: number) {
        if (index === undefined) index = this.tokenPos;
        for (; index < this.tokens.length; index++) {
            let t = this.tokens[index];
            if (t.is(type)) return index;
        }
        return -1;
    }

    /**
     * 匹配一个Token
     */
    expect(type: TokenType) {
        let token = this.peek();
        if (!token) return null;
        if (token.is(type)) {
            return token;
        }
        this.tokenPos--;
        return null;
    }

    /**
     * 匹配期望的多个Token，成功后才消耗匹配到的Token
     */
    expectMany(...types: TokenType[]) {
        let len = types.length, start = this.tokenPos;
        for (let i = 0; i < len; i++) {
            let pos = start + i;
            // 超出范围或者有一个token没匹配即为匹配结束
            if (pos >= this.tokens.length) {
                return null;
            }
            if (!this.tokens[pos].is(types[i])) {
                return null;
            }
        }
        this.tokenPos += len;
        return this.tokens.slice(start, this.tokenPos);
    }

    /**
     * 匹配某一个Token，有一个符合预期即返回
     */
    expectOptional(...types: TokenType[]) {
        let token = this.peek();
        if (!token) return null;
        for (let index = 0; index < types.length; index++) {
            if (token.is(types[index])) {
                return token;
            }
        }
        this.tokenPos--;
        return null;
    }

}
