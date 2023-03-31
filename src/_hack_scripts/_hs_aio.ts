import { NS } from "@ns";

export async function main(ns: NS) {
	const target         = ns.args.length > 0 ? ns.args[0].toString() : "n00dles";
	const moneyThresh    = ns.getServerMaxMoney(target) * 0.75;
	const securityThresh = ns.getServerMinSecurityLevel(target) + 5;

	// sleep so we don't all start at the same time
	await ns.sleep(Math.floor(Math.random() * 300000));

	while (true) {
		if (ns.getServerSecurityLevel(target) > securityThresh) {
			await ns.weaken(target);
		} else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
			await ns.grow(target);
		} else {
			await ns.hack(target);
		}
	}
}
