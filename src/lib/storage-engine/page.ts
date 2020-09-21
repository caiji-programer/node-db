import DBFile from './db-file';


class Page {

    constructor(file: DBFile, pos: number, buffer: Buffer) {
        this.file = file;
        this.pos = pos;
        this.pageKey = file.id + pos;
        this.buffer = buffer;
        this.isDirty = false;
    }

    static PAGE_SIZE: number = 4096;

    file: DBFile;

    pos: number;

    pageKey: string;

    buffer: Buffer;

    oldBuffer: Buffer;

    isDirty: boolean;

    makeDirty() {
        this.oldBuffer = this.buffer;
        this.isDirty = true;
    };

    // TODO delete
    release: () => void;

}

export class PageId {
    constructor(fileId: string, pos: number) {
        this.fileId = fileId;
        this.pos = pos;
        this.key = fileId + pos;
    }
    fileId: string;
    pos: number;
    key: string;
}

export default Page;
