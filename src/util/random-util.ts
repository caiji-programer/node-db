
const random = {

    number(end: number, start?: number): number {
        start = start || 0;
        return start + Math.floor(Math.random() * (end - start));
    },

    // 
    array(num: number, end: number, start?: number) {
        let result: number[] = [];
        for (let index = 0; index < num; index++) {
            result.push(random.number(end, start));
        }
        return result;
    },

    // Distinct
    distinctArray(num: number, end: number, start?: number): number[] {
        let map = new Map<number, true>();
        let temp: number, count = 0, result: number[] = [];
        while (count <= num) {
            temp = random.number(end, start);
            if (map.has(temp)) continue;
            result.push(temp);
            map.set(temp, true);
            count++;
        }
        return result;
    }
}

export default random;
