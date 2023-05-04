import { NS, ProcessInfo, ScriptArg, Server } from "@ns";


export type FlagsRecord = Record<string, (string[] | ScriptArg)>;


export function Flags<T extends FlagsRecord>(ns: NS, obj: T) {
	const schema = Object.keys(obj).map(k => [k, obj[k]] as [string, string[] | ScriptArg]);
	const flags  = ns.flags(schema);

	Object.assign(obj, flags);

	return {flags: obj, args: flags["_"] as string[]};
}


export function Matches(arr1: (string | number | boolean)[] | undefined, arr2: (string | number | boolean)[] | undefined) {
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


export function ToMap<T, K>(arr: T[], getKey: (arg0: T) => K): Map<K, T> {
	const ret = new Map<K, T>();

	arr.forEach(v => ret.set(getKey(v), v));

	return ret;
}


export function ExploreServers(ns: NS, includeHacknet: boolean = false): string[] {
	const exploredSet = new Set(["home"]);

	for (const toExplore of exploredSet) {
		for (const connectedServer of ns.scan(toExplore)) {
			exploredSet.add(connectedServer);
		}
	}

	exploredSet.delete("home");

	return Array.from(exploredSet).filter(s => includeHacknet || !s.startsWith("hacknet-server-"));
}


export function RunThreads(ns: NS, servers: string[], script: string, threadCount: number, ...scriptArguments: (string | number | boolean)[]): number[] | null {
	const startedPids      = [];
	const threadRam        = ns.getScriptRam(script);
	const candidateServers = servers
		.map(s => ns.getServer(s))
		.filter(s => s.hasAdminRights && s.maxRam > 0)
		.map(s => ({ hostname: s.hostname, threads: Math.floor((s.maxRam - s.ramUsed) / threadRam) }));

	const availableThreads = candidateServers.reduce((runningTotal, obj) => runningTotal + obj.threads, 0);

	if (availableThreads < threadCount) {
		ns.print(`Cannot start script ${script} with ${threadCount} threads; ${availableThreads} threads available.`);
		return null;
	}

	for (const server of candidateServers) {
		const startThreads = Math.min(server.threads, threadCount);

		if (startThreads <= 0) {
			continue;
		}

		if (server.hostname != "home") {
			ns.scp(script, server.hostname, "home");
		}

		ns.print(`Starting script ${script} on ${server.hostname} with ${startThreads} threads (of ${threadCount} remaining)`);
		startedPids.push(ns.exec(script, server.hostname, startThreads, ...scriptArguments));

		threadCount -= startThreads;
	}

	return startedPids;
}


/** Run a script, keeping threads together on a single server */
export function RunScript(ns: NS, candidateServers: string[], script: string, threadCount: number, ...scriptArguments: (string | number | boolean)[]): number {
	const totalRam     = ns.getScriptRam(script) * threadCount;
	const targetServer = candidateServers
		.map(s => ns.getServer(s))
		.filter(s => (s.maxRam - s.ramUsed) > totalRam)
		.shift();

	if (targetServer == undefined) {
		ns.tprint(`No server available for script ${script} with ${threadCount} threads.`);
		return 0;
	}

	if (targetServer.hostname != "home" && !ns.scp(script, targetServer.hostname)) {
		ns.tprint(`Failed to copy script ${script} to server ${targetServer.hostname}.`);
		return 0;
	}

	const startedPid = ns.exec(script, targetServer.hostname, threadCount, ...scriptArguments);

	if (startedPid == 0) {
		ns.tprint(`Failed to exec script ${script} with ${threadCount} threads on server ${targetServer.hostname}. Ram required was ${totalRam}, ram available was ${targetServer.maxRam - targetServer.ramUsed}`);
		return 0;
	}

	return startedPid;
}


export function KillPids(ns: NS, ...pids: number[]): boolean {
	return pids
		.filter(p => p > 0).map(p => ns.kill(p))
		.reduce((prev, cur) => prev && cur, true);
}


export async function WaitPids(ns: NS, ...pids: number[]) {
	pids = pids.filter(p => ns.getRunningScript(p) != null);

	while (pids.length > 0) {
		await ns.sleep(5);
		pids = pids.filter(p => ns.getRunningScript(p) != null);
	}
}


export function TerminateScripts(ns: NS, predicate: (script: {host: string, process: ProcessInfo}) => boolean, serverNames: string[], ...scriptNames: string[]): number[] {
	var scriptSet = new Set<string>(scriptNames);

	return serverNames
		.flatMap(serverName => ns.ps(serverName).map(pi => ({host: serverName, process: pi})))
		.filter(item => scriptSet.has(item.process.filename) && predicate(item))
		.map(item => ns.kill(item.process.pid) ? item.process.pid : -1)
		.filter(pid => pid != -1);
}


export function CreatePlan(ns: NS, candidateServers: string[], canSpread: boolean, ...scripts: ScriptExecution[]): ExecutionPlan | null {
	const servers = candidateServers.map(s => {
		const server  = ns.getServer(s);
		const padding = s != "home" ? 0 : function() {
			if (server.maxRam >= 4096) {
				return (1024 + 32); // if we have >= 4tb, reserve 1tb + 32gb
			} else if (server.maxRam >= 128) {
				return 32; // if we have >= 128gb, reserve 32gb (to run things like gang scripts and other singularity stuff)
			} else {
				return 8; // if we're very ram-poor, reserve only 8gb to run simple things like find-path.js
			}
		}();

		return {
			Server: server.hostname,
			AvailableRam: Math.max(0, server.maxRam - (server.ramUsed + padding)),
			MaxRam: server.maxRam,
		};
	});

	const costedScripts = scripts
		.map(s => {
			const scriptRam = ns.getScriptRam(s.Script);
			return { Execution: s, TotalRam: scriptRam * s.Threads, ScriptRam: scriptRam };
		})
		.sort((a, b) => b.TotalRam - a.TotalRam); // b-a sorts biggest first

	const plan: ExecutionPlan = [];

	// go through each costed script, looking for the smallest server it'll fit on
	for (const script of costedScripts) {
		if (canSpread) {
			// we can spread it out; our strategy here is to start at the smallest servers
			// and start adding components until we finish this script
			const possibleServers = servers
				.filter(s => s.AvailableRam >= script.ScriptRam)
				.sort((a, b) => a.AvailableRam - b.AvailableRam); // a-b sorts smallest first

			let remainingThreads = script.Execution.Threads;

			for (const server of possibleServers) {
				// if this script is fully scheduled, then we're done
				if (remainingThreads == 0) {
					break;
				}

				const serverThreads = Math.min(remainingThreads, Math.floor(server.AvailableRam / script.ScriptRam));

				if (serverThreads > 0) {
					plan.push({
						Execution: { Script: script.Execution.Script, Threads: serverThreads, Arguments: script.Execution.Arguments },
						Server: server.Server,
					});

					// subtract the number of threads we still need to plan
					remainingThreads -= serverThreads;

					// subtract the ram from the server just planned on
					server.AvailableRam -= (serverThreads * script.ScriptRam);
				}
			}

			// if we have threads remaining, then we were unable to schedule everything
			if (remainingThreads > 0) {
				return null;
			}
		} else {
			const possibleServers = servers
				.sort((a, b) => b.MaxRam - a.MaxRam) // b-a sorts biggest first; this means we don't pollute the "Active Scripts" with all the tiny servers
				.filter(s => s.AvailableRam >= script.TotalRam);

			// if none of the servers have enough ram for this script, then our planning fails
			if (possibleServers.length == 0) {
				return null;
			}

			// add an execution component for this script
			plan.push({
				Execution: script.Execution,
				Server: possibleServers[0].Server,
			});

			// reduce the amount of ram available on the server
			possibleServers[0].AvailableRam -= script.TotalRam;
		}
	}

	// planning complete
	return plan;
}


export function ExecutePlan(ns: NS, plan: ExecutionPlan): number[] {
	const pids: number[] = [];

	for (let i = 0; i < plan.length; i++) {
		if (!ns.scp(plan[i].Execution.Script, plan[i].Server, "home")) {
			KillPids(ns, ...pids);

			throw `Script copy to server ${plan[i].Server} failed.`
		}

		let pid = -1;

		try {
			pid = ns.exec(plan[i].Execution.Script, plan[i].Server, plan[i].Execution.Threads, ...plan[i].Execution.Arguments);
		} catch (err) {
			throw new Error(`Error calling ns.exec(): ${err}`);
		}

		if (pid <= 0) {
			const failingServer = ns.getServer(plan[i].Server);
			const reqRam        = ns.formatRam(plan[i].Execution.Threads * ns.getScriptRam(plan[i].Execution.Script));
			const availRam      = ns.formatRam(failingServer.maxRam - failingServer.ramUsed);

			// execution failed, kill any pids we started and bail
			KillPids(ns, ...pids);

			let planString = "";

			for (let j = 0; j < plan.length; j++) {
				planString += `${j.toString().padStart(2)}: ${plan[j].Server.padEnd(14)} (x${plan[j].Execution.Threads.toString()}) ${plan[j].Execution.Script} [${plan[j].Execution.Arguments.join(",")}]\n`;
			}

			const runningScript = ns.getRunningScript(plan[i].Execution.Script, plan[i].Server, ...plan[i].Execution.Arguments);

			throw `Execution failed at ${i} (using ${reqRam} of ${availRam}).${runningScript != null ? " **dupe**" : ""} Plan: \n${planString}`;
		}

		pids.push(pid);
	}

	return pids;
}


export interface ScriptExecution {
	/** The script (filename) to be executed */
	Script: string,

	/** The number of threads to be used to execute the script */
	Threads: number,

	/** The arguments to be passed to the script */
	Arguments: (string | number | boolean)[],
}


export interface PlanComponent {
	/** The details of the script to be executed */
	Execution: ScriptExecution,

	/** The server on which the script will be executed */
	Server: string,
};


export type ExecutionPlan = PlanComponent[];

