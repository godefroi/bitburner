import { NS } from "@ns";

export async function main(ns: NS) {
	if (ns.args.length < 1) {
		ns.tprint("Provide the hostname as the argument.");
		return;
	}

	const calculatePath = (dest: string) => {
		const path = [dest];
		while (path[0] !== "home") {
			path.unshift(ns.scan(path[0])[0]);
		}
		return path;
	};

	if (ns.getPlayer().location != "home") {
		ns.singularity.connect("home");
	}

	calculatePath(ns.args[0].toString()).forEach(hostName => ns.singularity.connect(hostName));
}