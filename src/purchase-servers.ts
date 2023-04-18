import { NS } from "@ns";

export async function main(ns: NS) {
	const startingRam    = 8;
	const serverMaxRam   = ns.getPurchasedServerMaxRam();
	const maxServerCount = ns.getPurchasedServerLimit();
	const initialCost    = ns.getPurchasedServerCost(startingRam);

	let upgradeTarget = startingRam * 2;

	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("getServerMaxRam");
	ns.disableLog("sleep");

	ns.tprint("Purchasing servers...");

	while (ns.getPurchasedServers().length < maxServerCount) {
		while (initialCost > (ns.getServerMoneyAvailable("home") / 10)) {
			await ns.sleep(5000);
		}

		ns.purchaseServer("pserv-" + ns.getPurchasedServers().length, startingRam);
		await ns.sleep(100);
	}

	const purchasedServers = ns.getPurchasedServers();

	ns.tprint("Upgrading servers...");

	while (upgradeTarget <= serverMaxRam) {
		const upgradeCost = purchasedServers
			.filter(s => ns.getServerMaxRam(s) < upgradeTarget)
			.reduce((total, server) => total + ns.getPurchasedServerUpgradeCost(server, upgradeTarget), 0);

		let reported = false;

		if (upgradeCost <= 0) {
			upgradeTarget *= 2;
			continue;
		}

		// wait until the upgrade would cost <=10% of our money
		while (upgradeCost > (ns.getServerMoneyAvailable("home") / 10)) {
			if (!reported) {
				reported = true;
				ns.tprint(`Upgrading to ${ns.formatRam(upgradeTarget)} will cost ${ns.formatNumber(upgradeCost)}, will upgrade at ${ns.formatNumber(upgradeCost * 10)}`);
			}

			await ns.sleep(60000);
		}

		// perform the upgrade
		for (const server of purchasedServers.filter(s => ns.getPurchasedServerUpgradeCost(s, upgradeTarget) > 0)) {
			if (!ns.upgradePurchasedServer(server, upgradeTarget)) {
				ns.tprint(`Failed to upgrade server ${server}`);
			}
		}

		ns.tprint(`Purchased servers upgraded to ${ns.formatRam(upgradeTarget)}`);

		// move to the next upgrade target
		upgradeTarget *= 2;
		await ns.sleep(1000);
	}

	ns.tprint(`All servers upgraded to ${ns.formatRam(upgradeTarget / 2)}`);
}