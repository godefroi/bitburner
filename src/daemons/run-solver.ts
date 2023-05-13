import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";
import { DaemonCommand, Execute } from "@/_tools/daemon";
import { SOLVER_PORT } from "@/_tools/ports";

type ContractAnswer = (string | number | any[] | undefined);
type ContractSolver = (ns: NS, contract: ContractInfo) => ContractAnswer;

export async function main(ns: NS) {
	ns.disableLog("ALL");

	const commands: DaemonCommand<SolverFlags, SolverState>[] = [
		{
			command: "failed",
			helpText: "Show failed attempt information",
			handler: ShowFailedSolves,
		},
		{
			command: "unknown",
			helpText: "Show unknown type information",
			handler: ShowUnknownTypes,
		}
	];

	await Execute(ns, SOLVER_PORT, InitializeState, RunDaemon, commands, {});
}


type SolverState = {
	solvers: Record<string, ContractSolver>,
	failedSolves: ContractInfo[],
	unknownTypes: string[],
};


type SolverFlags = {

};


function InitializeState(ns: NS): SolverState {
	return {
		solvers: {
			"Algorithmic Stock Trader I":              AlgorithmicStockTraderI,
			"Algorithmic Stock Trader II":             AlgorithmicStockTraderII,
			"Algorithmic Stock Trader III":            AlgorithmicStockTraderIII,
			"Algorithmic Stock Trader IV":             AlgorithmicStockTraderIV,
			"Array Jumping Game":                      ArrayJumpingGame,
			"Array Jumping Game II":                   ArrayJumpingGameII,
			"Compression I: RLE Compression":          CompressionIRLECompression,
			"Compression II: LZ Decompression":        CompressionIILZDecompression,
			"Compression III: LZ Compression":         CompressionIIILZCompression,
			"Encryption I: Caesar Cipher":             EncryptionICaesarCipher,
			"Encryption II: Vigenère Cipher":          EncryptionIIVigenereCipher,
			"Find All Valid Math Expressions":         FindAllValidMathExpressions,
			"Find Largest Prime Factor":               FindLargestPrimeFactor,
			"Generate IP Addresses":                   GenerateIPAddresses,
			"HammingCodes: Encoded Binary to Integer": HammingCodesEncodedBinaryToInteger,
			"HammingCodes: Integer to Encoded Binary": HammingCodesIntegerToEncodedBinary,
			"Merge Overlapping Intervals":             MergeOverlappingIntervals,
			"Minimum Path Sum in a Triangle":          MinimumPathSumInATriangle,
			"Proper 2-Coloring of a Graph":            Proper2ColoringOfAGraph,
			"Sanitize Parentheses in Expression":      SanitizeParenthesesInExpression,
			"Shortest Path in a Grid":                 ShortestPathInAGrid,
			"Spiralize Matrix":                        SpiralizeMatrix,
			"Subarray with Maximum Sum":               SubarrayWithMaximumSum,
			"Total Ways to Sum":                       TotalWaysToSum,
			"Total Ways to Sum II":                    TotalWaysToSumII,
			"Unique Paths in a Grid I":                UniquePathsInAGridI,
			"Unique Paths in a Grid II":               UniquePathsInAGridII,
		},
		failedSolves: [],
		unknownTypes: [],
	};
}


async function RunDaemon(ns: NS, state: SolverState): Promise<number> {
	for (const c of FindContracts(ns)) {
		// if we've failed this contract, then skip it
		if (state.failedSolves.some(f => f.Filename == c.Filename && f.Server == c.Server && f.Type == c.Type)) {
			continue;
		}

		// if this contract is of an unknown type, then skip it
		if (state.unknownTypes.includes(c.Type)) {
			continue;
		}

		// if this contract is of an unknown type that we don't know about, record that type and skip it
		if (!Object.hasOwn(state.solvers, c.Type)) {
			state.unknownTypes.push(c.Type);
			continue;
		}

		// run the solver to get an answer
		const answer = state.solvers[c.Type](ns, c);

		// if our solver didn't return an answer, then we're probably testing it... just continue on
		if (answer == undefined) {
			continue;
		}

		const result = ns.codingcontract.attempt(answer, c.Filename, c.Server);

		if (result === "") {
			ns.print(`BAD ATTEMPT ${c.Server} (${c.Filename}) -> ${c.Type}`);
			state.failedSolves.push(c);
		} else {
			ns.print(result);						
		}
	}

	return 60000;
}


async function ShowFailedSolves(ns: NS, args: string[], flags: SolverFlags, state: SolverState) {
	for (const f of state.failedSolves) {
		ns.tprint(`FAILED: ${f.Type} on server ${f.Server} (file ${f.Filename})`);
	}
}


async function ShowUnknownTypes(ns: NS, args: string[], flags: SolverFlags, state: SolverState) {
	for (const f of state.unknownTypes) {
		ns.tprint(`UNKNOWN: ${f}`);
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


function AlgorithmicStockTraderII(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	let profit = 0;

	for (let p = 1; p < data.length; ++p) {
		profit += Math.max(data[p] - data[p - 1], 0)
	}

	return profit;	
}


function AlgorithmicStockTraderIII(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	return AlgorithmicStockTrader(data, 2);
}


function AlgorithmicStockTraderIV(ns: NS, contract: ContractInfo) {
	const data: any[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	return AlgorithmicStockTrader(data[1] as number[], data[0] as number);
}


function ArrayJumpingGame(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	let i = 0;

	for (let reach = 0; i < data.length && i <= reach; ++i) {
		reach = Math.max(i + data[i], reach);
	}

	return i === data.length ? 1 : 0;
}


function ArrayJumpingGameII(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	if (data[0] == 0) {
		return 0;
	}

	const n = data.length;
	let reach = 0;
	let jumps = 0;
	let lastJump = -1;

	while (reach < n - 1) {
		let jumpedFrom = -1;

		for (let i = reach; i > lastJump; i--) {
			if (i + data[i] > reach) {
				reach = i + data[i];
				jumpedFrom = i;
			}
		}

		if (jumpedFrom === -1) {
			jumps = 0;
			break;
		}

		lastJump = jumpedFrom;
		jumps++;
	}

	return jumps;
}


function CompressionIRLECompression(ns: NS, contract: ContractInfo) {
	const data: string = ns.codingcontract.getData(contract.Filename, contract.Server);

	return data.replace(/([\w])\1{0,8}/g, (group, chr) => group.length + chr);
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


function CompressionIIILZCompression(ns: NS, contract: ContractInfo) {
	const plain: string = ns.codingcontract.getData(contract.Filename, contract.Server);

	// for state[i][j]:
	//      if i is 0, we're adding a literal of length j
	//      else, we're adding a backreference of offset i and length j
	let curState: (string | null)[][] = Array.from(Array(10), () => Array<string | null>(10).fill(null));
	let newState: (string | null)[][] = Array.from(Array(10), () => Array<string | null>(10));

	function set(state: (string | null)[][], i: number, j: number, str: string): void {
		const current = state[i][j];
		if (current === null || str.length < current.length) {
			state[i][j] = str;
		} else if (str.length === current.length && Math.random() < 0.5) {
			// if two strings are the same length, pick randomly so that
			// we generate more possible inputs to Compression II
			state[i][j] = str;
		}
	}

	// initial state is a literal of length 1
	curState[0][1] = "";

	for (let i = 1; i < plain.length; ++i) {
		for (const row of newState) {
			row.fill(null);
		}
		const c = plain[i];

		// handle literals
		for (let length = 1; length <= 9; ++length) {
			const string = curState[0][length];
			if (string === null) {
				continue;
			}

			if (length < 9) {
				// extend current literal
				set(newState, 0, length + 1, string);
			} else {
				// start new literal
				set(newState, 0, 1, string + "9" + plain.substring(i - 9, i) + "0");
			}

			for (let offset = 1; offset <= Math.min(9, i); ++offset) {
				if (plain[i - offset] === c) {
					// start new backreference
					set(newState, offset, 1, string + String(length) + plain.substring(i - length, i));
				}
			}
		}

		// handle backreferences
		for (let offset = 1; offset <= 9; ++offset) {
			for (let length = 1; length <= 9; ++length) {
				const string = curState[offset][length];
				if (string === null) {
					continue;
				}

				if (plain[i - offset] === c) {
					if (length < 9) {
						// extend current backreference
						set(newState, offset, length + 1, string);
					} else {
						// start new backreference
						set(newState, offset, 1, string + "9" + String(offset) + "0");
					}
				}

				// start new literal
				set(newState, 0, 1, string + String(length) + String(offset));

				// end current backreference and start new backreference
				for (let newOffset = 1; newOffset <= Math.min(9, i); ++newOffset) {
					if (plain[i - newOffset] === c) {
						set(newState, newOffset, 1, string + String(length) + String(offset) + "0");
					}
				}
			}
		}

		const tmpState = newState;
		newState = curState;
		curState = tmpState;
	}

	let result = null;

	for (let len = 1; len <= 9; ++len) {
		let string = curState[0][len];
		if (string === null) {
			continue;
		}

		string += String(len) + plain.substring(plain.length - len, plain.length);
		if (result === null || string.length < result.length) {
			result = string;
		} else if (string.length === result.length && Math.random() < 0.5) {
			result = string;
		}
	}

	for (let offset = 1; offset <= 9; ++offset) {
		for (let len = 1; len <= 9; ++len) {
			let string = curState[offset][len];
			if (string === null) {
				continue;
			}

			string += String(len) + "" + String(offset);
			if (result === null || string.length < result.length) {
				result = string;
			} else if (string.length === result.length && Math.random() < 0.5) {
				result = string;
			}
		}
	}

	return result ?? "";
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


function FindAllValidMathExpressions(ns: NS, contract: ContractInfo) {
	let [num, target]: [string, number] = ns.codingcontract.getData(contract.Filename, contract.Server);

	function helper(res: string[], path: string, num: string, target: number, pos: number, evaluated: number, multed: number): void {
		if (pos === num.length) {
			if (target === evaluated) {
				res.push(path);
			}
			return;
		}

		for (let i = pos; i < num.length; ++i) {
			if (i != pos && num[pos] == "0") {
				break;
			}
			const cur = parseInt(num.substring(pos, i + 1));

			if (pos === 0) {
				helper(res, path + cur, num, target, i + 1, cur, cur);
			} else {
				helper(res, path + "+" + cur, num, target, i + 1, evaluated + cur, cur);
				helper(res, path + "-" + cur, num, target, i + 1, evaluated - cur, -cur);
				helper(res, path + "*" + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
			}
		}
	}

	const result: string[] = [];

	helper(result, "", num, target, 0, 0, 0);

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


function GenerateIPAddresses(ns: NS, contract: ContractInfo) {
	const data: string = ns.codingcontract.getData(contract.Filename, contract.Server);
	const input = data.split("").map(d => parseInt(d, 10));
	const results: string[] = [];

	function generateIps(ip = "", position = 0, quads = 0, currentQuad = 0, lastDigit: number | null = null) {
		if (quads > 3 || currentQuad >= 256) {
			return;
		}

		if (position === input.length) {
			results.push(ip);
			return;
		}

		// concatenate if not leading zero
		if (!(currentQuad === 0 && lastDigit === 0)) {
			const updatedQuad = currentQuad * 10 + input[position]
			if (updatedQuad < 256) {
				generateIps(`${ip}${input[position]}`, position + 1, quads, updatedQuad, input[position]);
			}
		}

		// start new dotted quad
		if (position > 0 && quads < 3) {
			generateIps(`${ip}.${input[position]}`, position + 1, quads + 1, input[position], input[position])
		}
	}

	generateIps();

	results.sort();
	return results;
	return undefined;
}


function HammingCodesEncodedBinaryToInteger(ns: NS, contract: ContractInfo) {
	const data: string = ns.codingcontract.getData(contract.Filename, contract.Server);

	//check for altered bit and decode
	const build = data.split(""); // ye, an array for working, again
	const testArray = []; //for the "truthtable". if any is false, the data has an altered bit, will check for and fix it
	const sumParity = Math.ceil(Math.log2(data.length)); // sum of parity for later use
	const count = (arr: string[], val: string) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);
	// the count.... again ;)
	let overallParity = build.splice(0, 1).join(""); // store first index, for checking in next step and fix the build properly later on
	testArray.push(overallParity == (count(build, "1") % 2).toString() ? true : false); // first check with the overall parity bit

	for (let i = 0; i < sumParity; i++) {
		// for the rest of the remaining parity bits we also "check"
		const tempIndex = Math.pow(2, i) - 1; // get the parityBits Index
		const tempStep = tempIndex + 1; // set the stepsize
		const tempData = [...build]; // get a "copy" of the build-data for working
		const tempArray = []; // init empty array for "testing"
		while (tempData[tempIndex] != undefined) {
			// extract from the copied data until the "starting" index is undefined
			const temp = [...tempData.splice(tempIndex, tempStep * 2)]; // extract 2*stepsize
			tempArray.push(...temp.splice(0, tempStep)); // and cut again for keeping first half
		}
		const tempParity = tempArray.shift(); // and again save the first index separated for checking with the rest of the data
		testArray.push(tempParity == (count(tempArray, "1") % 2).toString() ? true : false);
		// is the tempParity the calculated data? push answer into the 'truthtable'
	}

	let fixIndex = 0; // init the "fixing" index and start with 0

	for (let i = 1; i < sumParity + 1; i++) {
		// simple binary adding for every boolean in the testArray, starting from 2nd index of it
		fixIndex += testArray[i] ? 0 : Math.pow(2, i) / 2;
	}

	build.unshift(overallParity); // now we need the "overall" parity back in it's place

	// try fix the actual encoded binary string if there is an error
	if (fixIndex > 0 && testArray[0] == false) { // if the overall is false and the sum of calculated values is greater equal 0, fix the corresponding hamming-bit           
		build[fixIndex] = build[fixIndex] == "0" ? "1" : "0";
	} else if (testArray[0] == false) { // otherwise, if the the overallparity is the only wrong, fix that one           
		overallParity = overallParity == "0" ? "1" : "0";
	} else if (testArray[0] == true && testArray.some((truth) => truth == false)) {
		return 0; // ERROR: There's some strange going on... 2 bits are altered? How? This should not happen
	}

	// oof.. halfway through... we fixed an possible altered bit, now "extract" the parity-bits from the build
	for (let i = sumParity; i >= 0; i--) {
		// start from the last parity down the 2nd index one
		build.splice(Math.pow(2, i), 1);
	}

	build.splice(0, 1); // remove the overall parity bit and we have our binary value

	return parseInt(build.join(""), 2); // parse the integer with radix 2 and we're done!
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


function MergeOverlappingIntervals(ns: NS, contract: ContractInfo) {
	const data: number[][] = ns.codingcontract.getData(contract.Filename, contract.Server);
	const intervals = data.sort((a, b) => a[0] - b[0]);
	const result: number[][] = [];
	let start: number = intervals[0][0];
	let end: number = intervals[0][1];

	for (const interval of intervals) {
		if (interval[0] <= end) {
			end = Math.max(end, interval[1]);
		} else {
			result.push([start, end]);
			start = interval[0];
			end = interval[1];
		}
	}

	result.push([start, end]);

	return result;
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


function Proper2ColoringOfAGraph(ns: NS, contract: ContractInfo) {
	type GraphEdgeList = [number, Array<[number, number]>];
	interface ColorNode { id: number, edges: Set<number>, color: number | null };

	const data: GraphEdgeList = ns.codingcontract.getData(contract.Filename, contract.Server);
	const [nodeCount, edges] = data;

	function colorNode(graph: ColorNode[], id: number, color: number = 0): boolean {
		const node = graph[id];
		let valid = true;

		if (node.color === null) {
			node.color = color;

			for (const edge of node.edges) {
				valid &&= colorNode(graph, edge, color === 0 ? 1 : 0);
			}

			return valid;
		} else if (node.color === color) {
			return true;
		} else {
			return false;
		}
	}

	const graph = Array.from(new Array(nodeCount), (_v, i) => ({ id: i, edges: new Set(), color: null } as ColorNode));

	for (const [a, b] of edges) {
		graph[a].edges.add(b);
		graph[b].edges.add(a);
	}

	let valid = colorNode(graph, 0, 0);

	if (valid) {
		let uncolored = graph.filter((node) => node.color === null);

		while (uncolored.length) {
			valid &&= colorNode(graph, uncolored[0].id, 0);
			uncolored = graph.filter((node) => node.color === null);
		}
	}

	if (valid) {
		return graph.map((node) => node.color);
	} else {
		return [];
	}
}


function SanitizeParenthesesInExpression(ns: NS, contract: ContractInfo) {
	const data: string = ns.codingcontract.getData(contract.Filename, contract.Server);

	let left = 0;
	let right = 0;
	const res: string[] = [];

	for (let i = 0; i < data.length; ++i) {
		if (data[i] === "(") {
			++left;
		} else if (data[i] === ")") {
			left > 0 ? --left : ++right;
		}
	}

	function dfs(pair: number, index: number, left: number, right: number, s: string, solution: string, res: string[]): void {
		if (s.length === index) {
			if (left === 0 && right === 0 && pair === 0) {
				for (let i = 0; i < res.length; i++) {
					if (res[i] === solution) {
						return;
					}
				}
				res.push(solution);
			}
			return;
		}

		if (s[index] === "(") {
			if (left > 0) {
				dfs(pair, index + 1, left - 1, right, s, solution, res);
			}
			dfs(pair + 1, index + 1, left, right, s, solution + s[index], res);
		} else if (s[index] === ")") {
			if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res);
			if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res);
		} else {
			dfs(pair, index + 1, left, right, s, solution + s[index], res);
		}
	}

	dfs(0, 0, left, right, data, "", res);

	return res;
}


function ShortestPathInAGrid(ns: NS, contract: ContractInfo) {
	const data: number[][] = ns.codingcontract.getData(contract.Filename, contract.Server);
	const width    = data[0].length;
	const height   = data.length;
	const dstY     = height - 1;
	const dstX     = width - 1;
	const distance = new Array(height);
	const queue: [number, number][] = [];

	for (let y = 0; y < height; y++) {
		distance[y] = new Array(width).fill(Infinity);
		//prev[y] = new Array(width).fill(undefined) as [undefined];
	}

	function validPosition(y: number, x: number) {
		return y >= 0 && y < height && x >= 0 && x < width && data[y][x] == 0;
	}

	// List in-bounds and passable neighbors
	function* neighbors(y: number, x: number) {
		if (validPosition(y - 1, x)) yield [y - 1, x]; // Up
		if (validPosition(y + 1, x)) yield [y + 1, x]; // Down
		if (validPosition(y, x - 1)) yield [y, x - 1]; // Left
		if (validPosition(y, x + 1)) yield [y, x + 1]; // Right
	}

	// Prepare starting point
	distance[0][0] = 0;

	//Simplified version. d < distance[yN][xN] should never happen for BFS if d != infinity, so we skip changeweight and simplify implementation
	//algo always expands shortest path, distance != infinity means a <= lenght path reaches it, only remaining case to solve is infinity    
	queue.push([0, 0]);
	while (queue.length > 0) {
		const [y, x] = queue.shift()!;
		for (const [yN, xN] of neighbors(y, x)) {
			if (distance[yN][xN] == Infinity) {
				queue.push([yN, xN])
				distance[yN][xN] = distance[y][x] + 1
			}
		}
	}

	// No path at all?
	if (distance[dstY][dstX] == Infinity) return "";

	//trace a path back to start
	let path = ""
	let [yC, xC] = [dstY, dstX]
	while (xC != 0 || yC != 0) {
		const dist = distance[yC][xC];
		for (const [yF, xF] of neighbors(yC, xC)) {
			if (distance[yF][xF] == dist - 1) {
				path = (xC == xF ? (yC == yF + 1 ? "D" : "U") : (xC == xF + 1 ? "R" : "L")) + path;
				[yC, xC] = [yF, xF]
				break
			}
		}
	}

	return path;
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


function SubarrayWithMaximumSum(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	for (let i = 1; i < data.length; i++) {
		data[i] = Math.max(data[i], data[i] + data[i - 1]);
	}

	return Math.max(...data);
}


function TotalWaysToSum(ns: NS, contract: ContractInfo) {
	const data: number = ns.codingcontract.getData(contract.Filename, contract.Server);
	const ways: number[] = [1];

	ways.length = data + 1;
	ways.fill(0, 1);

	for (let i = 1; i < data; ++i) {
		for (let j: number = i; j <= data; ++j) {
			ways[j] += ways[j - i];
		}
	}

	return ways[data];
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


function UniquePathsInAGridI(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	const [n, m] = data; // Number of [rows, columns]
	const currentRow = [];
	currentRow.length = n;

	for (let i = 0; i < n; i++) {
		currentRow[i] = 1;
	}

	for (let row = 1; row < m; row++) {
		for (let i = 1; i < n; i++) {
			currentRow[i] += currentRow[i - 1];
		}
	}

	return currentRow[n - 1];
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
