import { NS } from "@ns";


export function ExploreServers(ns: NS): string[] {
	const exploredSet = new Set(["home"]);

	for (const toExplore of exploredSet) {
		for (const connectedServer of ns.scan(toExplore)) {
			exploredSet.add(connectedServer);
		}
	}

	exploredSet.delete("home");

	return Array.from(exploredSet);
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


export function TerminateScripts(ns: NS, serverNames: string[], ...scriptNames: string[]) {
	serverNames.map(serverName =>
		scriptNames.map(scriptName =>
			ns.scriptKill(scriptName, serverName)));
}
