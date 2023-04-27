import { NS } from "@ns";

let before = 0;
let beforeTime = 0;

export async function main(ns: NS) {
	ns.clearLog(); ns.disableLog("ALL"); ns.tail(); await ns.sleep(1); ns.resizeTail(300, 200);

	goToCasino(ns);
	startCoinFlip();
	while (ns.getMoneySources().sinceInstall.casino < 10_000_000_000) {

		ns.clearLog();
		ns.print("GETTING SEQUENCE");

		try {
			setMoneyInput(-1);

			const { tails, heads } = getHeadTailButtonRefs();

			const sequence = await getSequence(ns, tails);

			console.log("SEQ", sequence);

			await validateSequence(ns, sequence, tails);
			await validateSequence(ns, sequence, tails);

			console.log("SEQ VALID");

			setMoneyInput(10000);

			before = ns.getMoneySources().sinceInstall.casino;
			beforeTime = performance.now();

			await executeSequence(ns, sequence, tails, heads);
		} catch (e) {
			console.error("COIN FLIP ERROR! REBASE!");
			console.error(e);
		}

		await ns.sleep(500);
	}
}


function money(money: number, digits: number) {
	const minus = money < 0;
	if (minus) money *= -1;
	const lookup = [
		{ value: 1,
			symbol: "" },
		{ value: 1_000,
			symbol: "k" },
		{ value: 1_000_000,
			symbol: "m" },
		{ value: 1_000_000_000,
			symbol: "b" },
		{ value: 1_000_000_000_000,
			symbol: "t" },
		{ value: 1_000_000_000_000_000,
			symbol: "q" },
		{ value: 1_000_000_000_000_000_000,
			symbol: "Q" }
	];
	const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
	const item = lookup.slice().reverse().find(function(item) {
		return money >= item.value;
	});
	return (minus ? "-" : "") + (item ? (money / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0");
}


function tFormatter(ticks: number, simple = true) {
	if (simple) return `${(ticks / 1000).toFixed(2)}s`;
	
	const date = new Date(ticks);
	
	const seconds = date.getSeconds();
	const millis = date.getMilliseconds();
	const minutes = date.getMinutes();
	const hours = date.getHours();
	const days = date.getDate();

	if (date.getMonth() > 0) return "Over a month. Do you really want to wait?";

	const dString = days !== 0 ? `${days}d ` : "";
	const hString = hours !== 0 ? `${hours}h ` : "";
	const mString = minutes !== 0 ? `${minutes}m ` : "";
	const sString = seconds !== 0 ? `${seconds}s ` : "";
	const msString = millis !== 0 ? `${millis}ms ` : "";

	return dString + hString + mString + sString + msString;
}


function progressBar(percentage: number, size: number) {
	const lit = Math.round(percentage * size);
	const unLit = size - lit;
	return `[${String("").padEnd(lit, "|")}${String("").padEnd(unLit, "-")}]`;
}


export function goToCasino(ns: NS) {
	if (ns.getPlayer().city !== "Aevum" && !ns.singularity.travelToCity("Aevum")) throw new Error("Could not get to Aevum!");
	if (!ns.singularity.goToLocation("Iker Molina Casino")) throw new Error("Could not get to the casino!");
}

export function startCoinFlip() {
	const doc = eval("document") as Document;
	const allButtons = doc.querySelectorAll("button");
	const coinFlip = Array.from(allButtons).find(b => b.textContent?.toLowerCase() === "play coin flip");
	if (coinFlip === undefined) throw new Error("Could not find coin flip game!");
	clickButton(coinFlip);
}

export function getHeadTailButtonRefs() {
	const doc = eval("document") as Document;
	const allButtons = doc.querySelectorAll("button");
	const tails = Array.from(allButtons).find(b => b.textContent?.toLowerCase() === "tail!");
	const heads = Array.from(allButtons).find(b => b.textContent?.toLowerCase() === "head!");
	if (tails === undefined || heads === undefined) throw new Error("Could not find heads and tails!");
	return {
		tails,
		heads
	};
}

export async function getSequence(ns: NS, tails: HTMLButtonElement) {
	const sequence = new Array<string>();
	for (let i = 0; i < 1024; i++) {
		clickButton(tails);
		const result = findResult();
		if (result.textContent === null) throw new Error("Got result with no text content!");
		sequence.push(result.textContent);
		await ns.asleep(1);
	}
	return sequence;
}

export async function validateSequence(ns: NS, sequence: Array<string>, tails: HTMLButtonElement) {
	for (let i = 0; i < 1024; i++) {
		clickButton(tails);
		const result = findResult();
		if (result.textContent === null) throw new Error("Got result with no text content!");
		if (sequence[i] !== result.textContent) throw new Error(`Sequence at Pos #${i} does not match with result! ${sequence[i]} : ${result.textContent}`);
	}
}

export async function executeSequence(ns: NS, sequence: Array<string>, tails: HTMLButtonElement, heads: HTMLButtonElement) {
	let rounds = 0;

	while (ns.getMoneySources().sinceInstall.casino < 10_000_000_000) {
		const value = sequence[rounds++ % 1024];
		if (value === "T") clickButton(tails);
		else 							 clickButton(heads);

		if (!hasWon()) throw new Error(`Something went wrong! Lost with sequence pos #${(rounds - 1) % 1024}! Expected ${value}, Bet on ${value === "T" ? "Tails" : "Heads"}!`);
		
		if (rounds % 500 === 0) {
			display(ns);
			await ns.asleep(1);
		}
	}
}

export function display(ns: NS) {
	//
	//	Current Progress:
	//	[||||||-----------------] 25%
	//
	//	Estimated Time:
	//	5 min 23 sec
	//
	//	Money Gotten:
	//	5.83b

	const income = getIncome(ns);
	const moneyTotal = ns.getMoneySources().sinceInstall.casino;
	const left = 10_000_000_000 - moneyTotal;
	const ticksRemaining = left / income;
	const p = moneyTotal / 10_000_000_000;
	const bar = progressBar(p, 20);

	ns.clearLog();
	ns.print("┌────────────────────────────┐");
	ns.print("│ Current Progress           │");
	ns.print(`│ ${bar} ${Math.floor(p * 100)}%`.padEnd(29, " ") + "│");
	ns.print("│                            │");
	ns.print("│ Estimated Time             │");
	ns.print(`│ ${tFormatter(ticksRemaining, false)}`.padEnd(29, " ") + "│");
	ns.print("│                            │");
	ns.print("│ Money Gotten:              │");
	ns.print(`│ ${money(moneyTotal, 2)}`.padEnd(29, " ") + "│");
	ns.print("└────────────────────────────┘");
	ns.print("INCOME: ", income);
}

export function getIncome(ns: NS) {
	// Change = delta money / delta time
	// Change = (money2 - money1) / (time2 - time1)

	const m2 = ns.getMoneySources().sinceInstall.casino;
	const t = performance.now();

	const t1 = new Date(beforeTime);
	const t2 = new Date(t);
	const time = t2.getTime() - t1.getTime();

	const perTick = (m2 - before) / time;
	before = m2;
	beforeTime = t;
	return perTick;
}

export function setMoneyInput(money: number) {
	const doc = eval("document") as Document;
	const allInputs = doc.querySelectorAll("input");
	const numberInput = Array.from(allInputs).find(i => i.type === "number");
	if (numberInput === undefined) throw new Error("Could not find number input!");
	numberInput.value = String(money === -1 ? "" : money);
}

export function findResult() {
	const doc = eval("document") as Document;
	const allP = doc.querySelectorAll("p");
	const result = Array.from(allP).find(p => p.textContent === "H" || p.textContent === "T");
	if (result === undefined) throw new Error("Could not find result!");
	return result;
}

export function hasWon() {
	const doc = eval("document") as Document;
	const allH3 = doc.querySelectorAll("h3");
	const result = Array.from(allH3).find(h => h.textContent === " win!" || h.textContent === "lose!");
	if (result === undefined) throw new Error("Could not find the result h3!");
	return result.textContent === " win!";
}

export function clickButton(ref: HTMLElement) {
	const obj = ref[Object.keys(ref)[1] as keyof HTMLElement] as unknown as simpleObject; // no idea what type that is (maybe ReactProps somethingsomething), casting to simpleObject to please TS
	obj.onClick({ isTrusted: true } as MouseEvent);
}

interface simpleObject {
	onClick: (a: MouseEvent) => void;
}