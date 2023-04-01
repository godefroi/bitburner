import { NS } from "@ns";

export async function main(ns: NS) : Promise<void> {
	const [targetServer = "", additionalMsec = 0, portHandle = -1] = ns.args;

	// if (typeof(additionalMsec) == "number" && additionalMsec > 0) {
	// 	await ns.sleep(additionalMsec);
	// }

	if (typeof(targetServer) == "string") {
		if (typeof(additionalMsec) == "number" && additionalMsec > 0) {
			await ns.grow(targetServer, { additionalMsec });
		} else {
			await ns.grow(targetServer);
		}
	}

	if (typeof(portHandle) == "number" && portHandle != -1) {
		ns.getPortHandle(portHandle).tryWrite("finished");
	}
}
