import { NS } from "@ns";

export async function main(ns: NS) {
	const startingRam    = 8;
	const serverMaxRam   = ns.getPurchasedServerMaxRam();
	const maxServerCount = ns.getPurchasedServerLimit();
	const initialCost    = ns.getPurchasedServerCost(startingRam);

	let upgradeTarget = startingRam * 2;

	ns.tprint("Purchasing servers...");

	while (ns.getPurchasedServers().length < maxServerCount) {
		while ((ns.getServerMoneyAvailable("home") / 10) > initialCost) {
			await ns.sleep(5000);
		}

		ns.purchaseServer("pserv-" + ns.getPurchasedServers().length, startingRam);
	}

	const purchasedServers = ns.getPurchasedServers();

	ns.tprint("Upgrading servers...");

	while (upgradeTarget <= serverMaxRam) {
		ns.tprint(`Checking for upgrade to ${ns.formatRam(upgradeTarget)}`);

		const upgradeCost = purchasedServers.reduce((total, server) => total + ns.getPurchasedServerUpgradeCost(server, upgradeTarget), 0);

		if (upgradeCost <= 0) {
			upgradeTarget *= 2;
			continue;
		}

		ns.tprint(`Upgrading servers to ${ns.formatRam(upgradeTarget)} would cost ${ns.formatNumber(upgradeCost)}`);

		// wait until the upgrade would cost <=10% of our money
		while (upgradeCost > (ns.getServerMoneyAvailable("home") / 10)) {
			await ns.sleep(60000);
		}

		ns.tprint(`Upgrading to ${ns.formatRam(upgradeTarget)}, cost ${ns.formatNumber(upgradeCost)}`);

		// perform the upgrade
		for (const server of purchasedServers.filter(s => ns.getPurchasedServerUpgradeCost(s, upgradeTarget) > 0)) {
			if (!ns.upgradePurchasedServer(server, upgradeTarget)) {
				ns.tprint(`Failed to upgrade server ${server}`);
			} else {
				ns.tprint(`Upgraded server ${server} to ${ns.formatRam(upgradeTarget)}`);
			}
		}

		// move to the next upgrade target
		upgradeTarget *= 2;
		await ns.sleep(1000);
	}

	ns.tprint(`All servers upgraded to ${ns.formatRam(upgradeTarget / 2)}`);
}