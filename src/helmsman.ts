import { type CityName, NS } from "@ns";
import { ExploreServers, WaitPids } from "@/_tools/tools";
import { CITIES, COMBAT_SKILLS, GYMS } from "@/_tools/enums";
import { Compromise } from "./_tools/hacking";


class ServerState {
	hostname: string;
	compromised: boolean;
	backdoored: boolean;

	constructor(ns: NS, hostName: string) {
		const server = ns.getServer(hostName);

		this.hostname    = server.hostname;
		this.compromised = server.hasAdminRights;
		this.backdoored  = server.backdoorInstalled;
	}
}

const GameState = {
	Servers: new Map<string, ServerState>(),
};


export async function main(ns: NS) {
	ns.disableLog("sleep");
	//ns.singularity.installBackdoor()
	//ExploreServers(ns)
	//ns.singularity.

	//const purchasedServers = ns.getPurchasedServers();

	//ExploreServers(ns).filter(s => !purchasedServers.includes(s)).forEach(s => GameState.AllServers.add(s));
	//ns.tprint(`AllServers contains ${GameState.AllServers.size} entries.`);

	//Array.from(GameState.AllServers).filter()



	await InstallBackdoor(ns, "CSEC");
	await InstallBackdoor(ns, "I.I.I.I");
	await InstallBackdoor(ns, "avmnite-02h");
	await InstallBackdoor(ns, "run4theh111z");
	await InstallBackdoor(ns, "fulcrumassets");
	await InstallBackdoor(ns, "The-Cave");
	await TrainCombatSkills(ns, 1200);

	//ns.singularity.destroyW0r1dD43m0n()
	ns.tprint("Done!");
}

async function TrainCombatSkills(ns: NS, target: number) {
	const needFocus   = !ns.singularity.getOwnedAugmentations().some(augName => augName == "Neuroreceptor Management Implant");
	const currentCity = ns.getPlayer().city;
	const gym         = GYMS.find(g => g.city == currentCity);

	if (gym == undefined) {
		ns.tprint("Need to be in Aevum (best), Volhaven (2nd), or Sector-12 (worst) to work out.");
		return;
	}

	for (const skill of COMBAT_SKILLS) {
		if (skill.currentLevel(ns) >= target) {
			continue;
		}

		if (!ns.singularity.gymWorkout(gym.gym, skill.stat, needFocus)) {
			ns.tprint(`Workout failed in gym ${gym.gym} (${gym.city}) targeting ${skill.stat}`);
			return;
		}

		while (skill.currentLevel(ns) < target) {
			await ns.sleep(5000);
		}
	}
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