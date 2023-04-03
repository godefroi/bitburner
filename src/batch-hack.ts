import { NS } from "@ns";
import { ExploreServers, KillPids, TerminateScripts, RunScript, WaitPids } from "@/_tools/tools";
import { Prepared, PrepareServer } from "@/_tools/preparation";
import { HACK_SCRIPT, GROW_SCRIPT, WEAK_SCRIPT, FindHackingTarget, Compromise } from "@/_tools/hacking";

const JOB_SPACER   = 20;
const DESYNC_LIMIT = 500;


export async function main(ns: NS) {
	ns.disableLog("sleep");
	ns.disableLog("scan");
	ns.disableLog("scp");

	if (ns.args.length < 2) {
		ns.tprint("USAGE: batch-hack.js {target|-} {percentage}");
		return;
	}

	const portHandle       = 20;
	const bestTarget       = ns.args[0].toString() != "-" ? ns.args[0].toString() : FindHackingTarget(ns);
	const hackMoneyPercent = Number(ns.args[1]);
	const candidateServers = ExploreServers(ns)
		.filter(s => Compromise(ns, s) && ns.getServerMaxRam(s) > 0);

	ns.tprint(`Running initial prep on ${bestTarget}...`);

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
			ns.tprint(`Prepping server ${bestTarget} for hacking...`);
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

	let firstWindowStart = -1;
	let currentMode      = LoopMode.LoopDelay;
	let batchCount       = 0;

	while (true) {
		if (!Prepared(ns, bestTarget)) {
			ns.tprint(`Server not prepared at start of batch loop; aborting for re-prep`);
			return;
		}

		const hackLevel = ns.getPlayer().skills.hacking;
		const metrics   = CalculateBatchMetrics(ns, bestTarget, hackMoneyPercent, weakenHFactor, growFactor);

		let batchNumber = 0;
		let desyncCount = 0;

		// if we couldn't calculate metrics, something was wrong with the server (not prepped)
		if (metrics == null) {
			return;
		}

		// we must account for the hacking level changing, as that changes our numbers
		while (ns.getPlayer().skills.hacking == hackLevel) {
			if (currentMode == LoopMode.LoopDelay) {
				// if we're too close to when the first window starts, then
				// we swap over to "read port" mode instead of "wait for
				// arbitrary spacer" mode
				if ((firstWindowStart > -1) && ((firstWindowStart - performance.now()) < 1000)) {
					currentMode = LoopMode.PortWait;
					ns.tprint(`Switched to PortWait mode at ${batchCount} batches.`);
				} else {
					// delay before we start another batch
					await ns.sleep(JOB_SPACER * 4);
					batchCount++;
				}
			}

			if (currentMode == LoopMode.PortWait) {
				const waitStart = performance.now();

				if (commPort.empty()) {
					ns.print(`Waiting for a port write...`);
					await commPort.nextWrite();
				}

				const waitEnd  = performance.now();
				const readData = commPort.read();

				ns.print(`waited ${waitEnd - waitStart}ms, read data ${readData}`);
			}

			// check to see whether the server is prepared; if not, come back around later
			// we don't want to start a batch if the server isn't prepared, we'll get bad
			// numbers
			if (!Prepared(ns, bestTarget)) {
				//ns.tprint(`Server was unprepared, aborting this run`);
				if (++desyncCount > DESYNC_LIMIT) {
					ns.tprint(`Major desync detected; restarting from scratch.`);
					// kill all our hack/grow/weaken scripts across all servers,
					// re-prepare, and start over
					return;
				}

				continue;
			}

			// start the batch
			const hackPid  = RunScript(ns, candidateServers, HACK_SCRIPT, metrics.Hack.Threads,    bestTarget, metrics.Hack.Delay,    -1,         hackLevel, batchNumber);
			const weakHPid = RunScript(ns, candidateServers, WEAK_SCRIPT, metrics.WeakenH.Threads, bestTarget, metrics.WeakenH.Delay, -1,         hackLevel, batchNumber);
			const growPid  = RunScript(ns, candidateServers, GROW_SCRIPT, metrics.Grow.Threads,    bestTarget, metrics.Grow.Delay,    -1,         hackLevel, batchNumber);
			const weakGPid = RunScript(ns, candidateServers, WEAK_SCRIPT, metrics.WeakenG.Threads, bestTarget, metrics.WeakenG.Delay, portHandle, hackLevel, batchNumber);

			// track when the first paywindow starts
			if (firstWindowStart == -1) {
				firstWindowStart = performance.now() + metrics.Hack.Duration + metrics.Hack.Delay;
			}

			// check that our batch started successfully
			if (hackPid == 0 || weakHPid == 0 || growPid == 0 || weakGPid == 0) {
				ns.tprint(`Script starts failed; aborting batch.`);
				KillPids(ns, hackPid, weakHPid, growPid, weakGPid);
				continue;
			}

			// increment our batch counter
			batchNumber++;

			// reset our desync counter
			desyncCount = 0;

// await WaitPids(ns, [hackPid, weakHPid, growPid, weakGPid]);
// ns.tprint(`ended at ${performance.now()}`);
// return;
		}
	}
}


/**
 * Calculates necessary batch timing metrics
 */
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
