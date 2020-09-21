import { TestTree, BPTreeResultReference } from "../../src/lib/b-plus-tree/test-tree";
import { TestNode } from "../../src/lib/b-plus-tree/test-node";
import Util from "../../src/util";


describe('Test: lib/b-plus-tree', () => {

    const reference = new BPTreeResultReference();

    const root = new TestNode([], null, [], null, null);
    root.point = 1;

    const tree = new TestTree(4, root);
    tree.nodesMap.set(root.point, root);

    // const arr = [67, 26, 10, 81, 62, 89, 71, 56, 32, 54, 18, 87, 73, 43, 76, 24, 41, 68, 28, 58, 88, 38, 21, 90, 53, 0, 93, 50, 22, 96, 64, 80, 65, 37, 11, 75, 91, 83, 72, 70, 61, 45, 79, 94, 74, 25, 6, 82, 3, 66, 19];
    const arr = Util.random.distinctArray(20, 30, 1);
    // console.log(arr);

    test('TestTree.insert()', async () => {

        for (let index = 0; index < arr.length; index++) {
            const key = arr[index], data = key + '' + key; /* console.log(key); */
            reference.insert(key);
            await tree.insert(key, data);

            try {
                let isOK = await tree.check();
                expect(isOK).toBe(true);
            } catch (e) {
                expect(e.message).toBe(null);
            }
            // await tree.print();

            let keys = await tree.getAllKeys();
            expect(keys).toEqual(reference.toArray());
        }

    });


    test('TestTree.delete()', async () => {

        for (let index = 0; index < arr.length; index++) {
            const key = arr[index];
            // console.log(key);
            reference.delete(key);
            await tree.delete(key);

            try {
                let isOK = await tree.check();
                expect(isOK).toBe(true);
            } catch (e) {
                expect(e.message).toBe(null);
            }
            // await tree.print();

            let keys = await tree.getAllKeys();
            expect(keys).toEqual(reference.toArray());
        }

    });

})