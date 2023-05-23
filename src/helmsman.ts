import { type CityName, NS, Server, Player } from "@ns";
import { ExploreServers } from "@/_tools/tools";
import { Compromise } from "@/_tools/hacking";
import { DaemonCommand, Execute } from "@/_tools/daemon";
import { HELMSMAN_PORT } from "@/_tools/ports";
import { FACTIONS } from "@/_tools/faction";
import { BATCHER_RELEVANT_PROGRAMS } from "@/_tools/enums";


class ServerState {
	hostname: string;
	compromised: boolean;
	backdoored: boolean;
	requiredSkill: number;
	backdoorSignificant: boolean;

	constructor(server: Server) {
		this.hostname            = server.hostname;
		this.compromised         = server.hasAdminRights;
		this.backdoored          = server.backdoorInstalled;
		this.requiredSkill       = server.requiredHackingSkill;
		this.backdoorSignificant = FACTIONS.some(f => f.backdoorServer == server.hostname);
	}
}

const GameState = {
	Servers: new Map<string, ServerState>(),
};

interface HelmsmanState {
	servers: Map<string, ServerState>,
	backdoorNeeded: ServerState[],
	haveTor: boolean,
	darkwebPrograms: {program: string, cost: number}[],
}


export async function main(ns: NS) {
	ns.disableLog("ALL");

	const commands: DaemonCommand<{}, HelmsmanState>[] = [
	];

	await Execute(ns, HELMSMAN_PORT, InitializeState, RunDaemon, commands, {});

	return;


	//ns.singularity.workForCompany("Clarke Incorporated", false);

	//ns.singularity.destroyW0r1dD43m0n()
	//ns.tprint("Done!");
}


const pendingDarkwebPrograms = (ns: NS) => ns.singularity.getDarkwebPrograms().map(p => ({program: p, cost: ns.singularity.getDarkwebProgramCost(p)})).filter(p => p.cost > 0);


function InitializeState(ns: NS): HelmsmanState {
	const allServers = ExploreServers(ns, false).map(s => new ServerState(ns.getServer(s)));
	const player     = ns.getPlayer();

	return {
		servers:         new Map<string, ServerState>(allServers.map(s => [s.hostname, s])),
		backdoorNeeded:  allServers.filter(s => s.backdoorSignificant && !s.backdoored),
		haveTor:         ns.singularity.getDarkwebPrograms().length > 0,
		darkwebPrograms: pendingDarkwebPrograms(ns),
	};
}


async function RunDaemon(ns: NS, state: HelmsmanState): Promise<number> {
	const player = ns.getPlayer();

	// if we don't have the TOR program, maybe buy it
	if (!state.haveTor) {
		if (player.money >= 1e6) {
			if (ns.singularity.purchaseTor()) {
				state.haveTor         = true;
				state.darkwebPrograms = pendingDarkwebPrograms(ns);

				ns.print(`Purchased TOR router; ${state.darkwebPrograms.length} pending darkweb purchases.`);
			}
		}
	}

	// if we have the TOR program, maybe buy programs
	if (state.haveTor && state.darkwebPrograms.length > 0) {
		// TODO: buy programs as they make sense
		const purchases = state.darkwebPrograms.filter(p => p.cost < (player.money / 15)).map(p => ({program: p.program, purchased: ns.singularity.purchaseProgram(p.program)}));

		if (purchases.some(s => s.purchased)) {
			state.darkwebPrograms = pendingDarkwebPrograms(ns);
			ns.print(`${state.darkwebPrograms.length} pending darkweb purchases.`);

			const batcherRunning = ns.getRunningScript("/daemons/run-batcher.js", "home", "--daemon") != null;
			const canCompromise  = BATCHER_RELEVANT_PROGRAMS.some(program => purchases.some(purchase => purchase.program == program && purchase.purchased));

			// if we bought hacking programs and the batcher is running, we need to instruct the batcher to rescan
			if (batcherRunning && canCompromise) {
				ns.exec("/daemons/run-batcher.js", "home", 1, "rescan");
			}
		}
	}

	// any backdoor-needed servers from factions
	// should be automatically backdoored when possible
	if (state.backdoorNeeded.length > 0) {
		state.backdoorNeeded = await BackdoorServers(ns, state.backdoorNeeded, player);
	}

	// accept any offered faction invites, assuming they don't block
	// any faction we need (i.e. we need thier unique aug)
	// this means we need to be able to produce the set of city factions we "need"
	const currentInvitations = ns.singularity.checkFactionInvitations();

	if (currentInvitations.length > 0) {
		const currentExclusions = new Set(player.factions.flatMap(f => FACTIONS.find(faction => faction.name == f)?.excludes ?? []));

		currentInvitations.forEach(factionName => {
			const faction = FACTIONS.find(f => f.name == factionName);

			if (faction == undefined) {
				ns.print(`Unrecognized faction offer: ${factionName}`);
				return;
			}

			// don't accept invites that exclude other factions unless they're all already excluded
			if (faction.excludes.length > 0) {
				if (!faction.excludes.every(exclusion => currentExclusions.has(exclusion))) {
					return;
				}
			}

			// otherwise, join the faction
			if (!ns.singularity.joinFaction(factionName)) {
				ns.print(`Faction join failed: ${factionName}`);
			}
		});
	}

	// adjust our current batcher target if it makes sense to do so

	return 10000;
}


async function BackdoorServers(ns: NS, servers: ServerState[], player: Player): Promise<ServerState[]> {
	let modified = false;

	for (const server of servers) {
		// if the server is backdoored or doesn't need to be backdoored, skip it
		if (server.backdoored || !server.backdoorSignificant) {
			modified = true;
			continue;
		}

		// if we don't have sufficient skill to backdoor the server, skip it
		if (server.requiredSkill > player.skills.hacking) {
			continue;
		}

		// otherwise, backdoor it
		if (await InstallBackdoor(ns, server.hostname)) {
			server.backdoored = true;
			modified = true;
			ns.print(`Backdoor installed on ${server.hostname}`);
		} else {
			ns.print(`Backdoor install failed on ${server.hostname}`);
		}
	}

	if (!modified) {
		return servers;
	}

	return servers.filter(s => s.backdoorSignificant && !s.backdoored)
}


async function InstallBackdoor(ns: NS, targetHost: string) {
	const currentServer = ns.getHostname();
	const targetServer  = ns.getServer(targetHost);
	const calculatePath = (dest: string) => {
		const path = [dest];
		while (path[0] !== "home") {
			path.unshift(ns.scan(path[0])[0]);
		}
		return path;
	};

	if (targetServer.backdoorInstalled) {
		// already backdoored
		return true;
	}

	if (targetServer.requiredHackingSkill > ns.getPlayer().skills.hacking) {
		// HL too low
		return false;
	}

	if (!Compromise(ns, targetHost)) {
		// couldn't compromise target host
		return false;
	}

	if (calculatePath(targetHost).map(host => ({host, connected: ns.singularity.connect(host)})).some(v => !v.connected)) {
		// couldn't connect through path to target host
		return false;
	}

	// install the backdoor
	await ns.singularity.installBackdoor();

	// connect to home
	ns.singularity.connect("home");

	if (currentServer != "home") {
		// then take us back where we were
		if (calculatePath(currentServer).map(host => ({host, connected: ns.singularity.connect(host)})).some(v => !v.connected)) {
			// couldn't connect through path to target host
			return false;
		}
	}

	return true;
}
