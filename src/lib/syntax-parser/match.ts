import {Token, TokenType} from "./token";

// export function match (tokens, pattern, fn) {}

// 分支
function branch(...tokens) {}


/**
 * 匹配连续的token
 */
function match(tokens: Token[], start: number, pattern: TokenType[]): Token[] {
    let len = pattern.length;
    for (let i = 0; i < len; i++) {
        let tokenPos = start + i;
        // 超出范围或者有一个token没匹配即为匹配结束
        if (tokenPos >= tokens.length) {
            return null;
        }
        if (!tokens[tokenPos].is(pattern[i])) {
            return null;
        }
    }
    return tokens.slice(start, start + len);
}

/**
 * 尽量匹配多次
 */
function matchMany(tokens: Token[], start: number, pattern: TokenType[]): Token[] {
    let len = pattern.length,
        count = 0;
    while (match(tokens, start + len * count, pattern)) {
        count++;
    }
    if (count === 0) return null;
    return tokens.slice(start, start + len * count);
}



// function parseSelectElements() {
//     let pattern = branch(
//         "*",
//         ["string", optional(many(",", "string"))]
//     )

//     let pattern = branch(
//         TokenType.STAR,
//         [TokenType.STRING, optional(many(TokenType.COMMA, TokenType.STRING))]
//     ); 

//     match([], pattern, function(token){

//     })
// }
