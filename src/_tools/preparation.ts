import { NS } from "@ns";
import { RunScript, WaitPids } from "@/_tools/tools";
import { GROW_SCRIPT, WEAK_SCRIPT } from "@/_tools/hacking";

export function Prepared(ns: NS, serverName: string): boolean {
	const server = ns.getServer(serverName);

	if (server.moneyAvailable < server.moneyMax) {
		return false;
	}

	if (server.hackDifficulty > server.minDifficulty) {
		return false;
	}

	return true;
}


export async function PrepareServer(ns: NS, candidateServers: string[], hostName: string, batchGap: number = 20) {
	const server         = ns.getServer(hostName);
	const weakenThreads1 = Math.max(1, Math.ceil((server.hackDifficulty - server.minDifficulty) / ns.weakenAnalyze(1)));
	const weakenTime     = Math.ceil(ns.getWeakenTime(hostName));
	const growThreads    = Math.max(1, Math.ceil(ns.growthAnalyze(hostName, server.moneyMax / server.moneyAvailable)));
	const growTime       = Math.ceil(ns.getGrowTime(hostName));
	const weakenThreads2 = Math.max(1, Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1)));
	const weakenDelay1   = 0;
	const growDelay      = weakenTime + batchGap - growTime;
	const weakenDelay2   = batchGap * 2;

	ns.tprint(`Starting ${weakenThreads1} weaken threads ${growThreads} grow threads, and ${weakenThreads2} weaken threads (2)`);
	ns.tprint(`  Expected duration for prep is ${ns.tFormat(weakenTime + weakenDelay2)}`);

	var weakenPid1 = RunScript(ns, candidateServers, WEAK_SCRIPT, weakenThreads1, hostName, weakenDelay1);
	var growPid    = RunScript(ns, candidateServers, GROW_SCRIPT, growThreads,    hostName, growDelay);
	var weakenPid2 = RunScript(ns, candidateServers, WEAK_SCRIPT, weakenThreads2, hostName, weakenDelay2);

	await WaitPids(ns, weakenPid1, growPid, weakenPid2);
}
