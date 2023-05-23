import { NS } from "@ns";
import { ExploreServers, KillPids } from "@/_tools/tools";
import { Compromise } from "@/_tools/hacking";

const SHARE_SCRIPT = "/_hack_scripts/_hs_share.js";

export async function main(ns: NS): Promise<void> {
	const scriptRam   = ns.getScriptRam(SHARE_SCRIPT);

	const pids: number[] = [];

	if (ns.args.length > 0 && ns.args[0].toString() == "all") {
		pids.push(...ExploreServers(ns, true)
			.map(s => ns.getServer(s))
			.filter(s => (s.maxRam - s.ramUsed) > 0 && Compromise(ns, s.hostname))
			.map(s => ShareServer(ns, s.hostname, scriptRam, 0)));
	}

	pids.push(ShareServer(ns, "home", scriptRam, 64));

	ns.atExit(() => {
		KillPids(ns, ...pids);
	});

	while (true) {
		await ns.sleep(60000);
	}
}


function ShareServer(ns: NS, serverName: string, scriptRam: number, ramToReserve: number = 0): number {
	const server      = ns.getServer(serverName);
	const threadCount = Math.floor((server.maxRam - (server.ramUsed + ramToReserve)) / scriptRam);

	if (threadCount <= 0) {
		return -1;
	}

	ns.tprint(`Running ${threadCount} share threads on server ${serverName}`);

	ns.scp(SHARE_SCRIPT, serverName, "home");

	return ns.exec(SHARE_SCRIPT, serverName, threadCount);
}
