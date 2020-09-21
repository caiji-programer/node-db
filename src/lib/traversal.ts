import { INODE } from "src/lib/define";

/** 遍历树（前序遍历）
 *  @node 实现INODE的节点；
 *  @fn 该函数根据当前节点，返回true/false。如果为true即中断遍历
 */
export function traversal<T extends INODE>(node: T, fn: (n: T) => boolean | void) {
    if (fn(node)) return true
    let children = <T[]>node.children
    if (children && children.length) {
        for (let index = 0; index < children.length; index++) {
            let child = children[index]
            if (traversal(child, fn)) return true
        }
    }
}

export async function asyncTraversal<T extends INODE>(node, fn) {}

// TODO
export function preTraversal() {

}

/** 遍历树（中序遍历） */
export function middleTraversal<T extends INODE>(node: T, fn: (n: T) => boolean | void) {
    let children = <T[]>node.children, index = 0;
    if (children && children.length) {
        if (middleTraversal(children[0], fn)) return true;
        if (fn(node)) return true
        for (index = 1; index < children.length; index++) {
            let child = children[index]
            if (middleTraversal(child, fn)) return true
        }
    } else {
        if (fn(node)) return true
    }
}

/** 遍历树（后序遍历） */
export function postTraversal<T extends INODE>(node: T, fn: (n: T) => boolean | void) {
    let children = <T[]>node.children
    if (children && children.length) {
        for (let index = 0; index < children.length; index++) {
            let child = children[index]
            if (postTraversal(child, fn)) return true
        }
    }
    if (fn(node)) return true
}

export async function asyncPostTraversal<T extends INODE>(node: T, fn: (n: T, childResults: any[]) => Promise<any>) {
    let children = <T[]>node.children
    let results = [];
    if (children && children.length) {
        for (let index = 0; index < children.length; index++) {
            let child = children[index]
            let result = await asyncPostTraversal(child, fn);
            results.push(result);
            console.log(result);
        }
    }
    return await fn(node, results);
    // if (fn(node)) return true
}


/** 新节点代替旧节点，父子节点的引用也同时更新（isReplaceChildTree判断是否替换整个子树, 默认false） */
export function replace<T extends INODE>(oldNode: INODE, newNode: INODE, isReplaceChildTree?: boolean) {
    let parent = oldNode.parent;
    if (parent) {
        oldNode.parent = null;
        newNode.parent = parent;
        let index = parent.children.findIndex((node) => {
            return node === oldNode;
        });
        if (index >= 0)  parent.children[index] = newNode;
    }
    // 如果替换整个子树，直接返回
    if (isReplaceChildTree) return

    let children = oldNode.children;
    newNode.children = null;
    if (children && children.length) {
        newNode.children = children;
        children.forEach(chid => {
            chid.parent = newNode;
        })
    }
}


// 
export function find<T extends INODE>(node: T, fn: (n: T) => boolean): T {
    let result = null;
    traversal(node, (n) => {
        if (fn(n)) {
            result = n
            return true
        }
    })
    return result
}

export function findAll<T extends INODE>(node: T, fn: (n: T) => boolean): T[] {
    let result = [];
    traversal(node, (n) => {
        if (fn(n)) result.push(n)
    })
    return result.length ? result : null
}