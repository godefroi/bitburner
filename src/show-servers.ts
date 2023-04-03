import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";

export async function main(ns: NS) {
	ns.tprint(JSON.stringify(ExploreServers(ns), null, "\t"));
}
