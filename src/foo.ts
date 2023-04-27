import { type CrimeType, NS, CrimeStats } from "@ns";
import { CRIMES } from "./_tools/enums";

export async function main(ns: NS) {
	// const servers = tools.ExploreServers(ns)
	// 	//.filter(s => ns.getServerMaxRam(s) > 0 && hacking.Compromise(ns, s));
	// 	.map(s => ns.getServer(s));

	// const noRamServers = servers.filter(s => s.maxRam >= 64)
	// ns.tprint(`>32gb servers: ${noRamServers.length}`);
	// noRamServers.forEach(s => ns.tprint(`\t${s.hostname}`));

	//await PrepareServer(ns, servers, "zb-def", 20);
	//ns.singularity.
	//foo(ns, faction.FactionNames.Aevum);
	//ns.tprint(ns.getServerMaxRam("home"));

	// const myCityName: `${CityName}` = "Aevum";
	// for (const cn of `${CityName}`) {

	// }

	interface CrimeData {type: CrimeType, chance: number, stats: CrimeStats};
	const moneyPerHour = (c: CrimeData) => ((c.stats.money / c.stats.time) * (1000 * 60 * 60)) * c.chance;

	Array.from(CRIMES)
		.map(ct => ({type: ct, chance: ns.singularity.getCrimeChance(ct), stats: ns.singularity.getCrimeStats(ct)}))
		.sort((a, b) => moneyPerHour(a) - moneyPerHour(b))
		.forEach(c => ns.tprint(`${c.type.padEnd(16)} $${ns.formatNumber(c.stats.money)}, ${ns.tFormat(c.stats.time).padEnd(20)}, ${c.chance} -> ${ns.formatNumber(moneyPerHour(c))}`));

	return;
	//ns.singularity.cri
}
