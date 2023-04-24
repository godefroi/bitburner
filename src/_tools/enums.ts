import { NS, type CityName, type CrimeType } from "@ns";

export const CITIES = Object.freeze({
	"Aevum":     "Aevum"      as CityName,
	"Chongqing": "Chongqing"  as CityName,
	"Sector12":  "Sector-12"  as CityName,
	"NewTokyo":  "New Tokyo"  as CityName,
	"Ishima":    "Ishima"     as CityName,
	"Volhaven":  "Volhaven"   as CityName,

	length: 6,

	[Symbol.iterator]: function*() {
		yield CITIES.Aevum;
		yield CITIES.Chongqing;
		yield CITIES.Sector12;
		yield CITIES.NewTokyo;
		yield CITIES.Ishima;
		yield CITIES.Volhaven;
	}
});


export const CRIMES = Object.freeze({
	shoplift:       "Shoplift"         as CrimeType,
	robStore:       "Rob Store"        as CrimeType,
	mug:            "Mug"              as CrimeType,
	larceny:        "Larceny"          as CrimeType,
	dealDrugs:      "Deal Drugs"       as CrimeType,
	bondForgery:    "Bond Forgery"     as CrimeType,
	traffickArms:   "Traffick Arms"    as CrimeType,
	homicide:       "Homicide"         as CrimeType,
	grandTheftAuto: "Grand Theft Auto" as CrimeType,
	kidnap:         "Kidnap"           as CrimeType,
	assassination:  "Assassination"    as CrimeType,
	heist:          "Heist"            as CrimeType,

	length: 12,

	[Symbol.iterator]: function*() {
		yield CRIMES.shoplift;
		yield CRIMES.robStore;
		yield CRIMES.mug;
		yield CRIMES.larceny;
		yield CRIMES.dealDrugs;
		yield CRIMES.bondForgery;
		yield CRIMES.traffickArms;
		yield CRIMES.homicide;
		yield CRIMES.grandTheftAuto;
		yield CRIMES.kidnap;
		yield CRIMES.assassination;
		yield CRIMES.heist;
	}
});


/** Universities, in order of "bestness" */
export const UNIVERSITIES = Object.freeze([
	{ city: CITIES.Volhaven, university: "Rothman University"         },
	{ city: CITIES.Aevum,    university: "Summit University"          },
	{ city: CITIES.Sector12, university: "ZB Institute of Technology" },
]);


/** Gyms, in order of "bestness" */
export const GYMS = Object.freeze([
	{ city: CITIES.Aevum,    gym: "Snap Fitness Gym"      },
	{ city: CITIES.Volhaven, gym: "Millenium Fitness Gym" },
	{ city: CITIES.Sector12, gym: "Powerhouse Gym"        },
]);


/** Combat skills */
export const COMBAT_SKILLS = Object.freeze([
	{ stat: "Strength",  currentLevel: (ns: NS) => ns.getPlayer().skills.strength  },
	{ stat: "Agility",   currentLevel: (ns: NS) => ns.getPlayer().skills.agility   },
	{ stat: "Defense",   currentLevel: (ns: NS) => ns.getPlayer().skills.defense   },
	{ stat: "Dexterity", currentLevel: (ns: NS) => ns.getPlayer().skills.dexterity },
]);
