import { NS } from "@ns";
import { Prepared, PrepareServer } from "@/_tools/preparation";
import { Compromise, FindHackingTarget } from "@/_tools/hacking";
import { ExploreServers } from "@/_tools/tools";

export async function main(ns: NS) {
	const bestTarget = ns.args.length > 0 ? ns.args[0].toString() : FindHackingTarget(ns);
	const servers    = ExploreServers(ns)
		.filter(s => ns.getServerMaxRam(s) > 0 && Compromise(ns, s));

	while (!Prepared(ns, bestTarget)) {
		await PrepareServer(ns, servers, bestTarget, 20);
	}

	ns.tprint(`Server ${bestTarget} prepared and ready.`);
}

