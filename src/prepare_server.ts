import { NS } from "@ns";
import { Prepared, PrepareServer } from "@/_tools/preparation";
import { FindHackingTarget } from "@/_tools/hacking";


export async function main(ns: NS) {
	const bestTarget = FindHackingTarget(ns);

	ns.tprint(`Prepping server ${bestTarget} for hacking...`);

	while (!Prepared(ns, bestTarget)) {
		await PrepareServer(ns, ["home"], bestTarget);
	}
	
	ns.tprint(`Server ${bestTarget} prepared and ready.`);
}

