import { NS } from "@ns";
import { CreatePlan, ExecutePlan, ExecutionPlan, ExploreServers, WaitPids } from "@/_tools/tools";
import { Compromise, GROW_SCRIPT, WEAK_SCRIPT } from "@/_tools/hacking";

export enum PlanType {
	AlreadyPrepared,
	HomeOnly,
	Normal,
	NormalHome,
	Spread,
	Sequential,
	BruteWeaken,
	BruteGrow,
}


export interface PreparationPlan {
	planType: PlanType,
	complete: boolean,
	plan: ExecutionPlan,
}



export function Prepared(ns: NS, serverName: string, marginPercent: number = 0.01): boolean {
	const server = ns.getServer(serverName);

	if (server.moneyMax == 0) {
		return true;
	}

	if (1 - (server.moneyAvailable / server.moneyMax) > marginPercent) {
		return false;
	}

	if (1 - (server.minDifficulty / server.hackDifficulty) > marginPercent) {
		return false;
	}

	return true;
}


export function PlanPreparation(ns: NS, candidateServers: string[], target: string, jobSpacer: number, factor: number): PreparationPlan {
	if (Prepared(ns, target)) {
		return { planType: PlanType.AlreadyPrepared, complete: true, plan: [] };
	}

	const server         = ns.getServer(target);
	const allowedServers = candidateServers.filter(s => s != "home");

	// the math doesn't work out if there is zero (or less) money available...
	if (server.moneyAvailable < 1) {
		server.moneyAvailable = 1;
	}

	const weakenThreads1 = Math.max(1, Math.ceil((server.hackDifficulty - server.minDifficulty) / ns.weakenAnalyze(1))) * factor;
	const weakenTime     = Math.ceil(ns.getWeakenTime(target));
	const growThreads    = Math.max(1, Math.ceil(ns.growthAnalyze(target, server.moneyMax /server.moneyAvailable))) * factor;
	const growTime       = Math.ceil(ns.getGrowTime(target));
	const weakenThreads2 = Math.max(1, Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1))) * factor;
	const weakenDelay1   = 0;
	const growDelay      = weakenTime + jobSpacer - growTime;
	const weakenDelay2   = jobSpacer * 2;
	const executions     = [
		{ Script: WEAK_SCRIPT, Threads: weakenThreads1, Arguments: ["--target", target, "--delay", weakenDelay1] },
		{ Script: GROW_SCRIPT, Threads: growThreads,    Arguments: ["--target", target, "--delay", growDelay] },
		{ Script: WEAK_SCRIPT, Threads: weakenThreads2, Arguments: ["--target", target, "--delay", weakenDelay2] },
	];

	let plan: ExecutionPlan | null;

	// if home has >1 cores and enough RAM, it might make
	// sense to do it only on home instead, it's more thread-efficient
	// if (ns.getServer("home").cpuCores > 1 && (plan = CreatePlanHomeOnly(ns, target, jobSpacer)) != null) {
	// 	return { planType: PlanType.HomeOnly, complete: true, plan };
	// }

	// try to create a normal plan 
	if ((plan = CreatePlan(ns, allowedServers, false, ...executions)) != null) {
		return { planType: PlanType.Normal, complete: true, plan };
	}

	// ok, a normal plan won't work; we'll add home into the mix and see if we can make a plan that way
	allowedServers.push("home");

	// and re-try the planning
	if ((plan = CreatePlan(ns, allowedServers, false, ...executions)) != null) {
		return { planType: PlanType.NormalHome, complete: true, plan };
	}

	// otherwise, re-plan but allow us to spread out the executions
	// this isn't ideal because it might not complete the preparation
	if ((plan = CreatePlan(ns, allowedServers, true, ...executions)) != null) {
		return { planType: PlanType.Spread, complete: true, plan };
	}

	// if we STILL fail, then there's literally nothing we can do to run it as a batch; try one-at-a-time
	if (server.hackDifficulty > server.minDifficulty) {
		// need to weaken; create a plan just for weaken
		if ((plan = CreatePlan(ns, allowedServers, true, executions[0])) != null) {
			return { planType: PlanType.Sequential, complete: false, plan };
		}
	} else if (server.moneyAvailable < server.moneyMax) {
		// need to grow; createa plan just for grow
		if ((plan = CreatePlan(ns, allowedServers, true, executions[1])) != null) {
			return { planType: PlanType.Sequential, complete: false, plan }
		}
	} else {
		// uh, the server's already prepared.
		return { planType: PlanType.AlreadyPrepared, complete: true, plan: [] };
	}

	// Well, things is gettin' serious around here. All we can do is throw every bit of
	// RAM we have at weaken or grow, and hope things get better the next time around.
	plan = [];

	if (server.hackDifficulty > server.minDifficulty) {
		for (const server of ExploreServers(ns, true).filter(s => Compromise(ns, s))) {
			const availRam   = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
			const threadRam  = ns.getScriptRam(WEAK_SCRIPT);
			const maxThreads = Math.floor(availRam / threadRam);

			if (maxThreads > 0) {
				plan.push({
					Execution: { Script: WEAK_SCRIPT, Threads: maxThreads, Arguments: ["--target", target] },
					Server: server
				});
			}
		}

		return { planType: PlanType.BruteWeaken, complete: false, plan };
	} else if (server.moneyAvailable < server.moneyMax) {
		for (const server of ExploreServers(ns, true).filter(s => Compromise(ns, s))) {
			const availRam   = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
			const threadRam  = ns.getScriptRam(GROW_SCRIPT);
			const maxThreads = Math.floor(availRam / threadRam);

			if (maxThreads > 0) {
					plan.push({
					Execution: { Script: GROW_SCRIPT, Threads: maxThreads, Arguments: ["--target", target] },
					Server: server
				});
			}
		}

		return { planType: PlanType.BruteGrow, complete: false, plan };
	} else {
		// uh, the server's already prepared.
		return { planType: PlanType.AlreadyPrepared, complete: true, plan: [] };
	}
}


export async function PrepareServer(ns: NS, candidateServers: string[], hostName: string, jobSpacer: number = 20, verbose: boolean = true, factor: number = 1): Promise<void> {
	const server         = ns.getServer(hostName);
	const allowedServers = candidateServers.filter(s => s != "home");

	// the math doesn't work out if there is zero (or less) money available...
	if (server.moneyAvailable < 1) {
		server.moneyAvailable = 1;
	}

	const weakenThreads1 = Math.max(1, Math.ceil((server.hackDifficulty - server.minDifficulty) / ns.weakenAnalyze(1))) * factor;
	const weakenTime     = Math.ceil(ns.getWeakenTime(hostName));
	const growThreads    = Math.max(1, Math.ceil(ns.growthAnalyze(hostName, server.moneyMax /server.moneyAvailable))) * factor;
	const growTime       = Math.ceil(ns.getGrowTime(hostName));
	const weakenThreads2 = Math.max(1, Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1))) * factor;
	const weakenDelay1   = 0;
	const growDelay      = weakenTime + jobSpacer - growTime;
	const weakenDelay2   = jobSpacer * 2;
	const executions     = [
		{ Script: WEAK_SCRIPT, Threads: weakenThreads1, Arguments: ["--target", hostName, "--delay", weakenDelay1] },
		{ Script: GROW_SCRIPT, Threads: growThreads,    Arguments: ["--target", hostName, "--delay", growDelay] },
		{ Script: WEAK_SCRIPT, Threads: weakenThreads2, Arguments: ["--target", hostName, "--delay", weakenDelay2] },
	];

	let plan     = CreatePlan(ns, allowedServers, false, ...executions);
	let planType = PlanType.Normal;

	if (plan == null) {
		// add home to the list of servers
		if (allowedServers.indexOf("home") < 0) {
			allowedServers.push("home");
		}

		// and re-try the planning
		plan     = CreatePlan(ns, allowedServers, false, ...executions);
		planType = PlanType.NormalHome;

		if (plan == null) {
			// otherwise, re-plan but allow us to spread out the executions
			plan     = CreatePlan(ns, allowedServers, true, ...executions);
			planType = PlanType.Spread;

			// if we STILL fail, then there's literally nothing we can do to run it as a batch; try one-at-a-time
			if (plan == null) {
				const w1Plan = CreatePlan(ns, allowedServers, true, executions[0]);
				const gPlan  = CreatePlan(ns, allowedServers, true, executions[1]);
				const w2Plan = CreatePlan(ns, allowedServers, true, executions[2]);

				if (w1Plan == null || gPlan == null || w2Plan == null) {
					plan = [];

					// at this point, we have to get quite creative...
					if (weakenThreads1 > 1) {
						// run weaken on every bit of RAM we have available, then we'll come around again in hopefully a better state
						for (const server of allowedServers) {
							const availRam   = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
							const threadRam  = ns.getScriptRam(WEAK_SCRIPT);
							const maxThreads = Math.floor(availRam / threadRam);

							plan.push({
								Execution: { Script: WEAK_SCRIPT, Threads: maxThreads, Arguments: ["--target", hostName, "--delay", 0] },
								Server: server
							});
						}

						ns.tprint(`[${hostName}] Prepping using strategy git-r-done-weaken; expected duration is ${ns.tFormat(weakenTime)}`);
						//ns.tprint(JSON.stringify(plan));
						await WaitPids(ns, ...ExecutePlan(ns, plan));
						return;
					}

					if (growThreads > 1) {
						// run weaken on every bit of RAM we have available, then we'll come around again in hopefully a better state
						for (const server of allowedServers) {
							const availRam   = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
							const threadRam  = ns.getScriptRam(GROW_SCRIPT);
							const maxThreads = Math.floor(availRam / threadRam);

							plan.push({
								Execution: { Script: GROW_SCRIPT, Threads: maxThreads, Arguments: ["--target", hostName, "--delay", 0] },
								Server: server
							});
						}

						ns.tprint(`[${hostName}] Prepping using strategy git-r-done-grow; expected duration is ${ns.tFormat(growTime)}`);
						await WaitPids(ns, ...ExecutePlan(ns, plan));
						return;
					}

					throw "Like, you just don't have enough servers, man. (!!)";
				}

				ns.tprint(`[${hostName}] Prepping using strategy sequential; expected duration is ${ns.tFormat(weakenTime + growTime + weakenTime)}`);
				await WaitPids(ns, ...ExecutePlan(ns, w1Plan));
				await WaitPids(ns, ...ExecutePlan(ns, gPlan));
				await WaitPids(ns, ...ExecutePlan(ns, w2Plan));
				return;
			}
		}
	}

	if (verbose) {
		ns.tprint(`[${hostName}] Prepping using strategy ${PlanType[planType]}; expected duration is ${ns.tFormat(weakenTime + weakenDelay2)}`);
	}

	// run the plan and wait for it to finish
	await WaitPids(ns, ...ExecutePlan(ns, plan));
}


function CreatePlanHomeOnly(ns: NS, hostName: string, jobSpacer: number = 20) {
	const homeServer = ns.getServer("home");

	if (homeServer.cpuCores < 2) {
		return null;
	}

	const server         = ns.getServer(hostName);
	const weakenThreads1 = Math.max(1, Math.ceil((server.hackDifficulty - server.minDifficulty) / ns.weakenAnalyze(1, homeServer.cpuCores)));
	const weakenTime     = Math.ceil(ns.getWeakenTime(hostName));
	const growThreads    = Math.max(1, Math.ceil(ns.growthAnalyze(hostName, server.moneyMax / server.moneyAvailable, homeServer.cpuCores)));
	const growTime       = Math.ceil(ns.getGrowTime(hostName));
	const weakenThreads2 = Math.max(1, Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1)));
	const weakenDelay1   = 0;
	const growDelay      = weakenTime + jobSpacer - growTime;
	const weakenDelay2   = jobSpacer * 2;
	const executions     = [
		{ Script: WEAK_SCRIPT, Threads: weakenThreads1, Arguments: ["--target", hostName, "--delay", weakenDelay1] },
		{ Script: GROW_SCRIPT, Threads: growThreads,    Arguments: ["--target", hostName, "--delay", growDelay] },
		{ Script: WEAK_SCRIPT, Threads: weakenThreads2, Arguments: ["--target", hostName, "--delay", weakenDelay2] },
	];

	// first, try prepping using home only, if it has >1 cores (it'll be faster)
	return CreatePlan(ns, ["home"], false, ...executions);
}