import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";

export const HACK_SCRIPT  = "/_hack_scripts/_hs_hack.js";
export const GROW_SCRIPT  = "/_hack_scripts/_hs_grow.js";
export const WEAK_SCRIPT  = "/_hack_scripts/_hs_weaken.js";


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

	if (targetServer.openPortCount >= targetServer.numOpenPortsRequired) {
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

	if (server.moneyMax <= 0) {
		return -1;
	}

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


