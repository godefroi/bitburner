import { NS } from "@ns";

export async function main(ns: NS) : Promise<void> {
	const [targetServer = "", preDelay = 0, portHandle = -1] = ns.args;

	if (typeof(preDelay) == "number" && preDelay > 0) {
		await ns.sleep(preDelay);
	}

	if (typeof(targetServer) == "string") {
		await ns.weaken(targetServer);
	}

	if (typeof(portHandle) == "number" && portHandle != -1) {
		ns.getPortHandle(portHandle).tryWrite(JSON.stringify({pid: ns.pid, endTime: performance.now()}));
	}
}
