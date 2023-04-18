import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";

type ContractAnswer = (string | number | any[] | undefined);
type ContractSolver = (ns: NS, contract: ContractInfo) => ContractAnswer;

export async function main(ns: NS) {
	const slvers: Record<string, ContractSolver> = {
		"Algorithmic Stock Trader III":   AlgorithmicStockTraderIII,
		"Algorithmic Stock Trader IV":    AlgorithmicStockTraderIV,
		"Minimum Path Sum in a Triangle": MinimumPathSumInATriangle,
		"Spiralize Matrix":               SpiralizeMatrix,
		"Total Ways to Sum II":           TotalWaysToSumII,
		"Unique Paths in a Grid II":      UniquePathsInAGridII,
	};

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


function AlgorithmicStockTraderIII(ns: NS, contract: ContractInfo) {
	const data: number[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	return AlgorithmicStockTrader(data, 2);
}


function AlgorithmicStockTraderIV(ns: NS, contract: ContractInfo) {
	const data: any[] = ns.codingcontract.getData(contract.Filename, contract.Server);

	return AlgorithmicStockTrader(data[1] as number[], data[0] as number);
}


function LargestPrimeFactor(number: number) {
	let i = 2;

	while (number > 1) {
		if (number % i == 0) {
			number /= i;
		} else {
			i += 1;
		}
	}

	return i;
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
