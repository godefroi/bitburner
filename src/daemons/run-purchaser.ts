import { NS } from "@ns";
import { Execute } from "@/_tools/daemon";
import { PURCHASER_PORT } from "@/_tools/ports";

const INITIAL_RAM = 8;

type PurchaserState = {
	serverMaxRam: number,
	maxServerCount: number,
	initialCost: number,
	purchasedServers: {server: string, maxRam: number}[],
}

type PurchaserFlags = {

}


export async function main(ns: NS) {
	ns.disableLog("ALL");

	await Execute(ns, PURCHASER_PORT, InitializeState, RunDaemon, [
		{
			command: "upgradenow",
			helpText: "Executes the next round of upgrades immediately",
			handler: async (ns, args, flags, state) => {
				const {ramTarget, totalCost, toUpgrade} = CalculateUpgrade(ns, state);
				const fundsAvail  = ns.getServerMoneyAvailable("home");

				if (totalCost > fundsAvail) {
					ns.tprint(`Unable to execute upgrade; cost for ${toUpgrade.length} servers to ${ns.formatRam(ramTarget)} is ${ns.formatNumber(totalCost)}, ${ns.formatNumber(fundsAvail)} available.`);
					return;
				}

				ExecuteUpgrade(ns, state, ramTarget, toUpgrade);
			}
		},
		{
			command: "status",
			helpText: "Instructs the daemon to report status information",
			handler: async (ns, args, flags, state) => {
				const {ramTarget, totalCost, toUpgrade} = CalculateUpgrade(ns, state);
				ns.tprint(`${state.purchasedServers.length} owned; next upgrade of ${toUpgrade.length} servers to ${ns.formatRam(ramTarget)} will cost ${ns.formatNumber(totalCost)}`);
			}
		}
	], {});
}


function InitializeState(ns: NS): PurchaserState {
	return {
		serverMaxRam: ns.getPurchasedServerMaxRam(),
		maxServerCount: ns.getPurchasedServerLimit(),
		initialCost: ns.getPurchasedServerCost(INITIAL_RAM),
		purchasedServers: ns.getPurchasedServers().map(s => ({server: s, maxRam: ns.getServerMaxRam(s)})),
	};
}


async function RunDaemon(ns: NS, state: PurchaserState) {
	// buy servers if we're under the max number
	while (state.purchasedServers.length < state.maxServerCount) {
		// don't spend more than 10% of our money on buying a new server
		if (state.initialCost > (ns.getServerMoneyAvailable("home") / 10)) {
			return 5000;
		}

		const newName = `pserv-${state.purchasedServers.length}`;

		state.purchasedServers.push({server: ns.purchaseServer(newName, INITIAL_RAM), maxRam: INITIAL_RAM});

		ns.print(`Purchased ${newName} at cost ${ns.formatNumber(state.initialCost)}`);
	}

	// then, check to see if we're good to upgrade
	let {ramTarget, totalCost, toUpgrade} = CalculateUpgrade(ns, state);

	while (totalCost < (ns.getServerMoneyAvailable("home") / 10)) {
		// execute the upgrade
		const nextUpgrade = ExecuteUpgrade(ns, state, ramTarget, toUpgrade);

		if (nextUpgrade == null) {
			// calculate the next upgrade
			({ramTarget, totalCost, toUpgrade} = CalculateUpgrade(ns, state));
		} else {
			// it was already calculated for us
			({ramTarget, totalCost, toUpgrade} = nextUpgrade);
		}
	}

	// if we're completely upgraded, then we can exit the daemon
	if (totalCost >= Infinity) {
		return -1;
	}

	return 60000;
}


function CalculateUpgrade(ns: NS, state: PurchaserState) {
	const minRam = Math.min(...state.purchasedServers.map(s => s.maxRam));

	if (minRam >= state.serverMaxRam) {
		return {ramTarget: minRam, totalCost: Infinity, toUpgrade: []};
	}

	const ramTarget = minRam * 2;
	const toUpgrade = state.purchasedServers.filter(s => s.maxRam <= minRam).map(s => s.server);
	const totalCost = toUpgrade.reduce((total, s) => total + ns.getPurchasedServerUpgradeCost(s, ramTarget), 0);
	
	return {ramTarget, totalCost, toUpgrade};
}


function ExecuteUpgrade(ns: NS, state: PurchaserState, ramTarget: number, toUpgrade: string[]) {
	for (const server of state.purchasedServers) {
		if (!toUpgrade.includes(server.server)) {
			continue;
		}

		if (!ns.upgradePurchasedServer(server.server, ramTarget)) {
			return null;
		}

		server.maxRam = ramTarget;
	}

	const nextUpgrade = CalculateUpgrade(ns, state);

	ns.tprint(`${toUpgrade.length} servers upgraded to ${ns.formatRam(ramTarget)}; next upgrade to ${ns.formatRam(nextUpgrade.ramTarget)} will cost ${ns.formatNumber(nextUpgrade.totalCost)}.`);

	return nextUpgrade;
}
