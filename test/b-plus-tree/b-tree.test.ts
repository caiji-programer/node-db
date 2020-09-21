import BTree, { BTreeReference } from "../../src/lib/b-plus-tree/b-tree";
import Util from "../../src/util";


describe('Test: lib/b-tree', () => {

    let tree: BTree = new BTree(3);
    // let sourceArray: number[] = Util.random.distinctArray(1, 30, 20);
    let sourceArray: number[] = [26, 25, 11, 27, 19, 8, 6, 13, 21, 15, 28, 7, 18, 22, 5, 17, 3, 2, 29, 24];
    let deleteArray: number[];
    console.log(sourceArray);

    let reference = new BTreeReference();


    test('BTree.insert()', () => {
        // 
        sourceArray.forEach(num => {
            tree.insert(num);
            reference.insert(num);
        })

        // console.log(tree.toArray(), reference.data);
        reference.toEqual(tree.toArray());
        tree.print();

    })


    test('BTree.delete()', () => {
        // 5个存在B树里的key
        deleteArray = sourceArray.slice(0, 5);
        console.log(deleteArray);
        deleteArray.forEach(num => {
            tree.delete(num);
            // tree.print();
            reference.delete(num);
            expect(reference).toEqual(tree.toArray());
        })

        // 5个不存在B树里的key
        deleteArray = Util.random.distinctArray(40, 60, 5);
        console.log(deleteArray);
        deleteArray.forEach(num => {
            tree.delete(num);
            // tree.print();
            reference.delete(num);
            expect(reference).toEqual(tree.toArray());
        })
    })


    test('BTree.update()', () => {
        // 更新几个key
        let updateArray = deleteArray;
        updateArray.forEach((num, index) => {
            let oldVal = sourceArray[6 + index];
            try {
                reference.update(oldVal, num);
                tree.update(oldVal, num);
            } catch (e) {
                console.log(`update: ${oldVal} -> ${num};`);
                console.error(e.message);
            }
            // tree.print();
            expect(reference).toEqual(tree.toArray());
        })

        // 更新几个不存在的key
        updateArray = Util.random.distinctArray(70, 90, 6);
        updateArray.forEach((num, index) => {
            let oldVal = sourceArray[6 + index];
            try {
                reference.update(oldVal, num);
                tree.update(oldVal, num);
            } catch (e) {
                console.log(`update: ${oldVal} -> ${num};`);
                console.error(e.message);
            }
            // tree.print();
            expect(reference).toEqual(tree.toArray());
        })

    })


    sourceArray.sort((a, b) => a - b);
    let keyArray: any[] = tree.toArray();

    console.log(sourceArray);
    console.log(keyArray);

})
