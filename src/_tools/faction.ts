import { type CityName, NS } from "@ns";
import { CITIES } from "@/_tools/enums";

interface FactionOptions {
	name: string,
	type: FactionType,
	excludes?: string[],
	city?: CityName | undefined,
	backdoorServer?: string | undefined,
	hackingLevel?: number,
	cashOnHand?: number,
	peopleKilled?: number,
	karma?: number,
	hacknetLevels?: number,
	hacknetRam?: number,
	hacknetCores?: number,
	infiltration?: boolean,
	combatStats?: number,
	corpExec?: boolean,
	notGovJob?: boolean,
	augmentations?: number,
	hackLevelOrCombat?: boolean,
}


export class Faction {
	name:              string;
	type:              FactionType;
	excludes:          readonly string[];
	city:              (CityName | undefined);
	backdoorServer:    (string | undefined);
	hackingLevel:      number;
	cashOnHand:        number;
	peopleKilled:      number;
	karma:             number;
	hacknetLevels:     number;
	hacknetRam:        number;
	hacknetCores:      number;
	infiltration:      boolean;
	combatStats:       number;
	corpExec:          boolean;
	notGovJob:         boolean;
	augmentations:     number;
	hackLevelOrCombat: boolean;

	constructor(opts: FactionOptions) {
		this.name              = opts.name;
		this.type              = opts.type;
		this.excludes          = opts.excludes ?? [];
		this.city              = opts.city;
		this.backdoorServer    = opts.backdoorServer;
		this.hackingLevel      = opts.hackingLevel ?? 0;
		this.cashOnHand        = opts.cashOnHand ?? 0;
		this.peopleKilled      = opts.peopleKilled ?? 0;
		this.karma             = opts.karma ?? 0;
		this.hacknetLevels     = opts.hacknetLevels ?? 0;
		this.hacknetRam        = opts.hacknetRam ?? 0;
		this.hacknetCores      = opts.hacknetCores ?? 0;
		this.infiltration      = opts.infiltration ?? false;
		this.combatStats       = opts.combatStats ?? 0;
		this.corpExec          = opts.corpExec ?? false;
		this.notGovJob         = opts.notGovJob ?? false;
		this.augmentations     = opts.augmentations ?? 0;
		this.hackLevelOrCombat = opts.hackLevelOrCombat ?? false;
	}
}

export enum FactionType {
	EarlyGame,
	City,
	HackingGroup,
	Megacorporation,
	Criminal,
	Midgame,
	Endgame
}

export const FACTION_NAMES = Object.freeze({
	CyberSec: "CyberSec",
	NiteSec: "NiteSec",
	TheBlackHand: "The Black Hand",
	BitRunners: "BitRunners",
	Daedalus: "Daedalus",
	TianDiHui: "Tian Di Hui",
	Netburners: "Netburners",
	SlumSnakes: "Slum Snakes",
	Tetrads: "Tetrads",
	Sector12: "Sector-12",
	Aevum: "Aevum",
	Volhaven: "Volhaven",
	Chongqing: "Chongqing",
	Ishima: "Ishima",
	NewTokyo: "New Tokyo",
	Illuminati: "Illuminati",
	TheCovenant: "The Covenant",
	ECorp: "ECorp",
	MegaCorp: "MegaCorp",
	BachmanAssociates: "Bachman & Associates",
	BladeIndustries: "Blade Industries",
	NWO: "NWO",
	ClarkeIncorporated: "Clarke Incorporated",
	OmniTekIncorporated: "OmniTek Incorporated",
	FourSigma: "Four Sigma",
	KuaiGongInternational: "KuaiGong International",
	FulcrumSecretTechnologies: "Fulcrum Secret Technologies",
	SpeakersForTheDead: "Speakers for the Dead",
	TheDarkArmy: "The Dark Army",
	TheSyndicate: "The Syndicate",
	Silhouette: "Silhouette",
	Bladeburners: "Bladeburners",
	ChurchOfTheMachineGod: "Church of the Machine God",
	ShadowsOfAnarchy: "Shadows of Anarchy"
});

export const FACTIONS: Faction[] = [
	new Faction({ name: FACTION_NAMES.CyberSec,          type: FactionType.EarlyGame, backdoorServer: "CSEC" }),
	new Faction({ name: FACTION_NAMES.TianDiHui,         type: FactionType.EarlyGame, cashOnHand: 1e6, hackingLevel: 50, city: CITIES.Chongqing }), // (or NT or Ishima)
	new Faction({ name: FACTION_NAMES.Netburners,        type: FactionType.EarlyGame, hackingLevel: 80, hacknetLevels: 100, hacknetRam: 8, hacknetCores: 4 }),
	new Faction({ name: FACTION_NAMES.ShadowsOfAnarchy,  type: FactionType.EarlyGame, infiltration: true }),

	new Faction({ name: FACTION_NAMES.Sector12,  type: FactionType.City, city: CITIES.Sector12,  cashOnHand: 1.5e7, excludes: [FACTION_NAMES.Chongqing, FACTION_NAMES.NewTokyo, FACTION_NAMES.Ishima, FACTION_NAMES.Volhaven]                      }),
	new Faction({ name: FACTION_NAMES.Chongqing, type: FactionType.City, city: CITIES.Chongqing, cashOnHand: 2e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Volhaven]                                                }),
	new Faction({ name: FACTION_NAMES.NewTokyo,  type: FactionType.City, city: CITIES.NewTokyo,  cashOnHand: 2e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Volhaven]                                                }),
	new Faction({ name: FACTION_NAMES.Ishima,    type: FactionType.City, city: CITIES.Ishima,    cashOnHand: 3e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Volhaven]                                                }),
	new Faction({ name: FACTION_NAMES.Aevum,     type: FactionType.City, city: CITIES.Aevum,     cashOnHand: 4e7,   excludes: [FACTION_NAMES.Chongqing, FACTION_NAMES.NewTokyo, FACTION_NAMES.Ishima, FACTION_NAMES.Volhaven]                      }),
	new Faction({ name: FACTION_NAMES.Volhaven,  type: FactionType.City, city: CITIES.Volhaven,  cashOnHand: 5e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Chongqing, FACTION_NAMES.NewTokyo, FACTION_NAMES.Ishima] }),

	new Faction({ name: FACTION_NAMES.NiteSec,      type: FactionType.HackingGroup, backdoorServer: "avmnite-02h" }),
	new Faction({ name: FACTION_NAMES.TheBlackHand, type: FactionType.HackingGroup, backdoorServer: "I.I.I.I" }),
	new Faction({ name: FACTION_NAMES.BitRunners,   type: FactionType.HackingGroup, backdoorServer: "run4theh111z" }),

	new Faction({ name: FACTION_NAMES.ECorp,                     type: FactionType.Megacorporation, city: CITIES.Aevum     }),
	new Faction({ name: FACTION_NAMES.MegaCorp,                  type: FactionType.Megacorporation, city: CITIES.Sector12  }),
	new Faction({ name: FACTION_NAMES.KuaiGongInternational,     type: FactionType.Megacorporation, city: CITIES.Chongqing }),
	new Faction({ name: FACTION_NAMES.FourSigma,                 type: FactionType.Megacorporation, city: CITIES.Sector12  }),
	new Faction({ name: FACTION_NAMES.NWO,                       type: FactionType.Megacorporation, city: CITIES.Volhaven  }),
	new Faction({ name: FACTION_NAMES.BladeIndustries,           type: FactionType.Megacorporation, city: CITIES.Sector12  }),
	new Faction({ name: FACTION_NAMES.OmniTekIncorporated,       type: FactionType.Megacorporation, city: CITIES.Volhaven  }),
	new Faction({ name: FACTION_NAMES.BachmanAssociates,         type: FactionType.Megacorporation, city: CITIES.Aevum     }),
	new Faction({ name: FACTION_NAMES.ClarkeIncorporated,        type: FactionType.Megacorporation, city: CITIES.Aevum     }),
	new Faction({ name: FACTION_NAMES.FulcrumSecretTechnologies, type: FactionType.Megacorporation, city: CITIES.Aevum, backdoorServer: "fulcrumassets" }),

	new Faction({ name: FACTION_NAMES.SlumSnakes,         type: FactionType.Criminal, combatStats: 30, karma: -9, cashOnHand: 1e6, }),
	new Faction({ name: FACTION_NAMES.Tetrads,            type: FactionType.Criminal, combatStats: 75, karma: -18, city: CITIES.Chongqing }), // (or NT or Ishima)
	new Faction({ name: FACTION_NAMES.Silhouette,         type: FactionType.Criminal, corpExec: true, karma: -22, cashOnHand: 1.5e7 }),
	new Faction({ name: FACTION_NAMES.SpeakersForTheDead, type: FactionType.Criminal, karma: -45, peopleKilled: 30, hackingLevel: 100, combatStats: 300, notGovJob: true }),
	new Faction({ name: FACTION_NAMES.TheDarkArmy,        type: FactionType.Criminal, karma: -45, peopleKilled: 5, hackingLevel: 300, combatStats: 300, notGovJob: true, city: CITIES.Chongqing }),
	new Faction({ name: FACTION_NAMES.TheSyndicate,       type: FactionType.Criminal, karma: -90, cashOnHand: 1e7, hackingLevel: 200, combatStats: 200, notGovJob: true, city: CITIES.Aevum }), // or Sector-12

	new Faction({ name: FACTION_NAMES.TheCovenant,  type: FactionType.Midgame, augmentations: 20, cashOnHand: 7.5e9,  hackingLevel: 850, combatStats: 850 }),
	new Faction({ name: FACTION_NAMES.Daedalus,     type: FactionType.Midgame, augmentations: 30, cashOnHand: 1e10,   hackingLevel: 2500, combatStats: 1500, hackLevelOrCombat: true }),
	new Faction({ name: FACTION_NAMES.Illuminati,   type: FactionType.Midgame, augmentations: 30, cashOnHand: 1.5e10, hackingLevel: 1500, combatStats: 1200 }),

	new Faction({ name: FACTION_NAMES.Bladeburners,          type: FactionType.Endgame }),
	new Faction({ name: FACTION_NAMES.ChurchOfTheMachineGod, type: FactionType.Endgame }),
];
