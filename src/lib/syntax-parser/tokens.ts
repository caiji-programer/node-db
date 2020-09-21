import { TokenType } from "./token";

const Tokens = [
    {
        type: TokenType.SPACES,
        regexp: /^\s+/
    },
    {
        type: TokenType.CREATE,
        regexp: /^(create|CREATE)/
    },
    {
        type: TokenType.DROP,
        regexp: /^(drop|DROP)/
    },
    {
        type: TokenType.TABLE,
        regexp: /^(table|TABLE)/
    },
    {
        type: TokenType.INDEX,
        regexp: /^(index|INDEX)/
    },
    {
        type: TokenType.LOAD,
        regexp: /^(load|LOAD)/
    },
    {
        type: TokenType.HELP,
        regexp: /^(help|HELP)/
    },
    {
        type: TokenType.EXIT,
        regexp: /^(exit|EXIT)/
    },
    {
        type: TokenType.PRINT,
        regexp: /^(print|PRINT)/
    },
    {
        type: TokenType.INSERT,
        regexp: /^(insert|INSERT)/
    },
    {
        type: TokenType.INTO,
        regexp: /^(into|INTO)/
    },
    {
        type: TokenType.VALUES,
        regexp: /^(values|VALUES)/
    },
    {
        type: TokenType.SELECT,
        regexp: /^(select|SELECT)/
    },
    {
        type: TokenType.WHERE,
        regexp: /^(where|WHERE)/
    },
    {
        type: TokenType.FROM,
        regexp: /^(from|FROM)/
    },

    {
        type: TokenType.COUNT,
        regexp: /^(count|COUNT)/
    },
    {
        type: TokenType.AVG,
        regexp: /^(avg|AVG)/
    },
    {
        type: TokenType.SUM,
        regexp: /^(sum|SUM)/
    },
    {
        type: TokenType.MAX,
        regexp: /^(max|MAX)/
    },
    {
        type: TokenType.MIN,
        regexp: /^(min|MIN)/
    },

    { type: TokenType.INNER, regexp: /^(inner|INNER)/ },
    { type: TokenType.LEFT, regexp: /^(left|LEFT)/ },
    { type: TokenType.RIGHT, regexp: /^(right|RIGHT)/ },
    { type: TokenType.JOIN, regexp: /^(join|JOIN)/ },
    { type: TokenType.ON, regexp: /^(on|ON)/ },

    {
        type: TokenType.GROUP,
        regexp: /^(group|GROUP)/
    },
    {
        type: TokenType.ORDER,
        regexp: /^(order|ORDER)/
    },
    {
        type: TokenType.BY,
        regexp: /^(by|BY)/
    },
    {
        type: TokenType.DESC,
        regexp: /^(desc|DESC)/
    },
    {
        type: TokenType.ASC,
        regexp: /^(asc|ASC)/
    },

    {
        type: TokenType.STRING,
        regexp: /^[a-zA-Z][a-zA-Z0-9_]*/
    },
    {
        type: TokenType.QSTRING,
        regexp: /^("[^"\n]*"|'[^'\n]*')/
    },

    {
        type: TokenType.LT,
        regexp: /^</
    },
    {
        type: TokenType.LE,
        regexp: /^<=/
    },
    {
        type: TokenType.GT,
        regexp: /^>/
    },
    {
        type: TokenType.GE,
        regexp: /^>=/
    },
    {
        type: TokenType.EQ,
        regexp: /^=/
    },
    {
        type: TokenType.FLOAT,
        regexp: /^-?[0-9]+\.[0-9]*/
    },
    {
        type: TokenType.INT,
        regexp: /^-?[0-9]+/
    },
    {
        type: TokenType.COMMA,
        regexp: /^,/
    },
    {
        type: TokenType.SEMICOLON,
        regexp: /^;/
    },
    {
        type: TokenType.LPAREN,
        regexp: /^\(/
    },
    {
        type: TokenType.RPAREN,
        regexp: /^\)/
    },
    {
        type: TokenType.STAR,
        regexp: /^\*/
    },
    {
        type: TokenType.DOT,
        regexp: /^\./
    }
]

export default Tokens;
