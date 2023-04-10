import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";
import { Compromise, TargetServerWeight } from "./_tools/hacking";

export async function main(ns: NS) {
	const targets = ExploreServers(ns)
		.filter(s => Compromise(ns, s))
		.sort((a, b) => TargetServerWeight(ns, b) - TargetServerWeight(ns, a));

	if (targets.length == 0) {
		targets.push("n00dles");
	}

	ns.tprint("Server Name       | Skill | Max Money | Mny %  | Diff %")
	ns.tprint("------------------+-------+-----------|--------|-------");

	for (let i = 0; i < targets.length && i < 10; i++) {
		const server = ns.getServer(targets[i]);

		ns.tprint(`${server.hostname.padEnd(17)} | ${server.requiredHackingSkill.toString().padStart(5)} | ${ns.formatNumber(server.moneyMax).padStart(9)} | ${ns.formatPercent(server.moneyAvailable / server.moneyMax).padStart(6)} | ${ns.formatPercent(server.minDifficulty / server.hackDifficulty).padStart(6)}`);
	}
}
