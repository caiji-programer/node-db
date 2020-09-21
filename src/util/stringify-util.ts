
enum Direction { LEFT = "left", RIGHT = "right", CENTER = "center" };

const stringify = {

	// 生成重复的字符
	generateRepeatString(len, word?) {
		if (len <= 0) return "";
		let i = 0, str = "";
		word = word || " ";
		for (let i = 0; i < len; i++) {
			str += word;
		}
		return str
	},

	// 对齐字符串（方向：左、中、右）
	alignString(str: string, len: number, direction?) {
		//
		if (!str) {
			return stringify.generateRepeatString(len)
		}

		if (str.length > len) {
			return str.slice(0, len - 3) + "...";
		}

		direction = direction || Direction.CENTER;

		if (direction === Direction.RIGHT) {
			return stringify.generateRepeatString(len - str.length) + str;
		} else if (direction === Direction.CENTER) {
			str = stringify.generateRepeatString(Math.floor((len - str.length) / 2)) + str;
		}

		return str + stringify.generateRepeatString(len - str.length)
	}
}

export default stringify;
