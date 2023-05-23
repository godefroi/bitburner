import { NS, NetscriptPort } from "@ns";
import { DaemonCommand, Execute } from "@/_tools/daemon";
import { BATCHER_PORT, HWGW_SCRIPT_PORT } from "@/_tools/ports";
import { PlanPreparation, PlanType, Prepared } from "@/_tools/preparation";
import { CreatePlan, ExecutePlan, ExploreServers, FlagsRecord, KillPids } from "@/_tools/tools";
import { HACK_SCRIPT, GROW_SCRIPT, WEAK_SCRIPT, Compromise } from "@/_tools/hacking";
import { FormatDuration } from "@/_tools/display";


const LOOP_TIME  = 5;
const JOB_SPACER = 20;
const WEAKEN_H_FACTOR = 1.3;
const GROW_FACTOR     = 1.3;


interface BatcherState {
	availableServers: string[];
	targets: TargetState[];
	scriptPort: NetscriptPort;
	lastReportTime: number;
}


interface BatcherFlags extends FlagsRecord {
	includeHome: boolean,
	includeHacknet: boolean,
}


interface BatcherTarget {
	hostName: string;
	percentage: number;
}


interface PrepState {
	pids: number[],
	strategy: PlanType,
	startTime: number,
	duration: number,
}


interface TargetState {
	/** The target to be hacked */
	target: BatcherTarget;

	/** Info on the current preparation plan, if any */
	prepState: PrepState | null;

	/** The moment when the current window started; null if we're not in a window */
	windowStart: number | null;

	/** Timestamp at which point it will be safe to start a batch. This is JOB_SPACER ms past the end of the previous batch. */
	nextStart: number | null;

	/** Batch metrics containing thread counts and run times */
	batchMetrics: Metrics | null;

	/** Player hack level at which the metrics were calculated */
	metricsLevel: number;

	/** Number of batches executed against the target. This is used as a batch index. */
	batchCount: number;

	/** When the last message was received from a script */
	lastMessageTime: number;

	/** Last status message received */
	lastReport: string;

	/** Current execution state of this target */
	executionState: TargetExecutionState;
}


interface ScriptResult {
	batch: number;
	type: string;
	target: string;
	finishTime: number;
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
	TargetFunds: number;
}


enum TargetExecutionState {
	Pending,
	Hacking,
	Draining,
	Drained,
}



export async function main(ns: NS) {
	const commands: DaemonCommand<BatcherFlags, BatcherState>[] = [
		{ command: "target",  handler: SetTargetCommand,     helpText: "Set the target of the batcher. target {hostName} {percentage}" },
		{ command: "rescan",  handler: UpdateServersCommand, helpText: "Instruct the batcher to update its internal list of servers" },
		{ command: "servers", handler: ReportServersCommand, helpText: "Instruct the batcher to report information about the servers used to run batches" },
	];

	const flagDefaults: BatcherFlags = {
		includeHome: true,
		includeHacknet: false,
	}

	ns.disableLog("ALL");
	ns.clearLog();

	await Execute(ns, BATCHER_PORT, InitializeState, RunDaemon, commands, flagDefaults);
}


function InitializeState(ns: NS): BatcherState {
	// TODO: should kill any scripts that would interfere with us

	ns.clearPort(HWGW_SCRIPT_PORT);

	const servers = ExploreServers(ns).filter(s => Compromise(ns, s) && ns.getServerMaxRam(s) > 0);

	// add home, because, man, we mostly want it.
	servers.push("home");

	return {
		availableServers: servers,
		targets: [],
		scriptPort: ns.getPortHandle(HWGW_SCRIPT_PORT),
		lastReportTime: 0,
	};
}


async function RunDaemon(ns: NS, state: BatcherState): Promise<number> {
	// remove any drained targets; we can now ignore them
	state.targets = state.targets.filter(t => t.executionState != TargetExecutionState.Drained);

	// if we have no targets in the hacking state, see if we can move one to hacking
	if (state.targets.every(t => t.executionState != TargetExecutionState.Hacking)) {
		const pendingTarget = state.targets.find(t => t.executionState == TargetExecutionState.Pending);

		if (pendingTarget != undefined) {
			pendingTarget.executionState = TargetExecutionState.Hacking;
		}
	}

	const waitTime = state.targets.reduce((cur, target) => Math.min(cur, HandleTarget(ns, target, state.scriptPort, HWGW_SCRIPT_PORT, state.availableServers)), Infinity);
	const now      = Date.now();

	if (now > state.lastReportTime + 1000) {
		ns.clearLog();

		const {counts, totalRam, usedRam} = CountPendingBatches(ns, state.availableServers);

		for (const target of state.targets) {
			const batchInfo = counts.find(c => c.target == target.target.hostName);

			let prep = "";

			if (target.prepState != null) {
				prep = `${PlanType[target.prepState.strategy]} eta: ${FormatDuration(ns, target.prepState.duration - (Date.now() - target.prepState.startTime))}`;
			}

			ns.print(`Target: ${target.target.hostName}`);
			ns.print(`  RAM usage: ${ns.formatRam(usedRam)}/${ns.formatRam(totalRam)}`);
			ns.print(`  Pending batches: ${batchInfo == undefined ? 0 : batchInfo.counts.hack.pids}`);
			ns.print(`  Batch: ${ns.formatPercent(target.target.percentage)} ${ns.formatNumber(target.target.percentage * ns.getServerMaxMoney(target.target.hostName))} ${FormatDuration(ns, target.batchMetrics?.WeakenG.Duration)}`);
			ns.print(`  Prep: ${prep}`);
			ns.print(`  Status: ${target.lastReport}`);
		}

		state.lastReportTime = now;
	}

	return Math.max(waitTime, LOOP_TIME);
}


async function SetTargetCommand(ns: NS, args: string[], flags: BatcherFlags, state: BatcherState): Promise<void> {
	const newTarget = String(args[0]);
	const newPct    = Number(args[1]);
	const curTarget = state.targets.find(t => t.target.hostName == newTarget);

	// if this target is a target we already have, update the percentage and exit
	if (curTarget != undefined) {
		curTarget.target.percentage = newPct;
		curTarget.batchMetrics      = CalculateBatchMetrics(ns, newTarget, newPct, WEAKEN_H_FACTOR, GROW_FACTOR);
		return;
	}

	// if we have existing active targets, then mark them as draining
	if (state.targets.length > 0) {
		state.targets.filter(ts => ts.executionState == TargetExecutionState.Hacking).forEach(ts => ts.executionState = TargetExecutionState.Draining);
	}

	// add this target to the list as pending
	state.targets.push({
		target: {
			hostName: newTarget,
			percentage: newPct,
		},
		prepState: null,
		windowStart: null,
		nextStart: null,
		batchMetrics: null,
		metricsLevel: -1,
		batchCount: 0,
		lastMessageTime: -Infinity,
		lastReport: "",
		executionState: TargetExecutionState.Pending,
	});
}


async function UpdateServersCommand(ns: NS, args: string[], flags: BatcherFlags, state: BatcherState): Promise<void> {
	const servers = ExploreServers(ns).filter(s => Compromise(ns, s) && ns.getServerMaxRam(s) > 0);

	ns.tprint(`home: ${flags.includeHome} hacknet: ${flags.includeHacknet}`);

	// add home, because, man, we mostly want it.
	servers.push("home");

	state.availableServers = servers;
}


async function ReportServersCommand(ns: NS, args: string[], flags: BatcherFlags, state: BatcherState): Promise<void> {
	const metrics  = state.targets.length == 0 ? null : CalculateBatchMetrics(ns, state.targets[0].target.hostName, state.targets[0].target.percentage, WEAKEN_H_FACTOR, GROW_FACTOR);
	const hackRam  = metrics == null ? -1 : metrics.Hack.Threads * ns.getScriptRam(HACK_SCRIPT);
	const weakHRam = metrics == null ? -1 : metrics.WeakenH.Threads * ns.getScriptRam(WEAK_SCRIPT);
	const growRam  = metrics == null ? -1 : metrics.Grow.Threads * ns.getScriptRam(GROW_SCRIPT);
	const weakGRam = metrics == null ? -1 : metrics.WeakenG.Threads * ns.getScriptRam(WEAK_SCRIPT);
	const batchRam = metrics == null ? -1 : hackRam + weakHRam + growRam + weakGRam;

	state.availableServers
		.map(s => ({server: s, maxRam: ns.getServerMaxRam(s)}))
		.sort((a, b) => b.maxRam - a.maxRam)
		.forEach(s => {
		ns.tprint(`${s.server.padEnd(18)} ${ns.formatRam(s.maxRam).padEnd(10)} ${metrics == null ? "?" : Math.floor(s.maxRam / batchRam)}`);
	});
}


function HandleTarget(ns: NS, state: TargetState, scriptPort: NetscriptPort, portHandle: number, availableServers: string[]): number {
	// update our state with any pending script results
	ReadScriptMessages(ns, scriptPort, state);

	// if we're draining, then drain
	if (state.executionState == TargetExecutionState.Draining) {
		// if we have prep pids, kill them, we don't need them
		if (state.prepState != null) {
			KillPids(ns, ...state.prepState.pids);
			state.prepState = null;
		}

		const pendingBatchInfo = CountPendingBatches(ns, availableServers);
		const targetBatchInfo  = pendingBatchInfo.counts.find(t => t.target == state.target.hostName);

		// if we have no more batches, we're now drained
		if (targetBatchInfo == undefined) {
			state.executionState = TargetExecutionState.Drained;
		}

		return 1000;
	}

	// if we're not hacking, we don't do anything yet
	if (state.executionState != TargetExecutionState.Hacking) {
		return 1000;
	}
	
	// if we're currently running a prep... check to see if it's done
	if (state.prepState != null) {
		state.lastReport = "have prepPids";

		if (Prepared(ns, state.target.hostName)) {
			// somehow we got prepared before our prep scripts finished
			KillPids(ns, ...state.prepState.pids);
		} else {
			const {complete, remainingPids} = CheckPidStatus(ns, state.prepState.pids);

			if (complete) {
				state.prepState = null;
			} else {
				state.prepState.pids = remainingPids;
				return LOOP_TIME;
			}
		}
	}

	// if we're in a paywindow, just move on, we can't start another batch until after the window ends (plus spacer)
	if (state.windowStart != null) {
		// if we've been in this paywindow *way too long*, then something went wrong
		// and we're not really in a paywindow any more
		if (Date.now() - state.windowStart > 1000) {
			state.windowStart = null;
		} else {
			state.lastReport = "in a window";
			return LOOP_TIME;
		}
	}

	// if we're not in a paywindow and we're not past the batch spacer, we now know how long before we'll be ready
	if (state.nextStart != null && Date.now() < state.nextStart) {
		state.lastReport = "wait for nextstart";
		return state.nextStart - Date.now();
	}

	// otherwise, we're not in a paywindow, and we're past the next start,
	// so we can clear out the next start marker so we know we're g2g
	state.nextStart = null;

	// ensure the server is prepared
	if (!Prepared(ns, state.target.hostName)) {
		const pendingBatchInfo = CountPendingBatches(ns, availableServers);
		const targetBatchInfo  = pendingBatchInfo.counts.find(c =>c.target == state.target.hostName);

		try {
			const prepPlan = PlanPreparation(ns, availableServers, state.target.hostName, JOB_SPACER, (targetBatchInfo != undefined && targetBatchInfo.counts.hack.pids > 0) ? 5 : 1);
			state.prepState = {
				pids: ExecutePlan(ns, prepPlan.plan),
				strategy: prepPlan.planType,
				startTime: Date.now(),
				duration: ns.getWeakenTime(state.target.hostName) + (JOB_SPACER * 2), // this is *probably* correct, unless something changes...
			};
		} catch (e) {
			// couldn't plan or execute the prep...
			throw new Error(`Planning or execution of preparation failed: ${e}`);
		}
		state.lastReport = "started a prep";
		return LOOP_TIME;
	}

	// if we don't have batch metrics or we need to recalculate them (i.e. our HL changed), do that
	const hackLevel = ns.getPlayer().skills.hacking;

	if (state.batchMetrics == null || state.metricsLevel != hackLevel) {
		state.metricsLevel = hackLevel;
		state.batchMetrics = CalculateBatchMetrics(ns, state.target.hostName, state.target.percentage, WEAKEN_H_FACTOR, GROW_FACTOR);

		if (state.batchMetrics == null) {
			throw new Error("Unable to calculate batch metrics; perhaps the server was unprepared?");
		}
	}

	// at this point, we're not in a paywindow, we're past the batch spacer, the server is prepared, and we have valid metrics
	const plan = CreatePlan(ns, availableServers, false,
		{ Script: HACK_SCRIPT, Threads: state.batchMetrics.Hack.Threads,    Arguments: ["--target", state.target.hostName, "--delay", state.batchMetrics.Hack.Delay,    "--port", portHandle, "--batch", state.batchCount, "--type", "H"] },
		{ Script: WEAK_SCRIPT, Threads: state.batchMetrics.WeakenH.Threads, Arguments: ["--target", state.target.hostName, "--delay", state.batchMetrics.WeakenH.Delay, "--port", portHandle, "--batch", state.batchCount, "--type", "W1"] },
		{ Script: GROW_SCRIPT, Threads: state.batchMetrics.Grow.Threads,    Arguments: ["--target", state.target.hostName, "--delay", state.batchMetrics.Grow.Delay,    "--port", portHandle, "--batch", state.batchCount, "--type", "G"] },
		{ Script: WEAK_SCRIPT, Threads: state.batchMetrics.WeakenG.Threads, Arguments: ["--target", state.target.hostName, "--delay", state.batchMetrics.WeakenG.Delay, "--port", portHandle, "--batch", state.batchCount, "--type", "W2"] });

	// if we couldn't plan the batch execution, that most likely means that there wasn't
	// enough RAM available from our servers to set it all up; we'll try again later
	if (plan == null) {
		state.lastReport = "couldn't make a plan";
		return LOOP_TIME;
	}

	// execute the plan
	ExecutePlan(ns, plan);

	// increment our batch count
	state.batchCount += 1;

	// set the next start time
	state.nextStart = Date.now() + (JOB_SPACER * 4); // H <-JOB_SPACER-> W1 <-JOB_SPACER-> G <-JOB_SPACER-> W2 <-JOB_SPACER-> {next start}

	// since we started a batch, we need to wait the whole batch spacing before we could possibly start another one
	state.lastReport = "started a batch";

	return JOB_SPACER * 4;
}


function CheckPidStatus(ns: NS, pids: number[] | null): {complete: boolean, remainingPids: number[]} {
	if (pids == null || pids.length == 0) {
		return {complete: true, remainingPids: []};
	}

	// check to see if any pids are still running
	pids = pids.filter(p => ns.getRunningScript(p) != null);

	return {complete: pids.length == 0, remainingPids: pids};
}


function ReadScriptMessages(ns: NS, scriptPort: NetscriptPort, state: TargetState): void {
	while (!scriptPort.empty()) {
		const result = JSON.parse(scriptPort.read() as string) as ScriptResult;

		if (result.finishTime < state.lastMessageTime) {
			// ignore messages from the past; they can only serve to confuse us
			continue;
		}

		// record when the script finished
		state.lastMessageTime = state.lastMessageTime;

		// we can probably improve the logic here if state.lastMessage > result.finishTime
		// (because that means we're dealing with a message older than our last one)

		if (result.type == "H") {
			// begin a paywindow
			if (state.windowStart != null) {
				// ERROR! We're already in a paywindow and we're starting another!
				// THIS IS A DESYNC!
				//throw new Error("New paywindow starting while in a paywindow!");
			}

			state.windowStart = result.finishTime;
			state.nextStart = null;
		} else if (result.type == "W2") {
			if (state.windowStart != null) {
				state.windowStart = null;

				if (state.nextStart != null) {
					//ns.print(`existing: ${state.nextStart} calculated: ${result.finishTime + JOB_SPACER} diff: ${state.nextStart - (result.finishTime + JOB_SPACER)}`);
					// ...? is this an error?
				}

				state.nextStart = result.finishTime + JOB_SPACER;
			} else {
				// ERROR! We're not in a paywindow, but this one just ended!
				// THIS IS A DESYNC!
				//throw new Error("Paywindow ending, but not currently in a paywindow!");
			}
		} else {
			// it's either G or W1 (or something completely different)
			// we could use this for bookkeeping, but for now we'll ignore it
		}
	}
}


interface HackScriptCounts {
	hack:   { pids: number, threads: number },
	grow:   { pids: number, threads: number },
	weaken: { pids: number, threads: number },
};

function CountPendingBatches(ns: NS, availableServers: string[]): {counts: {target: string, counts: HackScriptCounts}[], totalRam: number, usedRam: number} {
	const counts  = new Map<string, HackScriptCounts>();
	const scripts = new Set<string>([HACK_SCRIPT, GROW_SCRIPT, WEAK_SCRIPT]);

	let totalRam = 0;
	let usedRam  = 0;

	availableServers.forEach(s => {
		const server = ns.getServer(s);

		totalRam += server.maxRam;
		usedRam += server.ramUsed;

		ns.ps(s).filter(p => scripts.has(p.filename)).forEach(p => {
			const target = p.args[1].toString();

			let tCount = counts.get(target);

			if (tCount == undefined) {
				tCount = {hack: {pids: 0, threads: 0}, grow: {pids: 0, threads: 0}, weaken: {pids: 0, threads: 0}};
				counts.set(target, tCount);
			}

			switch (p.filename) {
				case HACK_SCRIPT: tCount.hack.pids   += 1; tCount.hack.threads   += p.threads; break;
				case GROW_SCRIPT: tCount.grow.pids   += 1; tCount.grow.threads   += p.threads; break;
				case WEAK_SCRIPT: tCount.weaken.pids += 1; tCount.weaken.threads += p.threads; break;
			}
		});
	});

	return {counts: Array.from(counts).map(t => ({target: t[0], counts: t[1]})), totalRam, usedRam};
}


function CalculateBatchMetrics(ns: NS, target: string, targetPercentage: number, weakenHFactor: number, growFactor: number): Metrics | null {
	const targetServer   = ns.getServer(target);
	const targetFunds    = Math.floor(targetServer.moneyMax * targetPercentage);
	const hackThreads    = Math.ceil(ns.hackAnalyzeThreads(target, targetFunds));
	const hackTime       = Math.ceil(ns.getHackTime(target));
	const weakenThreadsH = Math.ceil(((hackThreads * 0.002) / ns.weakenAnalyze(1)) * weakenHFactor);
	const weakenTime     = Math.ceil(ns.getWeakenTime(target));
	const growThreads    = Math.ceil(ns.growthAnalyze(target, (targetServer.moneyMax / (targetServer.moneyMax - targetFunds))) * growFactor);
	const growTime       = Math.ceil(ns.getGrowTime(target));
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
