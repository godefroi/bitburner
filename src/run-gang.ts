import { Gang, GangMemberAscension, GangMemberInfo, GangOtherInfo, NS } from "@ns";
import { COMBAT_SKILLS, CRIMES } from "@/_tools/enums";
import { FACTIONS, FACTION_NAMES } from "./_tools/faction";

// https://www.reddit.com/r/Bitburner/comments/e4z6ju/wip_crime_gang_bladeburner_guide/

const discountThresh  = 0.8;
const wantedPenThresh = 0.05;

const NEURORECEPTOR_MANAGEMENT_IMPLANT = "Neuroreceptor Management Implant";

enum GangTask {
	TrainCombat = "Train Combat",
	TerritoryWarfare = "Territory Warfare",
}

const GangMemberStatisticSets = [
	{stat: (mi: GangMemberInfo) => mi.str, mult: (mi: GangMemberInfo) => mi.str_asc_mult, ascGain: (ai: GangMemberAscension) => ai.str},
	{stat: (mi: GangMemberInfo) => mi.def, mult: (mi: GangMemberInfo) => mi.def_asc_mult, ascGain: (ai: GangMemberAscension) => ai.def},
	{stat: (mi: GangMemberInfo) => mi.dex, mult: (mi: GangMemberInfo) => mi.dex_asc_mult, ascGain: (ai: GangMemberAscension) => ai.dex},
	{stat: (mi: GangMemberInfo) => mi.agi, mult: (mi: GangMemberInfo) => mi.agi_asc_mult, ascGain: (ai: GangMemberAscension) => ai.agi}];

const ExcludedTasks = Object.freeze(["Territory Warfare", "Vigilante Justice", "Train Hacking", "Train Charisma", "Ethical Hacking"]);

interface TaskGainInformation {
	name: string,
	wantGain: number,
	respGain: number,
	moneyGain: number,
}

type TaskGainInformationCompareFunc = (a: TaskGainInformation, b: TaskGainInformation) => number;

export async function main(ns: NS) {
	// Array.from(CRIMES)
	// 	.map(c => ({
	// 		crime: c,
	// 		chance: ns.singularity.getCrimeChance(c),
	// 		stats: ns.singularity.getCrimeStats(c),
	// 	})).sort((a, b) => ((b.stats.karma / b.stats.time) * a.chance) - ((a.stats.karma / a.stats.time) * b.chance))
	// 	.forEach(c => {
	// 		const karmaPerHr = (c.stats.karma / c.stats.time) * 1000 * 60 * 60;
	// 		ns.tprint(`${c.crime} karma ${c.stats.karma} time ${c.stats.time} chance ${ns.formatPercent(c.chance)} karma/hr ${ns.formatNumber(karmaPerHr)} adj: ${ns.formatNumber(karmaPerHr * c.chance)}`);
	// 	});

	// below str 100, mug, then homicide?
	// karma target is -5.4e4 (-54000)

	if (!ns.gang.inGang()) {
		//await JoinGang(ns);
		throw new Error("Join a gang first, you're RAM poor!");
	}

	if (!ns.fileExists("Formulas.exe", "home")) {
		throw new Error("Buy Formulas.exe first!");
		// ns.singularity.purchaseTor();

		// if (!ns.singularity.purchaseProgram("Formulas.exe")) {
		// 	ns.tprint(`Unable to purchase Formulas.exe; exiting.`);
		// 	return;
		// }
	}

	let tickInfo: WarfareTickInfo = {
		previousInfo: undefined,
		nextTick: undefined,
		inWarfare: false,
	};

	while (true) {
		RecruitMembers(ns);

		ManageMemberAscension(ns);

		ManageMemberEquipment(ns);

		tickInfo = ManageTerritoryWarfare(ns, tickInfo);

		if (!tickInfo.inWarfare) {
			ManageMemberTasks(ns);
		}

		await ns.sleep(500);
	}
}


async function JoinGang(ns: NS): Promise<boolean> {
	// const snakes = FACTIONS.filter(f => f.name == FACTION_NAMES.SlumSnakes)[0];

	// let focus = !ns.singularity.getOwnedAugmentations(false).includes(NEURORECEPTOR_MANAGEMENT_IMPLANT);

	// if (ns.gang.inGang()) {
	// 	return true;
	// }

	// while (true) {
	// 	let player = ns.getPlayer();

	// 	if (player.factions.includes(FACTION_NAMES.SlumSnakes)) {
	// 		break;
	// 	}

	// 	if (ns.singularity.checkFactionInvitations().includes(FACTION_NAMES.SlumSnakes)) {
	// 		ns.singularity.joinFaction(FACTION_NAMES.SlumSnakes);
	// 		break;
	// 	}

	// 	// we haven't been invited to slum snakes; satisfy their requirements
	// 	while (player.skills.strength < snakes.combatStats
	// 		|| player.skills.defense < snakes.combatStats
	// 		|| player.skills.dexterity < snakes.combatStats
	// 		|| player.skills.agility < snakes.combatStats
	// 		|| player.money < snakes.cashOnHand
	// 		|| CurrentKarma(ns) < snakes.karma) {
	// 		await ns.sleep(ns.singularity.commitCrime(CRIMES.mug, focus));
	// 	}

	// 	if (ns.singularity.isFocused()) {
	// 		ns.singularity.setFocus(false);
	// 	}

	// 	await ns.sleep(1000);
	// }

	// if (ns.getPlayer().bitNodeN != 2) {
	// 	while (CurrentKarma(ns) > -5.4e4) {
	// 		const crime = ns.getPlayer().skills.strength >= 100 ? ns.enums.CrimeType.homicide : ns.enums.CrimeType.mug;
	// 		await ns.sleep(ns.singularity.commitCrime(crime, focus));

	// 		if (focus && !ns.singularity.isFocused()) {
	// 			focus = false;
	// 		}
	// 	}
	// }

	// if (!ns.gang.createGang("Slum Snakes")) {
	// 	throw new Error("Unable to create gang!");
	// }

	return true;
}


function RecruitMembers(ns: NS) {
	while (ns.gang.canRecruitMember()) {
		const memberName = "gang_member_" + (ns.gang.getMemberNames().length + 1).toString().padStart(2, "0");

		if (!ns.gang.recruitMember(memberName)) {
			break;
		}

		ns.tprint(`Gang member ${memberName} recruited`);
	}
}


function ManageMemberAscension(ns: NS) {
	const squadInfo = ns.gang.getMemberNames()
		.map(n => ({ member: ns.gang.getMemberInformation(n), ascensionInfo: ns.gang.getAscensionResult(n) }))
		.sort((a, b) => a.member.str_asc_mult > b.member.str_asc_mult ? 1 : -1);

	for (const {member, ascensionInfo} of squadInfo) {
		if (ascensionInfo === undefined) {
			continue; // if cannot ascend skip
		}

		const ganginfo = ns.gang.getGangInformation();

		ganginfo.respect -= ascensionInfo.respect // remove amount that would be lost from amount of respect the gang has

		if (1 - ns.formulas.gang.wantedPenalty(ganginfo) > wantedPenThresh) {
			continue; // skip if penalty after ascension is too high
		}

		if (AscendThresholdReached(member, ascensionInfo)) {
			if (ns.gang.ascendMember(member.name)) {
				//ns.tprint(`Gang Member: ${member.name} Ascended.`);
				break; // break on ascension to force 1 ascension per call
			}
		}
	}
}


function ManageMemberEquipment(ns: NS) {
	const currentDiscount = CurrentDiscount(ns);

	// only buy equipment if the current discount is good enough
	// if (currentDiscount <= 0.5) {
	// 	return;
	// }

	const allEquipment = ns.gang.getEquipmentNames()
		.map(n => {
			const stats = ns.gang.getEquipmentStats(n);
			return {
				name: n,
				str: stats.str ?? 0,
				def: stats.def ?? 0,
				dex: stats.dex ?? 0,
				agi: stats.agi ?? 0,
				cost: ns.gang.getEquipmentCost(n),
			};
		});
	const squadInfo = ns.gang.getMemberNames()
		.map(n => ns.gang.getMemberInformation(n))
		.sort((a, b) => a.str_asc_mult > b.str_asc_mult ? 1 : -1);

	for (const member of squadInfo) {
		allEquipment
			.filter(eq => !member.upgrades.includes(eq.name))
			.filter(eq => (eq.str > 0 || eq.def > 0 || eq.dex > 0 || eq.agi > 0) || currentDiscount > discountThresh)
			.sort((a, b) => b.agi - a.agi || b.dex - a.dex || b.def - a.def)
			.forEach(eq => {
				if (ns.getPlayer().money > eq.cost && ns.gang.purchaseEquipment(member.name, eq.name)) {
					//ns.tprint(`Gang member ${member.name} purchased equipment ${eq.name}`);
				}
			});
	}
}

interface WarfareTickInfo {
	previousInfo: GangOtherInfo | undefined;
	nextTick: number | undefined;
	inWarfare: boolean;
}

function ManageTerritoryWarfare(ns: NS, tickInfo: WarfareTickInfo): WarfareTickInfo{
	const gangInfo = ns.gang.getGangInformation();

	if (gangInfo.territory >= 1) {
		ns.gang.setTerritoryWarfare(false);
		tickInfo.inWarfare = false;
		return tickInfo;
	}

	const otherGangs = ns.gang.getOtherGangInformation();

	let newTick    = false;
	let allowClash = true;

	for (const gangName of Object.keys(otherGangs).filter(n => n != gangInfo.faction)) {
		if (ns.gang.getChanceToWinClash(gangName) < 0.55) {
//ns.tprint(`Chance to win clash with ${gangName}: ${ns.gang.getChanceToWinClash(gangName)}`);
			allowClash = false;
		}

		if (tickInfo.previousInfo && (otherGangs[gangName].power != tickInfo.previousInfo[gangName].power || otherGangs[gangName].territory != tickInfo.previousInfo[gangName].territory)) {
			newTick = true;
		}
	}

	if (newTick) {
//ns.tprint(`new tw tick`);
		tickInfo.nextTick = Date.now() + 19000;
	}

	if (tickInfo.nextTick != undefined && Date.now() + 500 > tickInfo.nextTick) {
//ns.tprint(`assigning to warfare; allowclash: ${allowClash}`);
		for (const memberName of ns.gang.getMemberNames()) {
			if (allowClash && ns.gang.getMemberInformation(memberName).def < 600) {
				// too weak, would die
				continue;
			}

			ns.gang.setMemberTask(memberName, GangTask.TerritoryWarfare);
//ns.tprint(`${memberName} -> warfare`);
			tickInfo.inWarfare = true;
		}
	} else {
		tickInfo.inWarfare = false;
	}

	tickInfo.previousInfo = otherGangs;

//ns.tprint(`warfare: ${allowClash && gangInfo.territory < 1}`);
	ns.gang.setTerritoryWarfare(allowClash && gangInfo.territory < 1);

	return tickInfo;
}


function ManageMemberTasks(ns: NS) {
	const targetValue = 125;
	const myGang      = ns.gang.getGangInformation();
	const validTasks  = ns.gang.getTaskNames()
		.filter(t => !ExcludedTasks.includes(t))
		.map(t => ns.gang.getTaskStats(t));

	for (const memberName of ns.gang.getMemberNames()) {
		const memberInfo = ns.gang.getMemberInformation(memberName);
		const statCheck  = GangMemberStatisticSets.some(set => set.stat(memberInfo) < targetValue * set.mult(memberInfo));

		if (statCheck && 1 - myGang.wantedPenalty < wantedPenThresh) {
			if (memberInfo.task != GangTask.TrainCombat) {
				ns.gang.setMemberTask(memberName, GangTask.TrainCombat);
				//ns.tprint(`member ${memberName} task ${GangTask.TrainCombat} (statcheck)`);
			}

			continue;
		}

		const sortFunc: TaskGainInformationCompareFunc = (myGang.respect >= 2e6 && 1 - myGang.wantedPenalty < wantedPenThresh) ? ((a, b) => a.moneyGain < b.moneyGain ? 1 : -1) : ((a, b) => a.respGain < b.respGain ? 1 : -1);

		const arrayTaskObjects = validTasks
			.map(taskStats => ({
				name:      taskStats.name,
				wantGain:  ns.formulas.gang.wantedLevelGain(myGang, memberInfo, taskStats),
				respGain:  ns.formulas.gang.respectGain(myGang, memberInfo, taskStats),
				moneyGain: ns.formulas.gang.moneyGain(myGang, memberInfo, taskStats)}))
			.sort(sortFunc);

		if (ns.gang.getBonusTime() > 5000 && (myGang.territoryClashChance === 0 || memberInfo.def > 600) && myGang.territory < 1) {
			ns.gang.setMemberTask(memberName, GangTask.TerritoryWarfare);
			//ns.tprint(`member ${memberName} task ${GangTask.TerritoryWarfare}`);
		} else {
			for (const x of arrayTaskObjects) {
				if (x.respGain < x.wantGain * 99) {
					continue;
				}

				if (memberInfo.task != x.name) {
					ns.gang.setMemberTask(memberName, x.name);
					//ns.tprint(`member ${memberName} task ${x.name} (job)`);
				}
				break;
			}
		}
	}
}


function AscendThresholdReached(member: GangMemberInfo, ascension: GangMemberAscension): boolean {
	function CalculateAscendTreshold(mult: number) {
		if (mult < 1.632) return 1.6326;
		if (mult < 2.336) return 1.4315;
		if (mult < 2.999) return 1.284;
		if (mult < 3.363) return 1.2125;
		if (mult < 4.253) return 1.1698;
		if (mult < 4.860) return 1.1428;
		if (mult < 5.455) return 1.1225;
		if (mult < 5.977) return 1.0957;
		if (mult < 6.496) return 1.0869;
		if (mult < 7.008) return 1.0789;
		if (mult < 7.519) return 1.073;
		if (mult < 8.025) return 1.0673;
		if (mult < 8.513) return 1.0631;
		if (mult < 20) return 1.0591;
		return 1.04;
	}

	return GangMemberStatisticSets.some(set => set.ascGain(ascension) > CalculateAscendTreshold(set.mult(member)));
}


// @ts-ignore
const CurrentKarma = (ns: NS): number => ns.heart.break();
const CurrentDiscount = (ns: NS) => ns.gang.getEquipmentCost("Baseball Bat") / 1e6;
