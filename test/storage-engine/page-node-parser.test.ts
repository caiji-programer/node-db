import { PageNodeHeader, PageNodeParser } from "src/lib/storage-engine/page-node-parser";
import { Table, Tuple, TupleDesc, Field, NumberField, StringField, Type } from "src/lib/table";


let desc = new TupleDesc([Type.NUMBER, Type.STRING], ["id", "name"])
let table = new Table("test", desc);
let parser = new PageNodeParser(table);

describe('Test: lib/storage-engine/page-node-parser.ts', () => {

    let buf = Buffer.alloc(4096);
    let costByteNums, result;

    let expectedObj = {
        header: new PageNodeHeader(),
        content: [
            {
                point: 111,
                key: "123",
                data: new Tuple(desc, [
                    new NumberField("id", 123),
                    new StringField("name", "name123"),
                ])
            },
            {
                point: 222,
                key: "456",
                data: new Tuple(desc, [
                    new NumberField("id", 456),
                    new StringField("name", "name456"),
                ])
            }
        ]
    }

    test('PageNodeParser write function :', () => {

        let index = 0;
        parser.writeHeader(buf, expectedObj.header)
        index += result.byteNum;

        expectedObj.content.forEach(item => {

            parser.writePoint(buf, index, item.point)
            index += result.byteNum;

            parser.writeKey(buf, index, item.key)
            index += result.byteNum;

            parser.writeData(buf, index, item.data)
            index += result.byteNum;
        })

        costByteNums = index;

        expect(null).toEqual(null);

    });

    test('PageNodeParser parse function :', () => {

        let index = 0,
            receivedObj: any = {
                header: null,
                content: []
            }

        receivedObj.header = parser.parseHeader(buf, index);
        index += result.byteNum;

        for (let j = 0; j < 2; j++) {
            let obj: any = {};

            obj.point = parser.parsePoint(buf, index)
            index += result.byteNum;

            obj.key = parser.parseKey(buf, index)
            index += result.byteNum;

            obj.data = parser.parseData(buf, index)
            index += result.byteNum;

            receivedObj.content.push(obj);
        }

        expect(costByteNums).toEqual(index);
        expect(expectedObj).toEqual(receivedObj);

    });

})
