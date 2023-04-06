import { NS } from "@ns";
import { ExploreServers } from "@/_tools/tools";

export async function main(ns: NS) {
	const servers = ExploreServers(ns);

	for (const server of servers) {
		const serverFiles = ns.ls(server)
			//.filter(file => !file.startsWith("/_hack_scripts"));
			.filter(file => file.endsWith(".cct"));

		if (serverFiles.length == 0) {
			continue;
		}

		ns.tprint(server);

		for (const file of serverFiles) {
			ns.tprint(`  ${file}`);
		}
	}
}