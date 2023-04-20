import { NS } from "@ns";
import { FACTIONS, FactionType } from "@/_tools/faction";

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

	const ownedAugs        = ns.singularity.getOwnedAugmentations(true);
	const joinedFactions   = ns.getPlayer().factions;
	const relevantFactions = FACTIONS
		.filter(f => !joinedFactions.includes(f.name))
		.filter(f => f.type != FactionType.Endgame)
		.filter(f => ns.singularity.getAugmentationsFromFaction(f.name).some(aug => !ownedAugs.includes(aug)));

	ns.tprint("Relevant pending factions:")
	for (const faction of relevantFactions) {
		ns.tprint(`\t${faction.name} (${FactionType[faction.type]})`);
	}

	ns.tprint("");
	ListOfferedAugmentations(ns);
}

function ListOfferedAugmentations(ns: NS) {
	const ownedAugs     = new Set(ns.singularity.getOwnedAugmentations(true));
	const availableAugs = ns.getPlayer().factions
		.flatMap(factionName => GetOfferedAugmentations(ns, factionName, ownedAugs))
		.filter(aug => aug.PrerequisitesMet && aug.RepRequirementMet)
		.sort((a, b) => b.Price - a.Price);

	for (const aug of availableAugs) {
		ns.tprint(`${aug.Name.padEnd(45)} | ${ns.formatNumber(aug.Price).padEnd(8)} | ${aug.FactionName.padEnd(20)} |`);
	}
}


function GetOfferedAugmentations(ns: NS, factionName: string, ownedAugmentations: Set<string>) {
	const factionRep = ns.singularity.getFactionRep(factionName);

	return ns.singularity.getAugmentationsFromFaction(factionName)
		.filter(augName => !ownedAugmentations.has(augName))
		.map(augName => {
			const prereqs = ns.singularity.getAugmentationPrereq(augName);
			const repReq  = ns.singularity.getAugmentationRepReq(augName);
			
			return {
				Name: augName,
				FactionName: factionName,
				BasePrice: ns.singularity.getAugmentationBasePrice(augName),
				Price: ns.singularity.getAugmentationPrice(augName),
				RepRequired: repReq,
				RepRequirementMet: factionRep >= repReq,
				Prerequisites: prereqs,
				PrerequisitesMet: prereqs.every(prereq => ownedAugmentations.has(prereq)),
				Stats: ns.singularity.getAugmentationStats(augName)
			};
		});
}

class AugmentationInformation {
	name: string;
	faction: string;
	basePrice: number;
	price: number;
	repRequired: number;

	constructor(ns: NS, name: string, faction: string, factionRep: number) {
		this.name        = name;
		this.faction     = faction;
		this.basePrice   = ns.singularity.getAugmentationBasePrice(name),
		this.price       = ns.singularity.getAugmentationPrice(name),
		this.repRequired = ns.singularity.getAugmentationRepReq(name);
	}
}