
interface IExplainItem {
    id: number;
    selectType: ExplainItemSelectType;
    table;
    type: ExplainItemType;
    key;
    possibleKeys;
    keyLen;
    ref;
    rows;
    filtered;
    extra;
}

enum ExplainItemType { ALL, INDEX, RANGE, REF, EQ_REF, CONST, SYSTEM }

enum ExplainItemSelectType { PRIMARY, SIMPLE, SUBQUERY, DERIVED, UNION }


class Explanation {

    constructor() {

    }

    sources: IExplainItem[];

    add() {}

    print() {

    }
}
