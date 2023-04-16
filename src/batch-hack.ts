import { NS } from "@ns";
import { ExploreServers, TerminateScripts, CreatePlan, ExecutePlan } from "@/_tools/tools";
import { Prepared, PrepareServer } from "@/_tools/preparation";
import { HACK_SCRIPT, GROW_SCRIPT, WEAK_SCRIPT, FindHackingTarget, Compromise } from "@/_tools/hacking";

const JOB_SPACER   = 20;


export async function main(ns: NS) {
	ns.disableLog("sleep");
	ns.disableLog("scan");
	ns.disableLog("scp");

	if (ns.args.length < 2) {
		ns.tprint("USAGE: batch-hack.js {target|-} {percentage} [includeHome = false]");
		return;
	}

	const portHandle       = 20;
	const bestTarget       = ns.args[0].toString() != "-" ? ns.args[0].toString() : FindHackingTarget(ns);
	const hackMoneyPercent = Number(ns.args[1]);
	const includeHome      = ns.args.length >= 2 ? Boolean(ns.args[2]) : false;
	const candidateServers = ExploreServers(ns)
		.filter(s => Compromise(ns, s) && ns.getServerMaxRam(s) > 0);

	if (includeHome) {
		candidateServers.push("home");
	}

	while (!Prepared(ns, bestTarget)) {
		await PrepareServer(ns, candidateServers, bestTarget, JOB_SPACER);
		await ns.sleep(1000);
	}

	ns.tprint(`Server ${bestTarget} prepared and ready.`);

	while (true) {
		// kill off any scripts that are running
		TerminateScripts(ns, candidateServers, HACK_SCRIPT, GROW_SCRIPT, WEAK_SCRIPT);

		// clear our comm port of any leftover data
		ns.getPortHandle(portHandle).clear();

		while (!Prepared(ns, bestTarget)) {
			await PrepareServer(ns, candidateServers, bestTarget, JOB_SPACER);
			await ns.sleep(1000);
		}

		await RunBatches(ns, candidateServers, bestTarget, portHandle, hackMoneyPercent);

		// hack() raises security level by .002
		// weaken() reduces security level by .05
		// grow() raises security by ns.growthAnalyzeSecurity() (depends on thread count)
		// HWGW
	}
}


async function RunBatches(ns: NS, candidateServers: string[], bestTarget: string, portHandle: number, hackMoneyPercent: number) {
	const commPort = ns.getPortHandle(portHandle);

	const weakenHFactor    = 2.5;
	const growFactor       = 2.5;
	const batchStartTime   = performance.now();

	let firstWindowStart = -1;
	let batchCount       = 0;

	ns.tprint(`[${bestTarget}] Running batches; batch time approx ${ns.tFormat(Math.ceil(ns.getWeakenTime(bestTarget)))}`);

	while (true) {
		let prepped = false;

		for (let i = 0; i < 100; i++) {
			if (Prepared(ns, bestTarget)) {
				prepped = true;
				break;
			} else {
				await ns.sleep(JOB_SPACER * 1.5);
			}
		}

		if (!prepped) {
			ns.tprint(`[${bestTarget}] Unprepped after HL change, ran batches for ${ns.tFormat(performance.now() - batchStartTime)}`);
			return;
		}

		const hackLevel = ns.getPlayer().skills.hacking;
		const metrics   = CalculateBatchMetrics(ns, bestTarget, hackMoneyPercent, weakenHFactor, growFactor);

		let batchNumber = 0;
		let lastSuccess = performance.now();

		// if we couldn't calculate metrics, something was wrong with the server (not prepped)
		if (metrics == null) {
			return;
		}

		// we must account for the hacking level changing, as that changes our numbers
		while (ns.getPlayer().skills.hacking == hackLevel) {
			// delay before we start another batch
			await ns.sleep(JOB_SPACER * 1.5);
			batchCount++;

			// increment our batch counter
			batchNumber++;

			// check to see whether the server is prepared; if not, come back around later
			// we don't want to start a batch if the server isn't prepared, we'll get bad
			// numbers
			if (!Prepared(ns, bestTarget)) {
				//ns.tprint(`Server was unprepared, aborting this run`);
				if (performance.now() - lastSuccess > 30000) {
				//if (++desyncCount > DESYNC_LIMIT) {
					ns.tprint(`[${bestTarget}] Unprepped during batch runs, ran batches for ${ns.tFormat(performance.now() - batchStartTime)}`);
					// kill all our hack/grow/weaken scripts across all servers,
					// re-prepare, and start over
					return;
				}

				continue;
			}

			// set up the batch execution plan
			const plan = CreatePlan(ns, candidateServers, false,
				{ Script: HACK_SCRIPT, Threads: metrics.Hack.Threads,    Arguments: [bestTarget, metrics.Hack.Delay,    -1, batchCount, hackLevel, batchNumber] },
				{ Script: WEAK_SCRIPT, Threads: metrics.WeakenH.Threads, Arguments: [bestTarget, metrics.WeakenH.Delay, -1, batchCount, hackLevel, batchNumber, "w1"] },
				{ Script: GROW_SCRIPT, Threads: metrics.Grow.Threads,    Arguments: [bestTarget, metrics.Grow.Delay,    -1, batchCount, hackLevel, batchNumber] },
				{ Script: WEAK_SCRIPT, Threads: metrics.WeakenG.Threads, Arguments: [bestTarget, metrics.WeakenG.Delay, -1, batchCount, hackLevel, batchNumber, "w2"] });

			// if we failed to plan the batch, we probably just don't have enough servers
			// just move on, we'll try again later
			if (plan == null) {
				break;
			}

			// start the batch
			try {
				ExecutePlan(ns, plan);
			} catch (e) {
				ns.tprint(`Batch execution failed; aborting batch. Error: ${e}`);
				continue;
			}

			// track when the first paywindow starts
			if (firstWindowStart == -1) {
				firstWindowStart = performance.now() + metrics.Hack.Duration + metrics.Hack.Delay;
			}

			// reset our desync tracker
			lastSuccess = performance.now();
		}
	}
}


/** Calculate batch timing metrics */
function CalculateBatchMetrics(ns: NS, targetName: string, targetPercentage: number, weakenHFactor: number, growFactor: number): Metrics | null {
	const targetServer   = ns.getServer(targetName);
	//const player         = ns.getPlayer();
	const targetFunds    = Math.floor(targetServer.moneyMax * targetPercentage);
	const hackThreads    = Math.ceil(ns.hackAnalyzeThreads(targetName, targetFunds));
	const hackTime       = Math.ceil(ns.getHackTime(targetName));
	const weakenThreadsH = Math.ceil(((hackThreads * 0.002) / ns.weakenAnalyze(1)) * weakenHFactor);
	const weakenTime     = Math.ceil(ns.getWeakenTime(targetName));
	const growThreads    = Math.ceil(ns.growthAnalyze(targetName, (targetServer.moneyMax / (targetServer.moneyMax - targetFunds))) * growFactor);
	const growTime       = Math.ceil(ns.getGrowTime(targetName));
	const weakenThreadsG = Math.ceil(ns.growthAnalyzeSecurity(growThreads) / ns.weakenAnalyze(1));
	const hackDelay      = weakenTime - JOB_SPACER - hackTime;
	const weakenDelayH   = 0;
	const growDelay      = weakenTime + JOB_SPACER - growTime;
	const weakenDelayG   = JOB_SPACER * 2;

	if (hackThreads <= 0) {
		ns.tprint(`Cannot properly calculate batch metrics; aborting for re-prep`);
		return null;
	}

	// ns.tprint(`Target server is ${targetName}, targeting ${targetFunds} cash (of ${targetServer.moneyMax}) per batch`);
	// ns.tprint("  operation | threads | delay     | dur (ms)  | duration");
	// ns.tprint("  ----------+---------+-----------+-----------+---------");
	// ns.tprint(`  hack      | ${hackThreads.toString().padStart(7)   } | ${hackDelay.toString().padStart(7)   }ms | ${hackTime.toString().padStart(7)  }ms | ${ns.tFormat(hackTime)}`);
	// ns.tprint(`  weaken(H) | ${weakenThreadsH.toString().padStart(7)} | ${weakenDelayH.toString().padStart(7)}ms | ${weakenTime.toString().padStart(7)}ms | ${ns.tFormat(weakenTime)}`);
	// ns.tprint(`  grow      | ${growThreads.toString().padStart(7)   } | ${growDelay.toString().padStart(7)   }ms | ${growTime.toString().padStart(7)  }ms | ${ns.tFormat(growTime)}`);
	// ns.tprint(`  weaken(G) | ${weakenThreadsG.toString().padStart(7)} | ${weakenDelayG.toString().padStart(7)}ms | ${weakenTime.toString().padStart(7)}ms | ${ns.tFormat(weakenTime)}`);

	return {
		Hack:        { Threads: hackThreads,    Duration: hackTime,   Delay: hackDelay },
		WeakenH:     { Threads: weakenThreadsH, Duration: weakenTime, Delay: weakenDelayH },
		Grow:        { Threads: growThreads,    Duration: growTime,   Delay: growDelay },
		WeakenG:     { Threads: weakenThreadsG, Duration: weakenTime, Delay: weakenDelayG },
		TargetFunds: targetFunds,
	};
}


interface BatchComponentMetrics {
	/** The number of threads to be used in the batch component */
	Threads: number;
	/** The duration (in milliseconds) the component will run */
	Duration: number;
	/** The delay (in milliseconds) before executing the component */
	Delay: number;
}


interface Metrics {
	/** Metrics for the hack() component */
	Hack: BatchComponentMetrics;
	/** Metrics for the first weaken() component (vs hack()) */
	WeakenH: BatchComponentMetrics;
	/** Metrics for the grow() component */
	Grow: BatchComponentMetrics;
	/** Metrics for the second weaken() component (vs grow()) */
	WeakenG: BatchComponentMetrics;
	/** Amount of funds to be targeted in the hack() component */
	TargetFunds: number
}


enum LoopMode {
	LoopDelay,
	PortWait
}
