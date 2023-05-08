import { NS } from "@ns";

export async function main(ns: NS) : Promise<void> {
	const flags = ns.flags([
		["target", ""],
		["delay",   0],
		["port",   -1],
		["batch",  -1],
		["type",  "G"],
	]) as {target: string, delay: number, port: number, batch: number, type: string};

	if (flags.target != "") {
		if (flags.delay > 0) {
			await ns.weaken(flags.target, { additionalMsec: flags.delay });
		} else {
			await ns.weaken(flags.target);
		}
	}

	if (flags.port != -1) {
		ns.tryWritePort(flags.port, JSON.stringify({batch: flags.batch, type: flags.type, target: flags.target, finishTime: Date.now()}));
	}
}
