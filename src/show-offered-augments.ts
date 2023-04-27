import { Multipliers, NS } from "@ns";
import { FACTIONS, FactionType } from "@/_tools/faction";
import { CITIES } from "@/_tools/enums";

export async function main(ns: NS) {
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

	ns.tprint("");
	ListCityAugmentations(ns);
}


function ListOfferedAugmentations(ns: NS) {
	const ownedAugs     = new Set(ns.singularity.getOwnedAugmentations(true));
	const availableAugs = ns.getPlayer().factions
		.flatMap(factionName => GetOfferedAugmentations(ns, factionName, ownedAugs))
		.filter(aug => aug.prereqsMet && aug.repMet)
		.sort((a, b) => b.price - a.price);

	for (const aug of availableAugs) {
		ns.tprint(`${aug.name.padEnd(45)} | ${ns.formatNumber(aug.price).padEnd(8)} | ${aug.faction.padEnd(21)}`);
		ns.tprint(`\t${StatDescriptions(ns, aug.stats).join(", ")}`);
	}
}


function GetOfferedAugmentations(ns: NS, factionName: string, ownedAugmentations: Set<string>) {
	const factionRep = ns.singularity.getFactionRep(factionName);

	return ns.singularity.getAugmentationsFromFaction(factionName)
		.filter(augName => !ownedAugmentations.has(augName))
		.map(augName => new AugmentationInformation(ns, augName, factionName, factionRep, ownedAugmentations));
}


function ListCityAugmentations(ns: NS) {
	const ownedAugs = new Set(ns.singularity.getOwnedAugmentations(true));
	const cityAugs: AugmentationInformation[] = [];

	for (const city of CITIES) {
		cityAugs.push(...GetOfferedAugmentations(ns, city, ownedAugs));
	}

	const augGroups = cityAugs.reduce((groups: Record<string, AugmentationInformation[]>, augment) => {
		groups[augment.name] = groups[augment.name] || [];
		groups[augment.name].push(augment);
		return groups;
	}, Object.create(null));

	for (const name in augGroups) {
		ns.tprint(`${name} (${StatDescriptions(ns, augGroups[name][0].stats).join(", ")})`);

		for (const foo of augGroups[name]) {
			ns.tprint(`\t${foo.faction}`);
		}
	}
}


function StatDescriptions(ns: NS, multipliers: Multipliers) {
	const ret: string[] = [];
	//const partOnes = ["exp", "money", "speed", "chance"];

	const statNames = new Map<string, string>([
		["agility",   "agi"],
		["charisma",  "cha"],
		["defense",   "def"],
		["dexterity", "dex"],
		["hacking",   "hck"],
		["strength",  "str"],
	]);
	const partOnes = new Map<string, string>([
		["exp",    "xp"],
		["money",  "$"],
		["speed",  "spd"],
		["chance", "ch"],
		["grow",   "grw"],
	]);

	const addSkillDescription = (multiplier: number, skill: string, stat: string) => multiplier - 1 > 0 ? ret.push(`+${ns.formatPercent(multiplier - 1)} ${skill} ${stat}`) : undefined;

	// addSkillDescription(multipliers.agility,       "agility",   "skill");
	// addSkillDescription(multipliers.agility_exp,   "agility",   "exp");
	// addSkillDescription(multipliers.charisma,      "charisma",  "skill");
	// addSkillDescription(multipliers.charisma_exp,  "charisma",  "exp");
	// addSkillDescription(multipliers.defense,       "defense",   "skill");
	// addSkillDescription(multipliers.defense_exp,   "defense",   "exp");
	// addSkillDescription(multipliers.dexterity,     "dexterity", "skill");
	// addSkillDescription(multipliers.dexterity_exp, "dexterity", "exp");
	// addSkillDescription(multipliers.hacking,       "hacking",   "skill");
	// addSkillDescription(multipliers.hacking_exp,   "hacking",   "exp");
	// addSkillDescription(multipliers.strength,      "strength",  "skill");
	// addSkillDescription(multipliers.strength_exp,  "strength",  "exp");

	const multRec = multipliers as unknown as Record<string, number>;

	for (const s in multRec) {
		var parts = s.split("_");

		if (parts.length == 1) {
			addSkillDescription(multRec[s], statNames.get(parts[0]) ?? parts[0], "")
		} else if (parts.length == 2 && partOnes.has(parts[1])) {
			addSkillDescription(multRec[s], statNames.get(parts[0]) ?? parts[0], partOnes.get(parts[1]) ?? "");
		} else if (parts.length == 3 && parts[0] == "hacknet") {
			addSkillDescription(multRec[s], parts[0], partOnes.get(parts[2]) ?? parts[2]);
		} /*else if (parts.length == 2 && parts[1] == "exp") {
			addSkillDescription(multRec[s], parts[0], "exp");
		} else if (parts.length == 2 && parts[1] == "money") {
			addSkillDescription(multRec[s], parts[0], "money");
		} else if (parts.length == 2 && parts[1] == "speed") {
			addSkillDescription(multRec[s], parts[0], "speed");
		} else if (parts.length == 2 && parts[1] == "chance") {
			addSkillDescription(multRec[s], parts[0], "chance");
		}*/ else {
			addSkillDescription(multRec[s], parts[0], s);
		}
	}

	return ret;
}


class AugmentationInformation {
	name: string;
	faction: string;
	basePrice: number;
	price: number;
	repRequired: number;
	repMet: boolean;
	prereqs: string[];
	prereqsMet: boolean;
	stats: Multipliers;

	constructor(ns: NS, name: string, faction: string, factionRep: number, ownedAugmentations: Set<string>) {
		this.name        = name;
		this.faction     = faction;
		this.basePrice   = ns.singularity.getAugmentationBasePrice(name),
		this.price       = ns.singularity.getAugmentationPrice(name),
		this.repRequired = ns.singularity.getAugmentationRepReq(name);
		this.repMet      = this.repRequired <= factionRep;
		this.prereqs     = ns.singularity.getAugmentationPrereq(name);
		this.prereqsMet  = this.prereqs.every(prereq => ownedAugmentations.has(prereq));
		this.stats       = ns.singularity.getAugmentationStats(name);
	}
}