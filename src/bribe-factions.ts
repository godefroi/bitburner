import { NS } from "@ns";

export async function main(ns: NS) {
	/*const flags = ns.flags([
		["daemon", false],
		["port",   HACKNET_PORT]
	]);*/

	// const foo: FlagMetadata[] = [
	// 	{
	// 		name: "daemon",
	// 		default: false,
	// 		description: "the daemon flag"
	// 	},
	// 	{
	// 		name: "port",
	// 		default: 2,
	// 		description: "the port number"
	// 	}
	// ];

	// ns.tprint(JSON.stringify(foo.map(m => ([m.name, m.default]))));

	//ns.formulas.reputation.repFromDonation
	if (!ns.corporation.hasCorporation()) {
		ns.tprint("No corporation exists.");
		return;
	}

	const corpFunds = ns.corporation.getCorporation().funds;

	if (corpFunds < 1e11) {
		ns.tprint(`Insufficient funds to bribe; minimum funds 1e11, current funds ${ns.formatNumber(corpFunds)}`);
		return;
	}

	const fundsToSpend = (corpFunds / 100);
	const factions     = ns.getPlayer().factions;

	for (const faction of factions) {
		ns.corporation.bribe(faction, Math.floor(fundsToSpend / factions.length));
	}
}

interface FlagMetadata {
	name: string,
	default: (string | number | boolean | string[]),
	description?: string
}