
import { Token, TokenType, TokenRules } from "./token";

export default class Lexer {
    
    constructor(source) {
        this.source = source;
    }

    source: string;

    offset: number = 0;

    next(): Token {
        let source = this.source.slice(this.offset);
        let index, t, result;
        for (index = 0; index < TokenRules.length; index++) {
            t = TokenRules[index];
            result = t.regexp.exec(source);
            if (result) {
                return new Token(t.type, t.regexp, result[0]);
            }
        }
        return null;
    }

    getTokens(): Token[] {
        let token: Token, tokens = [];
        let len = this.source.length;
        while (token = this.next()) {
            tokens.push(token);
            this.offset += token.value.length;
            if (this.offset >= len) {
                return tokens
            }
        }
        // console.log(this.source, tokens);
        throw new Error("tokens Error");
        // return [];
    }
}
