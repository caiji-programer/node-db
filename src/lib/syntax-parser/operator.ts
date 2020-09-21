import { TokenType } from "./token";

/** 运算符类型 */
enum OperatorType {
    NOT_S = "NOT_S",
    /** 乘 * multiplication */
    MUL = "MUL",
    /** 除 / */
    DIV = "DIV",
    /** 加 + */
    ADD = "ADD",
    /** 减 - subtract */
    SUB = "SUB",
    /**  =	等于	 */
    EQ = "EQ",
    /**  <>, !=	不等于	 */
    NE = "NE",
    /**  >	大于	 */
    GT = "GT",
    /**  <	小于	 */
    LT = "LT",
    /**  <=	小于等于	 */
    LE = "LE",
    /**  >=	大于等于	 */
    GE = "GE",
    /**  BETWEEN  在两值之间	>=min&&<=max */
    BETWEEN = "BETWEEN",
    // NOTBETWEEN = "NOTBETWEEN",
    /**  IN	在集合中	 */
    IN = "IN",
    // NOTIN = "NOTIN",
    /**  TODO <=>	严格比较两个NULL值是否相等	两个操作码均为NULL时，其所得值为1；而当一个操作码为NULL时，其所得值为0 */
    /**  LIKE	模糊匹配	 */
    LIKE = "LIKE",
    // NOTLIKE = "NOTLIKE",
    /**  TODO REGEXP 或 RLIKE	正则式匹配	 */
    EXISTS = "EXISTS",
    ANY = "ANY",
    ALL = "ALL",
    SOME = "SOME",
    /**  IS NULL	为空	 */
    IS = "IS",
    // ISNOT = "ISNOT",
    /** 与 */
    AND = "AND",
    /** 或 */
    OR = "OR",
    /** 非 */
    NOT = "NOT"
}

/** 一元运算符类型 */
const unaryOperatorTypes = [OperatorType.NOT_S, OperatorType.NOT, OperatorType.EXISTS];

/** 比较运算符类型 */
const compareOperatorTyps = [OperatorType.EQ, OperatorType.GT, OperatorType.GE, OperatorType.LT, OperatorType.LE, OperatorType.NE];

/** 操作符 映射 优先级 */
const operatorPriorityLevelMap = new Map<OperatorType, number>();

/** MySQL运算符优先级（数值越大优先级越高）
    1	:=
    2	||、OR、XOR
    3	&&、AND
    4	NOT
    5	BETWEEN、CASE、WHEN、THEN、ELSE
    6	=、<=>、>=、>、<=、<、<>、!=、IS、LIKE、REGEXP、IN
    7	|
    8	&
    9	<<、>>
    10	-、+
    11	*、/、DIV、MOD
    12	^
    13	-(一元减号 即负号)、~(一元比特反转)
    14	！
*/
operatorPriorityLevelMap.set(OperatorType.NOT_S, 14);
operatorPriorityLevelMap.set(OperatorType.MUL, 11);
operatorPriorityLevelMap.set(OperatorType.DIV, 11);
operatorPriorityLevelMap.set(OperatorType.SUB, 10);
operatorPriorityLevelMap.set(OperatorType.ADD, 10);
operatorPriorityLevelMap.set(OperatorType.EQ, 6);
operatorPriorityLevelMap.set(OperatorType.GT, 6);
operatorPriorityLevelMap.set(OperatorType.GE, 6);
operatorPriorityLevelMap.set(OperatorType.LT, 6);
operatorPriorityLevelMap.set(OperatorType.LE, 6);
operatorPriorityLevelMap.set(OperatorType.NE, 6);
operatorPriorityLevelMap.set(OperatorType.IS, 6);
// operatorPriorityLevelMap.set(OperatorType.ISNOT, 6);
operatorPriorityLevelMap.set(OperatorType.LIKE, 6);
// operatorPriorityLevelMap.set(OperatorType.NOTLIKE, 6);
operatorPriorityLevelMap.set(OperatorType.EXISTS, 6);
operatorPriorityLevelMap.set(OperatorType.IN, 6);
operatorPriorityLevelMap.set(OperatorType.ANY, 6);
operatorPriorityLevelMap.set(OperatorType.ALL, 6);
operatorPriorityLevelMap.set(OperatorType.SOME, 6);
// operatorPriorityLevelMap.set(OperatorType.NOTIN, 6);
operatorPriorityLevelMap.set(OperatorType.BETWEEN, 5);
// operatorPriorityLevelMap.set(OperatorType.NOTBETWEEN, 5);
operatorPriorityLevelMap.set(OperatorType.NOT, 4);
operatorPriorityLevelMap.set(OperatorType.AND, 3);
operatorPriorityLevelMap.set(OperatorType.OR, 2);

/** 操作符优先级比较 */
const operatorLevelCompare = (type1: OperatorType, type2: OperatorType): number => {
    let level1 = operatorPriorityLevelMap.get(type1);
    let level2 = operatorPriorityLevelMap.get(type2);
    return level1 - level2;
}

/** 操作符 */
class Operator {
    constructor(type: OperatorType, value: string, additionalOp?: OperatorType,) {
        this.type = type;
        this.value = value;
        if (additionalOp) this.additionalOp = additionalOp;
        this.level = operatorPriorityLevelMap.get(type);
    }
    type: OperatorType;
    // 附加的操作符（由两个操作符组成一个新的操作符）
    additionalOp: OperatorType;
    level: number;
    value: string;
    // TODO
    is() {

    }
    /** 是否一元运算符 */
    isUnary(): boolean {
        return unaryOperatorTypes.includes(this.type);
    }
    /** 是否比较运算符 */
    isCompare(): boolean {
        return compareOperatorTyps.includes(this.type);
    }
    /** 比较优先级 */
    compare(type: OperatorType): number {
        let level1 = operatorPriorityLevelMap.get(this.type);
        let level2 = operatorPriorityLevelMap.get(type);
        return level1 - level2;
    }
    // 
    toString(): string {
        return (this.additionalOp || "") + this.value;
    }
}

/** 操作符转成一个可执行的函数 */
function operator2Function(op: Operator): (...args) => any {
    switch (op.type) {
        case OperatorType.NOT_S:
            return (a) => !a;

        case OperatorType.MUL:
            return (a, b) => a * b;

        case OperatorType.DIV:
            return (a, b) => a / b;

        case OperatorType.SUB:
            return (a, b) => a - b;

        case OperatorType.ADD:
            return (a, b) => a + b;

        case OperatorType.EQ:
            return (a, b) => a == b;

        case OperatorType.GT:
            return (a, b) => a > b;

        case OperatorType.GE:
            return (a, b) => a >= b;

        case OperatorType.LT:
            return (a, b) => a < b;

        case OperatorType.LE:
            return (a, b) => a <= b;

        case OperatorType.NE:
            return (a, b) => a != b;

        case OperatorType.IS:
            return (a, b) => a / b;

        case OperatorType.LIKE:
            // TODO a,b 应该是字符串
            return (a, b) => a.indexOf(b) !== -1;

        case OperatorType.BETWEEN:
            return (a, b, c) => a > b && a < c;

        case OperatorType.NOT:
            return (a) => !a;

        case OperatorType.AND:
            return (a, b) => a && b;

        case OperatorType.OR:
            return (a, b) => a || b;
        default:
            return
    }
}


export {
    Operator,
    OperatorType,
    // unaryOperatorTypes,
    // compareOperatorTyps,
    operator2Function
}
