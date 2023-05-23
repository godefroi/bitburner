import { NS, type SleeveClassTask, SleevePerson, type SleeveTask, type FactionWorkType, Person, CrimeStats, SleeveCrimeTask, type CrimeType } from "@ns";
import { DaemonCommand, Execute } from "@/_tools/daemon";
import { CRIMES, UNIVERSITIES } from "@/_tools/enums";
import { SLEEVES_PORT } from "@/_tools/ports";
import { FACTIONS } from "@/_tools/faction";
import { CurrentKarma } from "@/_tools/tools";


interface DaemonState {
	mode: SleeveMode,
	sleeves: SleeveState[],
}


class SleeveState {
	index: number;
	sleeve: SleevePerson;
	task: SleeveTask | null;

	constructor(ns: NS, sleeveNumber: number) {
		this.index  = sleeveNumber;
		this.sleeve = ns.sleeve.getSleeve(this.index);
		this.task   = ns.sleeve.getTask(this.index);
	}

	refresh(ns: NS) {
		this.sleeve = ns.sleeve.getSleeve(this.index);
		this.task   = ns.sleeve.getTask(this.index);
	}

	setToShockRecovery(ns: NS) {
		if (this.task?.type != "RECOVERY") {
			ns.sleeve.setToShockRecovery(this.index);
			this.refresh(ns);
		}
	}

	setToCrime(ns: NS, crimeType: CrimeType | `${CrimeType}`) {
		if (this.task?.type != "CRIME") {
			ns.sleeve.setToCommitCrime(this.index, crimeType);
			this.refresh(ns);
		} else {
			const crimeTask = this.task as SleeveCrimeTask;
	
			if (crimeTask.crimeType != crimeType) {
				ns.sleeve.setToCommitCrime(this.index, crimeType);
				this.refresh(ns);
			}
		}
	}
}


enum SleeveMode {
	None,
	Crime,
	UniHacking,
	Factions,
}


enum SleeveTaskType {
	Class = "CLASS"
}


export async function main(ns: NS) {
	ns.disableLog("ALL");

	const daemonCommands: DaemonCommand<{}, DaemonState>[] = [
		{
			command: "update",
			helpText: "Updates sleeve info in case manual changes were made",
			handler: async (ns, args, flags, state) => {
				state.sleeves = [...Array(ns.sleeve.getNumSleeves()).keys()].map(idx => new SleeveState(ns, idx));
			},
		},
		{
			command: "unihacking",
			helpText: "Instructs all sleeves to study hacking at a university.",
			handler: async (ns, args, flags, state) => {
				state.mode = SleeveMode.UniHacking;
			},
		},
		{
			command: "buyaugs",
			helpText: "Instructs all sleeves to purchase all availble augmentations",
			handler: async (ns, args, flags, state) => {
				[...Array(ns.sleeve.getNumSleeves()).keys()]
					.flatMap(sleeveNumber => ns.sleeve.getSleevePurchasableAugs(sleeveNumber)
						.map(({cost, name}) => ({ sleeveNumber, cost, name })))
					.sort((a, b) => a.cost - b.cost)
					.forEach(o => {if (o.cost < ns.getPlayer().money / 100) { ns.sleeve.purchaseSleeveAug(o.sleeveNumber, o.name); }});
			},
		},
		{
			command: "factions",
			helpText: "Instructs sleeves to work for factions that provide useful augmentations",
			handler: async (ns, args, flags, state) => {
				state.mode = SleeveMode.Factions;
			},
		},
	];

	await Execute(ns, SLEEVES_PORT, InitializeState, RunDaemon, daemonCommands, {});
}


function InitializeState(ns: NS): DaemonState {
	return {
		mode: SleeveMode.None,
		sleeves: [...Array(ns.sleeve.getNumSleeves()).keys()].map(idx => new SleeveState(ns, idx)),
	};
}


async function RunDaemon(ns: NS, state: DaemonState): Promise<number> {
	switch (state.mode) {
		case SleeveMode.None:       return RunNone(ns, state);
		case SleeveMode.Crime:      return RunCrime(ns, state);
		case SleeveMode.UniHacking: return RunUniversity(ns, state);
		case SleeveMode.Factions:   return RunFactions(ns, state);
	}

	return 1000;
}


async function RunNone(ns: NS, state: DaemonState): Promise<number> {
	const karma  = CurrentKarma(ns);
	const player = ns.getPlayer();

	for (const sleeve of state.sleeves) {
		// refresh this sleeve's state
		sleeve.refresh(ns);

		if (sleeve.sleeve.shock > 50) {
			sleeve.setToShockRecovery(ns);
		} else if (/*karma > -5.4e4 &&*/ ns.formulas.work.crimeSuccessChance(sleeve.sleeve, "Homicide") < 0.5) {
			sleeve.setToCrime(ns, "Mug");
		} else if (/*karma > -5.4e4 &&*/ ns.formulas.work.crimeSuccessChance(sleeve.sleeve, "Homicide") > 0.5) {
			sleeve.setToCrime(ns, "Homicide");
		}
	}

	return 5000;
}


async function RunCrime(ns: NS, state: DaemonState): Promise<number> {
	for (const sleeve of state.sleeves) {
		// refresh this sleeve's state
		sleeve.refresh(ns);

		// calculate the ideal crime to be running
		const bestCrime = CalculateBestCrime(ns, sleeve.sleeve);

		if (bestCrime == undefined) {
			continue;
		}

		sleeve.setToCrime(ns, bestCrime);
	}

	return 2500;
}


async function RunUniversity(ns: NS, state: DaemonState): Promise<number> {
	const course = (() => {
		switch (state.mode) {
			case SleeveMode.UniHacking: return "Algorithms";
			default: return "NOT A COURSE";
		}
	})();

	for (const sleeve of state.sleeves) {
		// if the sleeve isn't in the right city, travel there
		if (sleeve.sleeve.city != UNIVERSITIES[0].city) {
			ns.sleeve.travel(sleeve.index, UNIVERSITIES[0].city);
		}
		
		// if the sleeve doesn't have a task or the task isn't university, fix that
		if (sleeve.task == null || sleeve.task.type != SleeveTaskType.Class) {
			ns.sleeve.setToUniversityCourse(sleeve.index, UNIVERSITIES[0].university, course);
			sleeve.refresh(ns);
		}

		const classTask = sleeve.task as SleeveClassTask;

		// if the course is incorrect, set it to the right course
		if (classTask.classType != course) {
			ns.sleeve.setToUniversityCourse(sleeve.index, UNIVERSITIES[0].university, course);
			sleeve.refresh(ns);
		}
		
		// SleeveBladeburnerTask
		// SleeveClassTask
		// SleeveCompanyTask
		// SleeveCrimeTask
		// SleeveFactionTask
		// SleeveInfiltrateTask
		// SleeveRecoveryTask
		// SleeveSupportTask
		// SleeveSynchroTask;
	}

	return 1000;
}


async function RunGym(ns: NS, state: DaemonState): Promise<number> {

	return 1000;
}


async function RunFactions(ns: NS, state: DaemonState): Promise<number> {
	// make a list of factions that have augs we don't have
	// order by ... something... probably by whether they have a unique aug, and maybe favor?
	const player          = ns.getPlayer();
	const ownedAugs       = new Set(ns.singularity.getOwnedAugmentations(true));
	const factionReps     = new Map(player.factions.map(f => [f, ns.singularity.getFactionRep(f)]));
	const factionAugs     = new Map(player.factions.map(f => [f, ns.singularity.getAugmentationsFromFaction(f).map(a => ({augment: a, purchasable: (factionReps.get(f) ?? 0) >= ns.singularity.getAugmentationRepReq(a), owned: ownedAugs.has(a)}))]));
	const purchasableAugs = new Set(Array.from(factionAugs.values()).flatMap(a => a).filter(a => a.purchasable).map(a => a.augment));
	const needFactions    = player.factions
		.map(f => ({faction: f, pendingAugments: (factionAugs.get(f) ?? []).filter(a => !a.owned && !a.purchasable)}))
		.filter(f => f.pendingAugments.length > 0);

	// reassign sleeves to something else so we don't conflict


	// assign sleeves to them
	for (let i = 0; i < state.sleeves.length && i < needFactions.length; i++) {
		const sleeve = ns.sleeve.getSleeve(i);
		const gains  = (["hacking", "field", "security"] as ("hacking" | "field" | "security")[])
			.map(workType => ({workType, gains: ns.formulas.work.factionGains(sleeve, workType, ns.singularity.getFactionFavor(needFactions[i].faction))}))
			.sort((a, b) => b.gains.reputation - a.gains.reputation);

		ns.sleeve.setToFactionWork(i, needFactions[i].faction, gains[0].workType);
	}

	return 10000;
}


async function RunCorpWork(ns: NS, state: DaemonState): Promise<number> {
	//FACTIONS.
	return 1000;
}


//const applyForPromotions = (ns: NS) => ns.getPlayer().jobs.forEach(j => ns.singularity.applyToCompany(j, "software"))
	// 	let player = ns.getPlayer();

// 	for (const key in player.jobs) {
// 		const val = player.jobs[key];
// 		ns.tprint(`key: ${key} val: ${val}`);

// 		ns.singularity.applyToCompany(key, "software");
// 	}

//}

export function CalculateBestCrime(ns: NS, person: Person) {
	const calculateCrimeSuccessChance = (stats: CrimeStats) => Math.min(
		((stats.hacking_success_weight * person.skills.hacking) +
		(stats.strength_success_weight * person.skills.strength) +
		(stats.defense_success_weight * person.skills.defense) +
		(stats.dexterity_success_weight * person.skills.dexterity) +
		(stats.agility_success_weight * person.skills.agility) +
		(stats.charisma_success_weight * person.skills.charisma)) / 975 / stats.difficulty
		, 1);

	let bestCrime = undefined;
	let bestMps   = 0;
	let bestKps   = 0;
	let bestIps   = 0;

	for (const crime of CRIMES) {
		const crimeStats = ns.singularity.getCrimeStats(crime);
		const chance     = calculateCrimeSuccessChance(crimeStats)
		const mps        = crimeStats.money / crimeStats.time * chance;
		const kps        = crimeStats.karma / crimeStats.time * chance;
		const ips        = crimeStats.intelligence_exp / crimeStats.time * chance;

		if (bestMps == 0 || (mps > bestMps && chance > 0.25)) {
		//if (bestKps == 0 || (kps > bestKps/* && chance > 0.25*/)) {
		//if (bestIps == 0 || (ips > bestIps/* && chance > 0.25*/)) {
			bestCrime = crime;
			bestMps   = mps;
			bestKps   = kps;
			bestIps   = ips;
		}
	}

	return bestCrime;
}


