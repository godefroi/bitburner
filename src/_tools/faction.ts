import { type CityName, NS } from "@ns";
import { CITIES } from "@/_tools/enums";

export interface Faction {
	readonly name: string
	readonly type: FactionType,
	readonly excludes: readonly string[],
	readonly corpCity: (CityName | undefined),
	readonly backdoorServer: (string | undefined),
	readonly hackingLevel: number,
	readonly cashOnHand: number,
	//readonly requirements: readonly Requirement[],
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

export const FACTION_NAMES = {
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
};

interface FactionOptions {
	name: string,
	type: FactionType,
	excludes?: string[],
	corpCity?: CityName | undefined,
	backdoorServer?: string | undefined,
	hackingLevel?: number,
	cashOnHand?: number
}

function CreateFaction({name, type, excludes = [], corpCity = undefined, backdoorServer = undefined, hackingLevel = 0, cashOnHand = 0}: FactionOptions): Faction {
	return {
		name,
		type,
		excludes,
		corpCity,
		backdoorServer,
		hackingLevel,
		cashOnHand
	};
}

export const FACTIONS: Faction[] = [
	CreateFaction({ name: FACTION_NAMES.CyberSec,          type: FactionType.EarlyGame, backdoorServer: "CSEC" }),
	CreateFaction({ name: FACTION_NAMES.TianDiHui,         type: FactionType.EarlyGame, hackingLevel: 50, cashOnHand: 1e6 }),
	CreateFaction({ name: FACTION_NAMES.Netburners,        type: FactionType.EarlyGame, hackingLevel: 80 }),
	CreateFaction({ name: FACTION_NAMES.ShadowsOfAnarchy,  type: FactionType.EarlyGame }),

	CreateFaction({ name: FACTION_NAMES.Sector12,  type: FactionType.City, cashOnHand: 1.5e7, excludes: [FACTION_NAMES.Chongqing, FACTION_NAMES.NewTokyo, FACTION_NAMES.Ishima, FACTION_NAMES.Volhaven]                      }),
	CreateFaction({ name: FACTION_NAMES.Chongqing, type: FactionType.City, cashOnHand: 2e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Volhaven]                                                }),
	CreateFaction({ name: FACTION_NAMES.NewTokyo,  type: FactionType.City, cashOnHand: 2e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Volhaven]                                                }),
	CreateFaction({ name: FACTION_NAMES.Ishima,    type: FactionType.City, cashOnHand: 3e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Volhaven]                                                }),
	CreateFaction({ name: FACTION_NAMES.Aevum,     type: FactionType.City, cashOnHand: 4e7,   excludes: [FACTION_NAMES.Chongqing, FACTION_NAMES.NewTokyo, FACTION_NAMES.Ishima, FACTION_NAMES.Volhaven]                      }),
	CreateFaction({ name: FACTION_NAMES.Volhaven,  type: FactionType.City, cashOnHand: 5e7,   excludes: [FACTION_NAMES.Sector12, FACTION_NAMES.Aevum, FACTION_NAMES.Chongqing, FACTION_NAMES.NewTokyo, FACTION_NAMES.Ishima] }),

	CreateFaction({ name: FACTION_NAMES.NiteSec,      type: FactionType.HackingGroup, backdoorServer: "avmnite-02h" }),
	CreateFaction({ name: FACTION_NAMES.TheBlackHand, type: FactionType.HackingGroup, backdoorServer: "I.I.I.I" }),
	CreateFaction({ name: FACTION_NAMES.BitRunners,   type: FactionType.HackingGroup, backdoorServer: "run4theh111z" }),

	CreateFaction({ name: FACTION_NAMES.ECorp,                     type: FactionType.Megacorporation, corpCity: CITIES.Aevum     }),
	CreateFaction({ name: FACTION_NAMES.MegaCorp,                  type: FactionType.Megacorporation, corpCity: CITIES.Sector12  }),
	CreateFaction({ name: FACTION_NAMES.KuaiGongInternational,     type: FactionType.Megacorporation, corpCity: CITIES.Chongqing }),
	CreateFaction({ name: FACTION_NAMES.FourSigma,                 type: FactionType.Megacorporation, corpCity: CITIES.Sector12  }),
	CreateFaction({ name: FACTION_NAMES.NWO,                       type: FactionType.Megacorporation, corpCity: CITIES.Volhaven  }),
	CreateFaction({ name: FACTION_NAMES.BladeIndustries,           type: FactionType.Megacorporation, corpCity: CITIES.Sector12  }),
	CreateFaction({ name: FACTION_NAMES.OmniTekIncorporated,       type: FactionType.Megacorporation, corpCity: CITIES.Volhaven  }),
	CreateFaction({ name: FACTION_NAMES.BachmanAssociates,         type: FactionType.Megacorporation, corpCity: CITIES.Aevum     }),
	CreateFaction({ name: FACTION_NAMES.ClarkeIncorporated,        type: FactionType.Megacorporation, corpCity: CITIES.Aevum     }),
	CreateFaction({ name: FACTION_NAMES.FulcrumSecretTechnologies, type: FactionType.Megacorporation, corpCity: CITIES.Aevum, backdoorServer: "fulcrumassets" }),

	CreateFaction({ name: FACTION_NAMES.SlumSnakes,         type: FactionType.Criminal, cashOnHand: 1e6 }),
	CreateFaction({ name: FACTION_NAMES.Tetrads,            type: FactionType.Criminal }),
	CreateFaction({ name: FACTION_NAMES.Silhouette,         type: FactionType.Criminal, cashOnHand: 1.5e7 }),
	CreateFaction({ name: FACTION_NAMES.SpeakersForTheDead, type: FactionType.Criminal }),
	CreateFaction({ name: FACTION_NAMES.TheDarkArmy,        type: FactionType.Criminal }),
	CreateFaction({ name: FACTION_NAMES.TheSyndicate,       type: FactionType.Criminal, cashOnHand: 1e7 }),

	CreateFaction({ name: FACTION_NAMES.TheCovenant,  type: FactionType.Midgame }),
	CreateFaction({ name: FACTION_NAMES.Daedalus,     type: FactionType.Midgame }),
	CreateFaction({ name: FACTION_NAMES.Illuminati,   type: FactionType.Midgame }),

	CreateFaction({ name: FACTION_NAMES.Bladeburners,          type: FactionType.Endgame }),
	CreateFaction({ name: FACTION_NAMES.ChurchOfTheMachineGod, type: FactionType.Endgame }),
];
