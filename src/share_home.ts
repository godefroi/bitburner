import { NS } from "@ns";

const SHARE_SCRIPT = "/_hack_scripts/_hs_share.js";

export async function main(ns: NS): Promise<void> {
	const scriptRam   = ns.getScriptRam(SHARE_SCRIPT);
	const homeRam     = ns.getServerMaxRam("home");
	const ramToUse    = homeRam - (1024 * 5);
	const threadCount = Math.floor(ramToUse / scriptRam);

	ns.tprint(`Using ${ns.formatRam(ramToUse)} ram (of ${ns.formatRam(homeRam)}) to run ${threadCount} threads (${scriptRam} per)`);

	ns.exec(SHARE_SCRIPT, "home", threadCount);
}
