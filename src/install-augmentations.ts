import { NS } from "@ns";
import { Matches, ToMap } from "@/_tools/tools";

export const DAEMON_JSON_FILENAME = "startup_daemons.txt";

export async function main(ns: NS) {
	const runningScripts = ToMap(ns.ps("home"), pi => pi.filename);
	const runningDaemons: ScriptInfo[] = [
		{ filename: "run-corporation.js",      args: [] },
		{ filename: "/daemons/run-hacknet.js", args: ["--daemon"] },
		{ filename: "/daemons/run-solver.js",  args: ["--daemon"] },
		{ filename: "run-gang.js",             args: [] },
		{ filename: "helmsman.js",             args: ["--daemon"] },
	].filter(si => Matches(runningScripts.get(si.filename)?.args, si.args));

	// if we have servers purchased, we likely want to do that again
	if (ns.getPurchasedServers().length > 0) {
		runningDaemons.push({ filename: "/daemons/run-purchaser.js", args: ["--daemon"] });
	}

	ns.write(DAEMON_JSON_FILENAME, JSON.stringify(runningDaemons, null, 2), "w");

	ns.singularity.installAugmentations("restart-daemons.js");
}


export interface ScriptInfo {
	filename: string,
	args: (string | number | boolean)[]
}
