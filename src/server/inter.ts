
export class Response<T = any> {
    constructor(status: number, message: string, data: T) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
    status: number;
    message: string;
    data: T;
}

export interface IQueryResponse {
    plan: ILogicalPlan,
    result?: IQueryResult
}

export interface IQueryResult {

}

export interface ILogicalPlan {
    pre: IPlanNode[]
    primary: IPlanNode
}

export interface IPlanNode {
    id: number,
    name: string,
    value?: any,
    children: IPlanNode[]
}
