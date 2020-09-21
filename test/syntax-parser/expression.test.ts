import Lexer from "../../src/lib/syntax-parser/lexer";
import { Token, TokenType } from "../../src/lib/syntax-parser/token";
import { Operator, OperatorType, ExpressionAtom, ExpressionLeafNode, ExpressionInternalNode, ExpressionNode, ExpressionMatcher } from "../../src/lib/syntax-parser/expression";

const testCases = [
    {
        input: "a >= b.c/3 || a <= c.d*2+11 && b.c=a*3+2",
        calculate: (): ExpressionNode => {
            let A1 = new ExpressionInternalNode(
                new Operator(OperatorType.DIV, "/"),
                [
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['b','c']),
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '3')
                ]
            );
            let A2 = new ExpressionInternalNode(
                new Operator(OperatorType.GE, ">="),
                [new ExpressionLeafNode(ExpressionAtom.ATTR, ['a']), A1]
            );
            let A3 = new ExpressionInternalNode(
                new Operator(OperatorType.MUL, "*"),
                [
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['c','d']),
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '2'),
                ]
            );
            let A4 = new ExpressionInternalNode(
                new Operator(OperatorType.ADD, "+"),
                [A3, new ExpressionLeafNode(ExpressionAtom.CONSTANT, "11")]
            );
            let A5 = new ExpressionInternalNode(
                new Operator(OperatorType.LE, "<="),
                [new ExpressionLeafNode(ExpressionAtom.ATTR, ['a']), A4]
            );
            let A6 = new ExpressionInternalNode(
                new Operator(OperatorType.MUL, "*"),
                [
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['a']),
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '3')
                ]
            );
            let A7 = new ExpressionInternalNode(
                new Operator(OperatorType.ADD, "+"),
                [A6, new ExpressionLeafNode(ExpressionAtom.CONSTANT, '2')]
            );
            let A8 = new ExpressionInternalNode(
                new Operator(OperatorType.EQ, "="),
                [new ExpressionLeafNode(ExpressionAtom.ATTR, ['b','c']), A7]
            );
            let A9 = new ExpressionInternalNode(
                new Operator(OperatorType.AND, "AND"),
                [A5, A8]
            );
            let A10 = new ExpressionInternalNode(
                new Operator(OperatorType.OR, "OR"),
                [A2, A9]
            );
            return A10;
        }
    },
    {
        input: "aa.bb between 1+2*3-2 and 4+cc.dd*3+2",
        calculate: (): ExpressionNode => {
            // A1 = MUL (2), (3)
            let A1 = new ExpressionInternalNode(
                new Operator(OperatorType.MUL, "*"),
                [
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '2'),
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '3')
                ]
            )
            // A2 = SUB (A1), (2)
            let A2 = new ExpressionInternalNode(
                new Operator(OperatorType.SUB, "-"),
                [A1, new ExpressionLeafNode(ExpressionAtom.CONSTANT, '2')]
            )
            // A3 = ADD (1), (A2)
            let A3 = new ExpressionInternalNode(
                new Operator(OperatorType.ADD, "+"),
                [new ExpressionLeafNode(ExpressionAtom.CONSTANT, '1'), A2]
            )
            // A4 = MUL (cc,dd), (3)
            let A4 = new ExpressionInternalNode(
                new Operator(OperatorType.MUL, "*"),
                [
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['cc','dd']),
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '3')
                ]
            )
            // A5 = ADD (A4), (2)
            let A5 = new ExpressionInternalNode(
                new Operator(OperatorType.ADD, "+"),
                [A4, new ExpressionLeafNode(ExpressionAtom.CONSTANT, '2'),]
            )
            // A6 = ADD (4), (A5)
            let A6 = new ExpressionInternalNode(
                new Operator(OperatorType.ADD, "+"),
                [new ExpressionLeafNode(ExpressionAtom.CONSTANT, '4'), A5]
            )
            // A7 = BETWEEN (aa,bb), (A3), (A6)
            let A7 = new ExpressionInternalNode(
                new Operator(OperatorType.BETWEEN, "BETWEEN"),
                [new ExpressionLeafNode(ExpressionAtom.ATTR, ['aa','bb']), A3, A6]
            )
            return A7
        }
    },
    {
        input: "!(a/b.c=c.d*3)||c.a>24/(4+a.c)",
        calculate: (): ExpressionNode => {
            // A1 = DIV (a), (b,c)
            let A1 = new ExpressionInternalNode(
                new Operator(OperatorType.DIV, "/"),
                [
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['a']),
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['b','c'])
                ]
            )
            // A2 = MUL (c,d), (3)
            let A2 = new ExpressionInternalNode(
                new Operator(OperatorType.MUL, "*"),
                [
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['c','d']),
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '3')
                ]
            )
            // A3 = EQ (A1), (A2)
            let A3 = new ExpressionInternalNode(
                new Operator(OperatorType.EQ, "="),
                [A1, A2]
            )
            // A4 = NOT_S (A3)
            let A4 = new ExpressionInternalNode(
                new Operator(OperatorType.NOT_S, "!"),
                [A3]
            )
            // A5 = ADD (4), (a,c)
            let A5 = new ExpressionInternalNode(
                new Operator(OperatorType.ADD, "+"),
                [
                    new ExpressionLeafNode(ExpressionAtom.CONSTANT, '4'),
                    new ExpressionLeafNode(ExpressionAtom.ATTR, ['a','c'])
                ]
            )
            // A6 = DIV (24), (A5)
            let A6 = new ExpressionInternalNode(
                new Operator(OperatorType.DIV, "/"),
                [new ExpressionLeafNode(ExpressionAtom.CONSTANT, '24'), A5]
            )
            // A7 = GT (c,a), (A6)
            let A7 = new ExpressionInternalNode(
                new Operator(OperatorType.GT, ">"),
                [new ExpressionLeafNode(ExpressionAtom.ATTR, ['c','a']), A6]
            )
            // A8 = OR (A4), (A7)
            let A8 = new ExpressionInternalNode(
                new Operator(OperatorType.OR, "OR"),
                [A4, A7]
            )
            return A8
        }
    }
]

// 
class ExpressionMatcherTest extends ExpressionMatcher {

    constructor(tokens: Token[]) {
        super(tokens);
        this.root = this.parseExpression();
    }

    root: ExpressionNode;

    parseAttr() {
        let token = this.expect(TokenType.STRING), result = [];
        if (token) {
            result.push(token.value);
            let tokens = this.expectMany(TokenType.DOT, TokenType.STRING);
            if (tokens) {
                result.push(tokens[1].value);
                return result;
            }
            return result;
        }
        return null;
    }

    parseSelectStatement() {
        return null;
    }
}

/*
const simpleTreeLeafNode = (node: ExpressionNode) => {
    let loop = (node) => {
        if (node instanceof ExpressionInternalNode) {
            node.children.forEach(node => loop(node));
        } else if (node instanceof ExpressionLeafNode) {
            if (node.value) {
                if (node.value.value) {
                    node.value = node.value.value.toString();
                } else {
                    node.value = node.value.toString();
                }
            }
        }
    }
    loop(node);
}
*/

describe('Test: lib/syntax-parser/expression.ts', () => {
    // 
    testCases.forEach(testCase => {
        let input = testCase.input;
        let exp = testCase.calculate();

        let tokens = new Lexer(input).getTokens();
        let tree = new ExpressionMatcherTest(tokens);

        console.log(input);
        // simpleTreeLeafNode(tree.root);

        test(`parse: ${input}`, () => {
            expect(tree.root).toEqual(exp);
        })
    })

})
