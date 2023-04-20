import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";

type ContractAnswer = (string | number | any[] | undefined);
type ContractSolver = (ns: NS, contract: ContractInfo) => ContractAnswer;

export async function main(ns: NS) {
	const flags = ns.flags([
		["once", false]]);

	const once = Boolean(flags["once"]);
	const slvers: Record<string, ContractSolver> = {
		"Algorithmic Stock Trader I":              AlgorithmicStockTraderI,
		"Algorithmic Stock Trader III":            AlgorithmicStockTraderIII,
		"Algorithmic Stock Trader IV":             AlgorithmicStockTraderIV,
		"Compression II: LZ Decompression":        CompressionIILZDecompression,
		"Encryption I: Caesar Cipher":             EncryptionICaesarCipher,
		"Encryption II: Vigenère Cipher":          EncryptionIIVigenereCipher,
		"Find Largest Prime Factor":               FindLargestPrimeFactor,
		"HammingCodes: Integer to Encoded Binary": HammingCodesIntegerToEncodedBinary,
		"Minimum Path Sum in a Triangle":          MinimumPathSumInATriangle,
		"Sanitize Parentheses in Expression":      SanitizeParenthesesInExpression,
		"Spiralize Matrix":                        SpiralizeMatrix,
		"Total Ways to Sum II":                    TotalWaysToSumII,
		"Unique Paths in a Grid II":               UniquePathsInAGridII,
	};

	if (!once) {
		ns.tprint("Monitoring for contracts...");
	}
	
	while (true) {
		for (const c of FindContracts(ns)) {
			if (Object.hasOwn(slvers, c.Type)) {
				const answer = slvers[c.Type](ns, c);
				if (answer != undefined) {
					ns.tprint(ns.codingcontract.attempt(answer, c.Filename, c.Server));
				}
			} else {
				ns.tprint(`${c.Server} (${c.Filename}) -> ${c.Type}`);
				ns.codingcontract.attempt
			}
		}

		if (once) {
			break;
		}

		await ns.sleep(30000);
	}
}


function FindContracts(ns: NS): ContractInfo[] {
	return ExploreServers(ns)
		.flatMap(server => ns
			.ls(server, ".cct")
			.map(fileName => new ContractInfo(server, fileName, ns.codingcontract.getContractType(fileName, server))));
}


function AlgorithmicStockTrader(prices: number[], n = 1, s = 0, cache: Record<string, number> = {}) {
	let split = 0;
	const key = `${s},${prices.length},${n}`;

	if (cache[key]) {
		return cache[key];
	}

	if (n > 1) {
		for (let i = 2; i < prices.length; i++) {
			const left  = prices.slice(0, i);
			const right = prices.slice(i);
			const value = AlgorithmicStockTrader(left, 1, s, cache) + AlgorithmicStockTrader(right, n - 1, s + i, cache);
			split = Math.max(split, value);
		}
	}

	let min = Infinity;
	let pro = 0;

	for (const price of prices) {
		min = Math.min(min, price);
		pro = Math.max(pro, price - min);
	}

	return cache[key] = Math.max(pro, split);
}


function AlgorithmicStockTraderI(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	return AlgorithmicStockTrader(data, 1);
}


function AlgorithmicStockTraderIII(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	return AlgorithmicStockTrader(data, 2);
}


function AlgorithmicStockTraderIV(ns: NS, contract: ContractInfo) {
	const data: any[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	return AlgorithmicStockTrader(data[1] as number[], data[0] as number);
}


function CompressionIILZDecompression(ns: NS, contract: ContractInfo) {
	const encoded: string = ns.codingcontract.getData(contract.Filename, contract.Server);

	let decoded = '';
	let chunkType: 'direct' | 'referent' = 'direct';
	let encodedPosition = 0;

	while (encodedPosition < encoded.length) {
		const length = encoded.charCodeAt(encodedPosition) - '0'.charCodeAt(0);

		if (length > 9 || length < 0) {
			throw new Error(`${encoded.charAt(encodedPosition)} is out of ASCII range 0-9 at position ${encodedPosition}`);
		}

		switch (chunkType) {
			case 'direct':
				if (length > encoded.length - encodedPosition - 1) {
					// last chunk may be referent, try again in the other mode
					chunkType = 'referent';
					break;
				}

				if (length > 0) {
					decoded = decoded + encoded.slice(encodedPosition + 1, encodedPosition + length + 1);
				}

				encodedPosition += 1 + length;
				chunkType = 'referent';
				break;
			case 'referent':
				if (length === 0) {
					encodedPosition++;
					chunkType = 'direct';
					break;
				}

				const backlength = encoded.charCodeAt(encodedPosition + 1) - '0'.charCodeAt(0);

				if (backlength > 9 || backlength < 0) {
					if (length === encoded.length - encodedPosition - 1) {
						// last chunk may be direct
						chunkType = 'direct';
						break;
					}
					throw new Error(`${encoded.charAt(encodedPosition + 1)} is out of ASCII range 0-9 at position ${encodedPosition + 1}`);
				}

				const endChunk = decoded.slice(-backlength);

				if (endChunk.length >= length) {
					decoded = decoded + endChunk.slice(0, length);
				} else {
					let chunk = ''
					for (let i = 0; i < length; i++) {
						chunk = chunk + endChunk.charAt(i % endChunk.length)
					}
					decoded = decoded + chunk;
				}
				encodedPosition += 2;
				chunkType = 'direct';
				break;
		}
	}

	return decoded;
	//return undefined;
}


function EncryptionICaesarCipher(ns: NS, contract: ContractInfo) {
	const data: any[]      = ns.codingcontract.getData(contract.Filename, contract.Server);
	const text: string     = data[0];
	const shift: number    = data[1];
	const result: string[] = text
		.split("")
		.map(c => c == " " ? c : String.fromCharCode((c.charCodeAt(0) - 65 + (26 - shift)) % 26 + 65));

	return result.join("");
}


function EncryptionIIVigenereCipher(ns: NS, contract: ContractInfo) {
	const [text, password]: [string, string] = ns.codingcontract.getData(contract.Filename, contract.Server);

	const pw     = password.split("");
	const pwChar = () => { pw.push(pw[0]); return pw.shift() as string; };
	const cypher = (char: string, shift: number) => String.fromCharCode((char.charCodeAt(0) - 65 + shift) % 26 + 65);
	const lookup = (c1: string, c2: string) => cypher(c2, c1.charCodeAt(0) - 65);

	const result = text.split("")
		.map(ch => lookup(ch, pwChar()))
		.join("");

	return result;
}


function FindLargestPrimeFactor(ns: NS, contract: ContractInfo) {
	let num: number = ns.codingcontract.getData(contract.Filename, contract.Server);

	for (let f = 2; f * f < num; f++) {
		while (num % f === 0) {
			num /= f;
		}
	}

	return num;
}


function HammingCodesIntegerToEncodedBinary(ns: NS, contract: ContractInfo) {
	const num: number = ns.codingcontract.getData(contract.Filename, contract.Server);
	const digits = num.toString(2).split('').map(s => Number(s));
	const encoded = [0];

	let pow = 1;

	for (let i = 1; digits.length > 0; i++) {
		if (i === pow) {
			encoded[i] = 0;
			pow *= 2;
		} else {
			const nextDigit = digits.shift();

			if (nextDigit == undefined) {
				throw "There wasn't a digit.";
			}

			encoded[i] = +nextDigit;
		}
	}

	pow /= 2;

	for (let i = encoded.length - 1; i > 0; i--) {
		if (encoded[i]) {
			encoded[0] ^= 1;
		}

		if (i === pow) {
			pow /= 2;
		} else if (encoded[i]) {
			for (let p = pow; p > 0; p >>= 1) {
				if (i & p) {
					encoded[p] ^= 1;
				}
			}
		}
	}

	return encoded.join("");
}


function MinimumPathSumInATriangle(ns: NS, contract: ContractInfo) {
	const data: number[][] = ns.codingcontract.getData(contract.Filename, contract.Server);
	// const data = [
	// 	   [2],
	// 	  [3,4],
	// 	 [6,5,7],
	// 	[4,1,8,3]
	// ]; //The minimum path sum is 11 (2 -> 3 -> 5 -> 1).

	const n      = data.length;
	const result = data[n - 1].slice();

	for (let i = n - 2; i > -1; --i) {
		for (let j = 0; j < data[i].length; ++j) {
			result[j] = Math.min(result[j], result[j + 1]) + data[i][j];
		}
	}

	return result[0];
}


function SanitizeParenthesesInExpression(ns: NS, contract: ContractInfo) {
	const data:string = ns.codingcontract.getData(contract.Filename, contract.Server);

	const isValid = (input: string): boolean => {
		const stack: string[] = [];

		for (let i = 0; i < input.length; i++) {
			if (input[i] == '(') {
				stack.push(input[i]);
			} else if (input[i] == ')' && !stack.pop()) {
				return false;
			}
		}

		return stack.length === 0;
	};

	const permute = (input: string, changeCount: number): string[] => {
		const fixedStrings: string[] = [];

		for (let i = 0; i < input.length; i++) {
			// recursively remove a letter until changeCount is 0
			if (input[i] === '(' || input[i] === ')') {
				const newStr = input.substring(0, i) + input.substring(i + 1);
				if (changeCount > 0) {
					fixedStrings.push(...permute(newStr, changeCount - 1));
				} else if (isValid(newStr)) {
					fixedStrings.push(newStr);
				}
			}
		}

		return fixedStrings.filter((s, i) => fixedStrings.indexOf(s) === i); // dedupe before returning
	};

	for (let i = 1; i < 10; i++) {
		const strings = permute(data, i);

		if (strings.length) {
			//return strings;
			ns.tprint(JSON.stringify(strings));
			return undefined;
		}
	}

	throw new Error("Unable to find a valid string with <10 changes");

	ns.tprint(JSON.stringify(data));
	return undefined;
}


function SpiralizeMatrix(ns: NS, contract: ContractInfo) {
	type Direction  = ("up" | "down" | "left" | "right");
	type Transform  = {x: number, y: number, next: Direction};
	type Coordinate = {x: number, y: number};

	const transforms: Record<Direction, Transform> = {
		"up":    {x:  0, y: -1, next: "right"},
		"down":  {x:  0, y:  1, next: "left"},
		"left":  {x: -1, y:  0, next: "up"},
		"right": {x:  1, y:  0, next: "down"},
	}

	//ns.tprint(JSON.stringify(ns.codingcontract.getData(contract.Filename, contract.Server)));
	//return;
	const matrix: number[][] = ns.codingcontract.getData(contract.Filename, contract.Server);

	// const matrix = [
	// 	[1, 2, 3],
	// 	[4, 5, 6],
	// 	[7, 8, 9],
	// ]; // Answer: [1, 2, 3, 6, 9, 8 ,7, 4, 5]

	// const matrix = [
	// 	[1,  2,  3,  4],
	// 	[5,  6,  7,  8],
	// 	[9, 10, 11, 12],
	// ]; // Answer: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]

	let currentPosition: Coordinate = {x: 0, y: 0};
	let currentTransform            = transforms.right;
	let steps                       = 0;
	let lastSuccess                 = 0;

	const visitedPositions     = new Set<string>([`${currentPosition.x},${currentPosition.y}`]);
	const spiralized: number[] = [matrix[currentPosition.y][currentPosition.x]];

	while (true) {
		steps++;

		// just in case things spiral out of control...
		if (steps > 1000) {
			break;
		}

		// if we're not making progress, we can assume we're done
		if (steps - lastSuccess > 4) {
			break;
		}

		const newPosition = {x: currentPosition.x + currentTransform.x, y: currentPosition.y + currentTransform.y};
		//ns.tprint(`new position is ${JSON.stringify(newPosition)}`);

		// if we're off the edge, switch to the next transform
		if (newPosition.x < 0 || newPosition.y < 0 ||newPosition.y >= matrix.length || newPosition.x >= matrix[newPosition.y].length) {
			//ns.tprint(`off edge, switching to transform ${currentTransform.next}`);
			currentTransform = transforms[currentTransform.next];
			continue;
		}

		// if we've already been there, switch to the next transform
		if (visitedPositions.has(`${newPosition.x},${newPosition.y}`)) {
			//ns.tprint(`already visited, switching to transform ${currentTransform.next}`);
			currentTransform = transforms[currentTransform.next];
			continue;
		}

		// add the value of this new position to the answer
		spiralized.push(matrix[newPosition.y][newPosition.x]);

		// and track the fact we've been here
		visitedPositions.add(`${newPosition.x},${newPosition.y}`);

		// update our position
		currentPosition = newPosition;

		// and keep track of how many steps we've tried since we succeeded
		lastSuccess = steps;
	}

	//ns.tprint(JSON.stringify(spiralized));
	//return;

	return spiralized;
}


function TotalWaysToSumII(ns: NS, contract: ContractInfo) {
	const data: any[]       = ns.codingcontract.getData(contract.Filename, contract.Server);
	const target: number    = data[0];
	const numbers: number[] = data[1];

	//ns.tprint(target);
	//ns.tprint(JSON.stringify(numbers));

	const computeSumPermutationsII = (tgt: number, set: number[], max = set.length - 1, cache: Record<string, number> = {}) => {
		let key = `${tgt},${max}`;

		if (cache[key] != null) {
			return cache[key]
		} else if (max === 0) {
			return +(tgt % set[max] === 0)
		}

		let outcomes = 0;
		let item = set[max];

		for (let i = Math.floor(tgt / item); i >= 0; i--) {
			outcomes += computeSumPermutationsII(tgt - item * i, set, max - 1, cache);
		}

		cache[key] = outcomes;

		return outcomes;
	}

	return computeSumPermutationsII(target, numbers);
}


function UniquePathsInAGridII(ns: NS, contract: ContractInfo) {
	const map: number[][] = ns.codingcontract.getData(contract.Filename, contract.Server);

	function findPaths(x: number, y: number){
		let totalPaths = 0;

		if (x < map[0].length - 1 && map[y][x + 1] === 0) {
			totalPaths += findPaths(x + 1, y);
		}

		if (y < map.length - 1 && map[y + 1][x] === 0) {
			totalPaths += findPaths( x, y + 1);
		}
	  
		if (x === map[0].length - 1 && y === map.length - 1){
			return 1;
		}

		return totalPaths;
	}

	return findPaths(0, 0);
}


class ContractInfo {
	Server: string;
	Filename: string;
	Type: string;

	constructor(server: string, filename: string, type: string) {
		this.Server   = server;
		this.Filename = filename;
		this.Type     = type;
	}
}
