//
enum TokenType {
    SPACES = "SPACES",
    CREATE = "CREATE",
    DROP = "DROP",
    TABLE = "TABLE",
    INDEX = "INDEX",
    LOAD = "LOAD",
    HELP = "HELP",
    EXIT = "EXIT",
    PRINT = "PRINT",
    INSERT = "INSERT",
    INTO = "INTO",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    VALUES = "VALUES",
    SELECT = "SELECT",
    WHERE = "WHERE",
    FROM = "FROM",
    SET = "SET",

    COUNT = "COUNT",
    AVG = "AVG",
    SUM = "SUM",
    MAX = "MAX",
    MIN = "MIN",

    INNER = "INNER",
    LEFT = "LEFT",
    RIGHT = "RIGHT",
    JOIN = "JOIN",
    ON = "ON",
    GROUP = "GROUP",
    ORDER = "ORDER",
    BY = "BY",
    DESC = "DESC",
    ASC = "ASC",
    
    AND = "AND",
    OR = "OR",
    NOT = "NOT",
    IS = "IS",
    IN = "IN",
    BETWEEN = "BETWEEN",
    LIKE = "LIKE",
    EXISTS = "EXISTS",
    ALL = "ALL",
    ANY = "ANY",
    SOME = "SOME",

    TRUE = "TRUE",
    FALSE = "FALSE",
    NULL = "NULL",

    STRING = "STRING",
    // COMMENT = "COMMENT",
    QSTRING = "QSTRING",

    /** 小于 < */
    LT = "LT",
    /** 小于等于 <= */
    LE = "LE",
    /** 大于 > */
    GT = "GT",
    /** 大于等于 >= */
    GE = "GE",
    /** 等于 = */
    EQ = "EQ",
    /** 不等于 !=|<> */
    NE = "NE",

    /** 与逻辑运算符 && (And Symbol) */ 
    AND_S = "AND_S",
    /** 或 || (Or Symbol) */ 
    OR_S = "OR_S",
    /** 非 ! (Not Symbol) */ 
    NOT_S = "NOT_S",

    /** 加 + */
    ADD = "ADD",
    /** 减 - subtract */
    SUB = "SUB",
    // 注：乘multiplication（与星号相同）
    /** 除 / */
    DIV = "DIV",
    
    FLOAT = "FLOAT",
    INT = "INT",
    /** 逗号 , */
    COMMA = "COMMA",  
    /** 分号 ; */
    SEMICOLON = "SEMICOLON",
    /** 左括号 ( */
    LPAREN = "LPAREN",
    /** 右括号 ) */
    RPAREN = "RPAREN",
    /** 星号或乘 * */
    STAR = "STAR",
    /** 点 . */
    DOT = "DOT"
};


class Token {
    constructor(type, regExp?, value?) {
        this.type = type;
        this.regExp = regExp;
        this.value = value;
    }

    type: TokenType;
    regExp;
    value: any;
    is(type: TokenType) {
        return this.type === type;
    }
}


const TokenRules = [
    {type: TokenType.SPACES, regexp: /^\s+/},
    {type: TokenType.CREATE, regexp: /^(create|CREATE)(?=[\s\(\)])/},
    {type: TokenType.DROP, regexp: /^(drop|DROP)(?=[\s\(\)])/},
    {type: TokenType.TABLE, regexp: /^(table|TABLE)(?=[\s\(\)])/},
    {type: TokenType.INDEX, regexp: /^(index|INDEX)(?=[\s\(\)])/},
    {type: TokenType.LOAD, regexp: /^(load|LOAD)(?=[\s\(\)])/},
    {type: TokenType.HELP, regexp: /^(help|HELP)(?=[\s\(\)])/},
    {type: TokenType.EXIT, regexp: /^(exit|EXIT)(?=[\s\(\)])/},
    {type: TokenType.PRINT, regexp: /^(print|PRINT)(?=[\s\(\)])/},
    {type: TokenType.INSERT, regexp: /^(insert|INSERT)(?=[\s\(\)])/},
    {type: TokenType.INTO, regexp: /^(into|INTO)(?=[\s\(\)])/},
    {type: TokenType.UPDATE, regexp: /^(update|UPDATE)(?=[\s\(\)])/},
    {type: TokenType.DELETE, regexp: /^(delete|DELETE)(?=[\s\(\)])/},
    {type: TokenType.VALUES, regexp: /^(values|VALUES)(?=[\s\(\)])/},
    {type: TokenType.SELECT, regexp: /^(select|SELECT)(?=[\s\(\)])/},
    {type: TokenType.WHERE, regexp: /^(where|WHERE)(?=[\s\(\)])/},
    {type: TokenType.FROM, regexp: /^(from|FROM)(?=[\s\(\)])/},
    {type: TokenType.SET, regexp: /^(set|SET)(?=[\s\(\)])/},

    {type: TokenType.COUNT, regexp: /^(count|COUNT)(?=[\s\(\)])/},
    {type: TokenType.AVG, regexp: /^(avg|AVG)(?=[\s\(\)])/},
    {type: TokenType.SUM, regexp: /^(sum|SUM)(?=[\s\(\)])/},
    {type: TokenType.MAX, regexp: /^(max|MAX)(?=[\s\(\)])/},
    {type: TokenType.MIN, regexp: /^(min|MIN)(?=[\s\(\)])/},

    { type: TokenType.INNER, regexp: /^(inner|INNER)(?=[\s\(\)])/},
    { type: TokenType.LEFT, regexp: /^(left|LEFT)(?=[\s\(\)])/},
    { type: TokenType.RIGHT, regexp: /^(right|RIGHT)(?=[\s\(\)])/},
    { type: TokenType.JOIN, regexp: /^(join|JOIN)(?=[\s\(\)])/},
    { type: TokenType.ON, regexp: /^(on|ON)(?=[\s\(\)])/},

    {type: TokenType.GROUP, regexp: /^(group|GROUP)(?=[\s\(\)])/},
    {type: TokenType.ORDER, regexp: /^(order|ORDER)(?=[\s\(\)])/},
    {type: TokenType.BY, regexp: /^(by|BY)(?=[\s\(\)])/},
    {type: TokenType.DESC, regexp: /^(desc|DESC)(?=[\s\(\)])/},
    {type: TokenType.ASC, regexp: /^(asc|ASC)(?=[\s\(\)])/},

    {type: TokenType.AND, regexp: /^(and|AND)(?=[\s\(\)])/},
    {type: TokenType.OR, regexp: /^(or|OR)(?=[\s\(\)])/},
    {type: TokenType.NOT, regexp: /^(not|NOT)(?=[\s\(\)])/},
    {type: TokenType.IS, regexp: /^(is|IS)(?=[\s\(\)])/},
    {type: TokenType.IN, regexp: /^(in|IN)(?=[\s\(\)])/},
    {type: TokenType.BETWEEN, regexp: /^(between|BETWEEN)(?=[\s\(\)])/},
    {type: TokenType.LIKE, regexp: /^(like|LIKE)(?=[\s\(\)])/},
    {type: TokenType.EXISTS, regexp: /^(exists|EXISTS)(?=[\s\(\)])/},
    {type: TokenType.ALL, regexp: /^(all|ALL)(?=[\s\(\)])/},
    {type: TokenType.ANY, regexp: /^(any|ANY)(?=[\s\(\)])/},
    {type: TokenType.SOME, regexp: /^(some|SOME)(?=[\s\(\)])/},

    {type: TokenType.TRUE, regexp: /^(true|TRUE)(?=[\s\(\)])/},
    {type: TokenType.FALSE, regexp: /^(false|FALSE)(?=[\s\(\)])/},
    {type: TokenType.NULL, regexp: /^(null|NULL)(?=[\s\(\)])/},

    {type: TokenType.STRING, regexp: /^[a-zA-Z][a-zA-Z0-9_]*/},
    {type: TokenType.QSTRING, regexp: /^("[^"\n]*"|'[^'\n]*')/},

    {type: TokenType.LE, regexp: /^<=/},
    {type: TokenType.LT, regexp: /^</},
    {type: TokenType.GE, regexp: /^>=/},
    {type: TokenType.GT, regexp: /^>/},
    {type: TokenType.EQ, regexp: /^=/},
    {type: TokenType.NE, regexp: /^(!=|<>)/},

    {type: TokenType.AND_S, regexp: /^&&/},
    {type: TokenType.OR_S, regexp: /^\|\|/},
    {type: TokenType.NOT_S, regexp: /^!/},

    {type: TokenType.ADD, regexp: /^\+/},
    {type: TokenType.SUB, regexp: /^-/},
    {type: TokenType.DIV, regexp: /^\//},
    
    {type: TokenType.FLOAT, regexp: /^-?[0-9]+\.[0-9]*/},
    {type: TokenType.INT, regexp: /^-?[0-9]+/},
    {type: TokenType.COMMA, regexp: /^,/},
    {type: TokenType.SEMICOLON, regexp: /^;/},
    {type: TokenType.LPAREN, regexp: /^\(/},
    {type: TokenType.RPAREN, regexp: /^\)/},
    {type: TokenType.STAR, regexp: /^\*/},
    {type: TokenType.DOT, regexp: /^\./}
];


export {
    Token,
    TokenType,
    TokenRules
}
