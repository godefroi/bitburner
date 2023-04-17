import { NS } from "@ns";

export async function main(ns: NS) {
	// const target = ns.args[0].toString();
	// const path   = Seek(ns, "home", target);

	// if (path == "") {
	// 	ns.tprintf("No path found to %s", target);
	// } else {
	// 	ns.tprintf("%s", path);
	// }	

	let path = [ns.args[0].toString()];

	const hl   = ns.getPlayer().skills.hacking;

	// this works because the first item returned is always the "upstream" (i.e. toward home) server
	while (path[0] !== "home") {
		path.unshift(ns.scan(path[0])[0]);
	}

	for (let i = path.length - 1; i >= 0; i--) {
		if (ns.getServer(path[i]).backdoorInstalled) {
			path = path.slice(i);
			break;
		} else if (ns.getServerRequiredHackingLevel(path[i]) <= hl) {
			path[i] += " (!)";
		}
	}

	ns.tprint(path.join(" -> "));
}


function Seek(ns: NS, fromServer: string, targetServer: string, upstream: string | undefined = undefined): string {
	//ns.tprintf("Seeking %s from %s (with %s upstream)", targetServer, fromServer, upstream);
	for (const server of ns.scan(fromServer)) {
		if (server == upstream) {
			// if this server is upstream (i.e. along the path),
			// ignore it
			//ns.tprintf("  ... %s is upstream, aborting", server);
			continue;
		}

		if (server == targetServer) {
			// if we can reach the target from this server, then return
			// the name of the target
			//ns.tprintf("  ... %s is reachable from %s", targetServer, fromServer);
			return fromServer + " > " + targetServer;
		}

		//ns.tprintf("  ... diving deeper ");
		const path = Seek(ns, server, targetServer, fromServer);

		if (path != "") {
			return fromServer + " > " + path;
		}
	}

	return "";
}
