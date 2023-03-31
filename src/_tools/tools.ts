import { NS } from "@ns";


export function ExploreServers(ns: NS): string[] {
	const exploredSet = new Set(["home"]);

	for (const toExplore of exploredSet) {
		for (const connectedServer of ns.scan(toExplore)) {
			exploredSet.add(connectedServer);
		}
	}

	return Array.from(exploredSet);
}


export function Compromise(ns: NS, hostName: string): boolean {
	let targetServer = ns.getServer(hostName);

	if (targetServer.hasAdminRights) {
		return true;
	}

	if (!targetServer.sshPortOpen && ns.fileExists("BruteSSH.exe", "home")) {
		ns.brutessh(hostName);
	}

	if (!targetServer.ftpPortOpen && ns.fileExists("FTPCrack.exe", "home")) {
		ns.ftpcrack(hostName);
	}

	if (!targetServer.smtpPortOpen && ns.fileExists("relaySMTP.exe", "home")) {
		ns.relaysmtp(hostName);
	}

	if (!targetServer.httpPortOpen && ns.fileExists("HTTPWorm.exe", "home")) {
		ns.httpworm(hostName);
	}

	if (!targetServer.sqlPortOpen && ns.fileExists("SQLInject.exe", "home")) {
		ns.sqlinject(hostName);
	}

	targetServer = ns.getServer(hostName);

	if (targetServer.numOpenPortsRequired >= targetServer.openPortCount) {
		ns.nuke(hostName);
		ns.tprintf(`Compromised new server ${hostName}`);
		return true;
	}

	return false;
}


export function FindHackingTarget(ns: NS): string {
	// As a rule of thumb, your hacking target should be the server with
	// highest max money that’s required hacking level is under 1/2 of
	// your hacking level.

	const targetHackingSkill = Math.floor(ns.getPlayer().skills.hacking / 2);
	const possibleServers    = ExploreServers(ns)
		.filter(s => Compromise(ns, s))
		.filter(s => ns.getServerRequiredHackingLevel(s) <= targetHackingSkill);

	if (possibleServers.length == 0) {
		return "n00dles";
	}

	possibleServers.sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));

	return possibleServers[0];
}


/**
 * Calculate a weight that can be used to sort servers by hack desirability
 */
export function TargetServerWeight(ns: NS, serverName: string): number {
	if (!serverName || serverName.startsWith('hacknet-node')) {
		return 0;
	}

	const player = ns.getPlayer();
	const server = ns.getServer(serverName);

	// Set security to minimum on the server object (for Formula.exe functions)
	server.hackDifficulty = server.minDifficulty;

	// We cannot hack a server that has more than our hacking skill so these have no value
	if (server.requiredHackingSkill > player.skills.hacking) {
		return 0;
	}

	// Default pre-Formulas.exe weight. minDifficulty directly affects times, so it substitutes for min security times
	let weight = server.moneyMax / server.minDifficulty;

	// If we have formulas, we can refine the weight calculation
	if (ns.fileExists("Formulas.exe", "home")) {
		// We use weakenTime instead of minDifficulty since we got access to it, 
		// and we add hackChance to the mix (pre-formulas.exe hack chance formula is based on current security, which is useless)
		weight = server.moneyMax / ns.formulas.hacking.weakenTime(server, player) * ns.formulas.hacking.hackChance(server, player);
	} else if (server.requiredHackingSkill > player.skills.hacking / 2) {
		// If we do not have formulas, we can't properly factor in hackchance, so we lower the hacking level tolerance by half
		return 0;
	}

	return weight;
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
