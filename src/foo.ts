import { NS } from "@ns";
import * as tools from "@/_tools/tools";
import * as hacking from "@/_tools/hacking";

export async function main(ns: NS) {
	const servers = tools.ExploreServers(ns)
		.filter(s => ns.getServerMaxRam(s) > 0 && hacking.Compromise(ns, s));

	//await PrepareServer(ns, servers, "zb-def", 20);
}


