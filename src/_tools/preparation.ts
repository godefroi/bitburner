import { NS } from "@ns";
import { CreatePlan, ExecutePlan, WaitPids } from "@/_tools/tools";
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


export async function PrepareServer(ns: NS, candidateServers: string[], hostName: string, jobSpacer: number = 20, verbose: boolean = true): Promise<void> {
	const server = ns.getServer(hostName);

	// the math doesn't work out if there is zero (or less) money available...
	if (server.moneyAvailable < 1) {
		server.moneyAvailable = 1;
	}

	const weakenThreads1 = Math.max(1, Math.ceil((server.hackDifficulty - server.minDifficulty) / ns.weakenAnalyze(1)));
	const weakenTime     = Math.ceil(ns.getWeakenTime(hostName));
	const growThreads    = Math.max(1, Math.ceil(ns.growthAnalyze(hostName, server.moneyMax /server.moneyAvailable)));
	const growTime       = Math.ceil(ns.getGrowTime(hostName));
	const weakenThreads2 = Math.max(1, Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1)));
	const weakenDelay1   = 0;
	const growDelay      = weakenTime + jobSpacer - growTime;
	const weakenDelay2   = jobSpacer * 2;
	const executions     = [
		{ Script: WEAK_SCRIPT, Threads: weakenThreads1, Arguments: [hostName, weakenDelay1] },
		{ Script: GROW_SCRIPT, Threads: growThreads,    Arguments: [hostName, growDelay] },
		{ Script: WEAK_SCRIPT, Threads: weakenThreads2, Arguments: [hostName, weakenDelay2] },
	];

	let plan     = CreatePlan(ns, candidateServers, false, ...executions);
	let planType = "normal";

	if (plan == null) {
		// add home to the list of servers
		candidateServers.push("home");

		// and re-try the planning
		plan     = CreatePlan(ns, candidateServers, false, ...executions);
		planType = "normal+home";

		if (plan == null) {
			// otherwise, re-plan but allow us to spread out the executions
			plan     = CreatePlan(ns, candidateServers, true, ...executions);
			planType = "spread";

			// if we STILL fail, then there's literally nothing we can do
			// TODO: well, we could run one step at a time, or whatever...
			if (plan == null) {
				throw "Like, you just don't have enough servers, man.";
			}
		}
	}

	if (verbose) {
		ns.tprint(`[${hostName}] Prepping using strategy ${planType}; expected duration is ${ns.tFormat(weakenTime + weakenDelay2)}`);
	}

	// run the plan and wait for it to finish
	await WaitPids(ns, ...ExecutePlan(ns, plan));
}
