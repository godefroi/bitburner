import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";
import { Compromise, FindHackingTarget } from "@/_tools/hacking";

const AIO_SCRIPT = "/_hack_scripts/_hs_aio.js";

export async function main(ns: NS) {
	let bestTarget = ns.args.length > 0 ? ns.args[0].toString() : FindHackingTarget(ns);

	const allowHome  = ns.args.length > 1 ? Boolean(ns.args[1]) : false;
	const servers    = ExploreServers(ns)
		.map(s => ns.getServer(s))
		.filter(s => s.maxRam > 0 && Compromise(ns, s.hostname));

	if (bestTarget == "-") {
		bestTarget = FindHackingTarget(ns);
	}

	if (allowHome) {
		servers.push(ns.getServer("home"));
	}

	let scount = 0;
	let tcount = 0;

	for (const server of servers) {
		const startedThreads = RunAioHackScript(ns, server.hostname);

		if (startedThreads > 0) {
			scount += 1;
			tcount += startedThreads;
		}
	}

	ns.tprint(`Script started across ${scount} servers using ${tcount} threads, targeting ${bestTarget}`);
}


function RunAioHackScript(ns: NS, server: string): number {
	const ramPerThread = ns.getScriptRam(AIO_SCRIPT);
	const bestTarget   = FindHackingTarget(ns);

	let totalThreads = 0;

	if (server != "home") {
		// kill any running scripts
		ns.killall(server, true);

		// copy the script(s) we might want to run
		ns.scp(AIO_SCRIPT, server, "home");
	}

	while (true) {
		const targetServer    = ns.getServer(server);
		const availableRam    = targetServer.maxRam - targetServer.ramUsed;
		const possibleThreads = Math.min(100, Math.floor(availableRam / ramPerThread));

		if (possibleThreads <= 0) {
			break;
		}

		if (ns.exec(AIO_SCRIPT, server, possibleThreads, bestTarget, totalThreads) == 0) {
			break;
		}

		totalThreads += possibleThreads;
	}

	return totalThreads;
}
