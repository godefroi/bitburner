import { NS, type CityName } from "@ns";

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


/** Universities, in order of "bestness" */
export const UNIVERSITIES = [
	{ city: CITIES.Volhaven, university: "Rothman University"         },
	{ city: CITIES.Aevum,    university: "Summit University"          },
	{ city: CITIES.Sector12, university: "ZB Institute of Technology" },
];


/** Gyms, in order of "bestness" */
export const GYMS = [
	{ city: CITIES.Aevum,    gym: "Snap Fitness Gym"      },
	{ city: CITIES.Volhaven, gym: "Millenium Fitness Gym" },
	{ city: CITIES.Sector12, gym: "Powerhouse Gym"        },
];


/** Combat skills */
export const COMBAT_SKILLS = [
	{ stat: "Strength",  currentLevel: (ns: NS) => ns.getPlayer().skills.strength  },
	{ stat: "Agility",   currentLevel: (ns: NS) => ns.getPlayer().skills.agility   },
	{ stat: "Defense",   currentLevel: (ns: NS) => ns.getPlayer().skills.defense   },
	{ stat: "Dexterity", currentLevel: (ns: NS) => ns.getPlayer().skills.dexterity },
];
