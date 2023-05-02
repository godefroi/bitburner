import { NS } from "@ns";

export const DAEMON_JSON_FILENAME = "startup_daemons.txt";

export async function main(ns: NS) {
	const candidates: ScriptInfo[] = [
		{ filename: "run-corporation.js", args: [] },
		{ filename: "run-hacknet.js",     args: ["--daemon"] },
		{ filename: "solve-contracts.js", args: [] },
		{ filename: "run-gang.js",        args: [] },
	];

	const runningScripts = ToMap(ns.ps("home"), pi => pi.filename);
	const runningDaemons = candidates.filter(si => Matches(runningScripts.get(si.filename)?.args, si.args));

	ns.write(DAEMON_JSON_FILENAME, JSON.stringify(runningDaemons, null, 2), "w");

	ns.singularity.installAugmentations("restart-daemons.js");
}


function Matches(arr1: (string | number | boolean)[] | undefined, arr2: (string | number | boolean)[] | undefined) {
	if (arr1 == undefined && arr2 == undefined) {
		return true;
	}

	if (arr1 == undefined || arr2 == undefined) {
		return false;
	}

	if (arr1.length != arr2.length) {
		return false;
	}

	for (let i = 0; i < arr1.length; i++) {
		if (arr1[i] !== arr2[i]) {
			return false;
		}
	}

	return true;
}


function ToMap<T, K>(arr: T[], getKey: (arg0: T) => K): Map<K, T> {
	const ret = new Map<K, T>();

	arr.forEach(v => ret.set(getKey(v), v));

	return ret;
}


export interface ScriptInfo {
	filename: string,
	args: (string | number | boolean)[]
}
