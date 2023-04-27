import { NS, CorpIndustryName, type CityName, Product, Division } from "@ns";
import { CITIES } from "@/_tools/enums";

const PRODUCED_MATERIALS = {
	"Agriculture":       [ "Plants", "Food" ],
	"Chemical":          [ "Chemicals" ],
	"Computer Hardware": [ "Hardware" ],
	"Energy":            [ "Energy" ],
	"Fishing":           [ "Food" ],
	"Food":              [],
	"Healthcare":        [],
	"Mining":            [ "Metal" ],
	"Pharmaceutical":    [ "Drugs" ],
	"Real Estate":       [ "RealEstate" ],
	"Robotics":          [ "Robots" ],
	"Software":          [ "AICores" ],
	"Tobacco":           [],
	"Water Utilities":   [ "Water" ],
};

const USED_MATERIALS = {
	"Agriculture":       ["Water", "Energy"],
	"Chemical":          [ /* ? */ ],
	"Computer Hardware": [ /* ? */ ],
	"Energy":            [ /* ? */ ],
	"Fishing":           [ /* ? */ ],
	"Food":              [ /* ? */ ],
	"Healthcare":        [ /* ? */ ],
	"Mining":            [ /* ? */ ],
	"Pharmaceutical":    [ /* ? */ ],
	"Real Estate":       [ /* ? */ ],
	"Robotics":          [ /* ? */ ],
	"Software":          [ /* ? */ ],
	"Tobacco":           [ /*"Plants", "Food"*/ ], // maybe?
	"Water Utilities":   [ /* ? */ ],
};

enum EmployeeJob {
	"Operations"  = "Operations",
	"Engineer"    = "Engineer",
	"Business"    = "Business",
	"Management"  = "Management",
	"ResearchDev" = "Research & Development",
	"Training"    = "Training",
	"Unassigned"  = "Unassigned",
}

class CorpProduct {
	name: string;
	product: Product;
	version: number;

	constructor(ns: NS, divisionName: string, productName: string) {
		this.name    = productName;
		this.product = ns.corporation.getProduct(divisionName, productName);
		this.version = parseInt(/\d+$/.exec(productName)?.[0] ?? "0");
	}
}

const CORPNAME = "Corp";
const AGRICULTURE: CorpIndustryName = "Agriculture";
const TOBACCO: CorpIndustryName = "Tobacco";

const HI_TECH_LABORATORY = "Hi-Tech R&D Laboratory";
const MARKET_TA_I        = "Market-TA.I";
const MARKET_TA_II       = "Market-TA.II";

export async function main(ns: NS) {
	ns.disableLog("sleep");

	// ensure the corporation exists
	if (!ns.corporation.hasCorporation()) {
		if (!ns.corporation.createCorporation(CORPNAME, true)) {
			ns.tprint("Unable to create corporation.");
			return;
		}

		ns.tprint("Corporation started.");
	}

	// ensure we've purchased Smart Supply
	if (!ns.corporation.hasUnlockUpgrade("Smart Supply")) {
		ns.corporation.unlockUpgrade("Smart Supply");
		ns.tprint("Smart Supply purchased.");
	}

	await EstablishAgricultureDivision(ns);
	ns.tprint("Agriculture division established and complete.");

	// here begins the tobacco journey
	await ExpandDivision(ns, TOBACCO, 1);
// 3.08e12

	for (const city of ns.corporation.getDivision(TOBACCO).cities) {
		await EnsureEmployees(ns, TOBACCO, city, EmployeeJob.Operations,  2);
		await EnsureEmployees(ns, TOBACCO, city, EmployeeJob.Engineer,    2);
		await EnsureEmployees(ns, TOBACCO, city, EmployeeJob.Business,    1);
		await EnsureEmployees(ns, TOBACCO, city, EmployeeJob.Management,  2);
		await EnsureEmployees(ns, TOBACCO, city, EmployeeJob.ResearchDev, 2);
	}

	await EnsureEmployees(ns, TOBACCO, CITIES.Aevum, EmployeeJob.Operations,  6);
	await EnsureEmployees(ns, TOBACCO, CITIES.Aevum, EmployeeJob.Engineer,    6);
	await EnsureEmployees(ns, TOBACCO, CITIES.Aevum, EmployeeJob.Business,    6);
	await EnsureEmployees(ns, TOBACCO, CITIES.Aevum, EmployeeJob.Management,  6);
	await EnsureEmployees(ns, TOBACCO, CITIES.Aevum, EmployeeJob.ResearchDev, 6);
// 3.0e12

	await EnsureWarehouses(ns, TOBACCO, 1);

	//ns.corporation.makeProduct(TOBACCO, CITIES.Aevum, "Tobacco v1", 1e9, 1e9);

	const loopActions = [
		{
			name: "Upgrade WA",
			costFunction: (ns: NS, division: Division, products: CorpProduct[]) => ns.corporation.getUpgradeLevel("Wilson Analytics") >= 250 ? Infinity : ns.corporation.getUpgradeLevelCost("Wilson Analytics"),
			executeFunction: async (ns: NS, division: Division, products: CorpProduct[]) => ns.corporation.levelUpgrade("Wilson Analytics")
		},
		{
			name: "Buy AdVert",
			costFunction: (ns: NS, division: Division, products: CorpProduct[]) => {
				if (division.awareness >= 1.797e308 && division.popularity >= 1.797e308) {
					return Infinity;
				}

				return ns.corporation.getHireAdVertCost(division.name);
			},
			executeFunction: async (ns: NS, division: Division, products: CorpProduct[]) => ns.corporation.hireAdVert(division.name)
		},
		{
			name: "Grow Development Office",
			costFunction: (ns: NS, division: Division, products: CorpProduct[]) => ns.corporation.getOffice(division.name, CITIES.Aevum).size > 1000 ? Infinity : ns.corporation.getOfficeSizeUpgradeCost(division.name, CITIES.Aevum, 3),
			executeFunction: async (ns: NS, division: Division, products: CorpProduct[]) => {
				// hire 3 employees into the appropriate place
				// you can deprio business and ops in main
				// some engi and managment and most in rnd will get you crazy products
				// and very few in ops/business ofc
				// there are 5 categories; lay them out like this
				//   operations: 1/20
				//   engineer:   3/20
				//   business:   1/20
				//   management: 3/20
				//   research:   12/20

				const office = ns.corporation.getOffice(division.name, CITIES.Aevum);

				if (office.employeeJobs.Operations < ((office.employees / 20) * 1)) {
					await EnsureEmployees(ns, division.name, CITIES.Aevum, EmployeeJob.Operations, office.employeeJobs.Operations + 3);
				} else if (office.employeeJobs.Engineer < ((office.employees / 20) * 3)) {
					await EnsureEmployees(ns, division.name, CITIES.Aevum, EmployeeJob.Engineer, office.employeeJobs.Engineer + 3);
				} else if (office.employeeJobs.Business < ((office.employees / 20) * 1)) {
					await EnsureEmployees(ns, division.name, CITIES.Aevum, EmployeeJob.Business, office.employeeJobs.Business + 3);
				} else if (office.employeeJobs.Management < ((office.employees / 20) * 3)) {
					await EnsureEmployees(ns, division.name, CITIES.Aevum, EmployeeJob.Management, office.employeeJobs.Management + 3);
				} else {
					await EnsureEmployees(ns, division.name, CITIES.Aevum, EmployeeJob.ResearchDev, office.employeeJobs["Research & Development"] + 3);
				}
			}
		},
		{
			name: "Develop New Product",
			costFunction: (ns: NS, division: Division, products: CorpProduct[]) => {
				// cost is infinity if we have one developing, otherwise low

				// if a product is under development, then don't do this action
				if (products.some(p => p.product.developmentProgress < 100)) {
					return Infinity;
				}

				// if a product is completed but not for sale, don't do this action
				if (products.some(p => p.product.developmentProgress >= 100 && p.product.sCost === "")) {
					return Infinity;
				}

				// cost is development cost
				//return Math.min(ns.corporation.getCorporation().funds / 20);

				// cost is, well, irrelevant, we're doing it
				return -1;
			},
			executeFunction: async (ns: NS, division: Division, products: CorpProduct[]) => {
				if (products.length == 0) {
					return;
				}

				// discontinue oldest product if necessary
				if (products.length >= 3) {
					products.sort((a, b) => a.version - b.version);
					ns.corporation.discontinueProduct(division.name, products[0].name);
				}

				// develop new product
				const newName   = `${division.name } v${products[products.length - 1].version + 1}`;
				const devInvest = Math.min((ns.corporation.getCorporation().funds / 20) / 2);

				ns.corporation.makeProduct(division.name, CITIES.Aevum, newName, devInvest, devInvest);
			}
		},
		{
			name: "Sell New Product",
			costFunction: (ns: NS, division: Division, products: CorpProduct[]) => {
				const haveTaII = ns.corporation.hasResearched(division.name, MARKET_TA_II);

				for (const product of products) {
					if (product.product.developmentProgress >= 100 && product.product.sCost == "") {
						if (haveTaII) {
							ns.tprint(`${division.name} product ${product.name} developed but not being sold (HAVE TA 2)`);
							return 0;
						} else {
							ns.tprint(`${division.name} product ${product.name} developed but not being sold`);
							return Infinity;
						}
					}
				}

				return Infinity;
			},
			executeFunction: async (ns: NS, division: Division, products: CorpProduct[]) => {
				const haveTaII = ns.corporation.hasResearched(division.name, MARKET_TA_II);

				if (!haveTaII) {
					return;
				}

				const readyProduct = products.filter(p => p.product.developmentProgress >= 100 && p.product.sCost == "").at(0);

				if (!readyProduct) {
					return;
				}

				for (const product of products.filter(p => p.product.developmentProgress >= 100 && p.product.sCost == "")) {
					ns.corporation.setProductMarketTA2(division.name, product.name, true);
					ns.corporation.sellProduct(TOBACCO, CITIES.Aevum, product.name, "MAX", "MP", true);
				}

				await ns.sleep(1000);
			}
		},
		{
			name: "Research Upgrades",
			costFunction: (ns: NS, division: Division, products: CorpProduct[]) => {
				// if we don't have the lab and we can afford it, we need it now
				if (!ns.corporation.hasResearched(division.name, HI_TECH_LABORATORY) && division.research > ns.corporation.getResearchCost(division.name, HI_TECH_LABORATORY)) {
					return 0;
				}

				const haveTaI  = ns.corporation.hasResearched(division.name, MARKET_TA_I);
				const haveTaII = ns.corporation.hasResearched(division.name, MARKET_TA_II);
				const costTaI  = haveTaI ? 0 : ns.corporation.getResearchCost(division.name, MARKET_TA_I);
				const costTaII = haveTaII ? 0 : ns.corporation.getResearchCost(division.name, MARKET_TA_II);

				// if we can afford the AI upgrades and we don't have them, we need them
				if (!(haveTaI && haveTaII) && division.research > (costTaI + costTaII + 70_000)) {
					return 0;
				}

				return Infinity;
			},
			executeFunction: async (ns: NS, division: Division, products: CorpProduct[]) => {
				if (!ns.corporation.hasResearched(division.name, HI_TECH_LABORATORY) && division.research > ns.corporation.getResearchCost(division.name, HI_TECH_LABORATORY)) {
					ns.corporation.research(division.name, HI_TECH_LABORATORY);
					return;
				}

				const haveTaI  = ns.corporation.hasResearched(division.name, MARKET_TA_I);
				const haveTaII = ns.corporation.hasResearched(division.name, MARKET_TA_II);
				const costTaI  = haveTaI ? 0 : ns.corporation.getResearchCost(division.name, MARKET_TA_I);
				const costTaII = haveTaII ? 0 : ns.corporation.getResearchCost(division.name, MARKET_TA_II);

				// if we can afford the AI upgrades and we don't have them, we need them
				if (!(haveTaI && haveTaII) && division.research > (costTaI + costTaII)) {
					ns.corporation.research(division.name, MARKET_TA_I);
					ns.corporation.research(division.name, MARKET_TA_II);
					return;
				}

			}
		},
		{
			name: "Corp Upgrades",
			costFunction: (ns: NS, division: Division, products: CorpProduct[]) => {
				const currentUpgrades = ["Neural Accelerators",
					"Project Insight",
					"Nuoptimal Nootropic Injector Implants",
					"FocusWires",
					"DreamSense",
					"Speech Processor Implants",
					"ABC SalesBots"]
					.map(upgrade => ({upgrade: upgrade, currentLevel: ns.corporation.getUpgradeLevel(upgrade)}));

				const minLevel = Math.min(...currentUpgrades.map(u => u.currentLevel));

				// don't upgrade past 350
				if (minLevel >= 350) {
					return Infinity;
				}

				// cost is whatever it costs to level the smallest one(s) one level
				return currentUpgrades
					.filter(u => u.currentLevel == minLevel)
					.reduce((prev, cur) => prev + ns.corporation.getUpgradeLevelCost(cur.upgrade), 0) * 1.5;
			},
			executeFunction: async (ns: NS, division: Division, products: CorpProduct[]) => {
				const currentUpgrades = ["Neural Accelerators",
					"Project Insight",
					"Nuoptimal Nootropic Injector Implants",
					"FocusWires",
					"DreamSense",
					"Speech Processor Implants",
					"ABC SalesBots"]
					.map(upgrade => ({upgrade: upgrade, currentLevel: ns.corporation.getUpgradeLevel(upgrade)}));

				const minLevel = Math.min(...currentUpgrades.map(u => u.currentLevel));

				currentUpgrades
					.filter(u => u.currentLevel == minLevel)
					.forEach(u => ns.corporation.levelUpgrade(u.upgrade));
			}
		},
	];

	// took a 1.8e13 investment for 25%
	// took a 5.4e15 investment for something... left with 1e8 shares; last investment allowed
	while (true) {
		const corp          = ns.corporation.getCorporation();
		const availFunds    = corp.funds - 1e12; // save SOME money for things like developing products
		const division      = ns.corporation.getDivision(TOBACCO);
		const products      = division.products.map(p => new CorpProduct(ns, division.name, p));
		const costedActions = loopActions.map(action => ({
			name: action.name,
			cost: action.costFunction(ns, division, products),
			executeFunction: action.executeFunction
		})).sort((a, b) => a.cost - b.cost);

// ns.tprint(division.awareness);
// ns.tprint(division.popularity);
// return;
		// if the cheapest thing we can do is doable, then do it
		if (costedActions[0].cost < availFunds) {
			ns.tprint(`Undertaking corporation action ${costedActions[0].name} at cost $${ns.formatNumber(costedActions[0].cost)}`);
			await costedActions[0].executeFunction(ns, division, products);
			await ns.sleep(250);
			continue;
		}

		await ns.sleep(10000);
	}
}


async function EstablishAgricultureDivision(ns: NS) {
	// ensure we have an agriculture division
	await ExpandDivision(ns, AGRICULTURE);

	// ensure the agriculture div's warehouses are correctly set up
	await EnsureWarehouses(ns, AGRICULTURE, 3);

	// get our basic employees in place
	for (const city of ns.corporation.getDivision(AGRICULTURE).cities) {
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Operations, 1);
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Engineer,   1);
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Business,   1);
	}

	// get our basic upgrades in place
	for (let i = 1; i <= 2; i++) {
		for (const upgrade of ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants", "Smart Factories"]) {
			await EnsureUpgrade(ns, upgrade, i);
		}
	}

	// buy some materials to up our production
	await EnsureMaterials(ns, AGRICULTURE, [{ name: "Hardware", total: 125 }, { name: "AI Cores", total: 75 }, { name: "Real Estate", total: 27_000 }])

	if (ns.corporation.getDivision(AGRICULTURE).cities.map(c => ns.corporation.getOffice(AGRICULTURE, c)).every(o => o.employees <= 3)) {
		// wait for great employees
		ns.tprint("Waiting for employee levels to reach peak before initiating investment.");
		await EnsureEmployeeLevels(ns, AGRICULTURE, 100.000, 99.998, 99.998);

		// then we're looking for investment of $210bn (2.1e11)
		// ... we can know to skip this if our offices are >3 employees each...
	}

	// more employees
	for (const city of ns.corporation.getDivision(AGRICULTURE).cities) {
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Operations,  2);
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Engineer,    2);
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Business,    1);
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Management,  2);
		await EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.ResearchDev, 2);
	}

	// took a 1.72e11 round for 10% stake investment during above...

	// some upgrades
	for (const upgrade of ["Smart Factories", "Smart Storage"]) {
		await EnsureUpgrade(ns, upgrade, 10);
	}

	// upgrade warehouses to level 10 (2k space)
	await EnsureWarehouses(ns, AGRICULTURE, 10);

	// more materials
	await EnsureMaterials(ns, AGRICULTURE, [{ name: "Hardware", total: 2800 }, { name: "Robots", total: 96 }, { name: "AI Cores", total: 2520 }, { name: "Real Estate", total: 146_400 }]);

	// after above, at production multiplier 241.415
	// after above, offered a 2.9e12 investment for 35% stake
	// guide says we need $5tn (5e12) investment round to complete the following part

	// level 19 (3.8k space, theoretically)
	await EnsureWarehouses(ns, AGRICULTURE, 19);

	// took a 2.9e12 investment for 35% stake during above

	// last round of materials
	await EnsureMaterials(ns, AGRICULTURE, [{ name: "Hardware", total: 9300 }, { name: "Robots", total: 726 }, { name: "AI Cores", total: 6270 }, { name: "Real Estate", total: 230_400 }]);

	// production multiplier should be >500... we could check for that...
	// ended with ~2.78e12 funds, owned 5.5e8 shares of 1e9 total
}

async function ExpandDivision(ns: NS, industryName: CorpIndustryName, adVertLevel: number = 1) {
	const divisions = ns.corporation.getCorporation().divisions
		.filter(divName => ns.corporation.getDivision(divName).type == industryName);

	// make the division if it doesn't exist
	if (divisions.length == 0) {
		ns.corporation.expandIndustry(industryName, industryName);
		ns.tprint(`${industryName} division created.`);
	} else {
		ns.tprint(`${industryName} division already exists.`);
	}

	// ensure the division is expanded to all cities
	const divCities = ns.corporation.getDivision(industryName).cities;

	if (divCities.length < CITIES.length) {
		for (const name of CITIES) {
			if (!divCities.includes(name)) {
				ns.corporation.expandCity(industryName, name);
			}
		}
	} else {
		ns.tprint(`${industryName} division already expanded.`);
	}

	while (ns.corporation.getHireAdVertCount(industryName) < adVertLevel) {
		await AwaitFunds(ns, ns.corporation.getHireAdVertCost(industryName));
		ns.corporation.hireAdVert(industryName);
	}
}

async function EnsureWarehouses(ns: NS, divisionName: string, warehouseLevel: number) {
	const division = ns.corporation.getDivision(divisionName);

	for (const city of division.cities) {
		if (!ns.corporation.hasWarehouse(divisionName, city)) {
			await AwaitFunds(ns, ns.corporation.getConstants().warehouseInitialCost);
			ns.corporation.purchaseWarehouse(divisionName, city);
		}

		const wh = ns.corporation.getWarehouse(divisionName, city);

		if (!wh.smartSupplyEnabled) {
			ns.corporation.setSmartSupply(divisionName, city, true);
		}

		for (const material of USED_MATERIALS[division.type]) {
			ns.corporation.setSmartSupplyUseLeftovers(divisionName, city, material, true);
		}

		for (const material of PRODUCED_MATERIALS[division.type]) {
			ns.corporation.sellMaterial(divisionName, city, material, "MAX", "MP");
		}

		if (wh.level < warehouseLevel) {
			await AwaitFunds(ns, ns.corporation.getUpgradeWarehouseCost(divisionName, city, warehouseLevel - wh.level));
			ns.corporation.upgradeWarehouse(divisionName, city, warehouseLevel - wh.level);
		}
	}

	ns.tprint(`All warehouses for division ${divisionName} at or above size ${warehouseLevel}`);
}

async function EnsureEmployees(ns: NS, divisionName: string, city: CityName, position: EmployeeJob, employees: number) {
	const office     = ns.corporation.getOffice(divisionName, city);
	const empsNeeded = employees - office.employeeJobs[position];

	// if we already have enough employees in this position, we're done here
	if (empsNeeded <= 0) {
		return true;
	}

	// TODO: not really sure what setAutoJobAssignment does... probably takes from unassigned, but who knows?
	// if (office.employeeJobs.Unassigned >= empsNeeded) {
	// 	ns.corporation.setAutoJobAssignment(divisionName, city, position, employees);
	// }

	// hire the requested employees
	for (let i = 0; i < empsNeeded; i++) {
		// expand the office if necessary
		if (ns.corporation.getOffice(divisionName, city).size - ns.corporation.getOffice(divisionName, city).employees < 1) {
			await AwaitFunds(ns, ns.corporation.getOfficeSizeUpgradeCost(divisionName, city, 3));
			ns.corporation.upgradeOfficeSize(divisionName, city, 3);
		}

		if (!ns.corporation.hireEmployee(divisionName, city, position)) {
ns.tprint(`employee hiring failed ${city} ${position}`);
			return false;
		}
	}

	return true;
}

async function EnsureUpgrade(ns: NS, upgradeName: string, desiredLevel: number) {
	while (ns.corporation.getUpgradeLevel(upgradeName) < desiredLevel) {
		await AwaitFunds(ns, ns.corporation.getUpgradeLevelCost(upgradeName));
		ns.corporation.levelUpgrade(upgradeName);
	}
}

async function EnsureMaterials(ns: NS, divisionName: string, materials: {name: string, total: number}[]) {
	const division = ns.corporation.getDivision(divisionName);

	let purchasing = false;

	do {
		purchasing = false;

		for (const city of division.cities) {
			for (const material of materials) {
				const currentAmount = ns.corporation.getMaterial(divisionName, city, material.name).qty;

				if (currentAmount < material.total) {
					purchasing = true;
					ns.corporation.buyMaterial(divisionName, city, material.name, (material.total - currentAmount) / 10);
					//ns.corporation.bulkPurchase(divisionName, city, material.name, material.total - currentAmount);
					//ns.tprint(`Purchasing ${(material.total - currentAmount) / 10} of ${material.name} in ${city} for division ${divisionName}`);
				} else {
					ns.corporation.buyMaterial(divisionName, city, material.name, 0);
				}
			}
		}

		await ns.sleep(100);
	} while (purchasing);

	ns.tprint("Material purchase complete.");
}

async function EnsureEmployeeLevels(ns: NS, divisionName: string, avgMorale: number, avgHappiness: number, avgEnergy: number) {
	const cities = ns.corporation.getDivision(divisionName).cities.map(city => ({city, done: false}));

	while (cities.some(c => !c.done)) {
		const pendingCitites = cities.filter(c => !c.done);
		
		for (const city of cities.filter(c => !c.done)) {
			const office = ns.corporation.getOffice(divisionName, city.city);

			if (office.avgMor >= avgMorale && office.avgHap >= avgHappiness && office.avgEne >= avgEnergy) {
				city.done = true;
			}
		}

		if (pendingCitites.every(c => c.done)) {
			break;
		}

		await ns.sleep(60000);
	}

	ns.tprint("Employee levels reached targets.");
}

async function AdjustProductPrice(ns: NS, divisionName: string, productName: string) {
	const product  = ns.corporation.getProduct(divisionName, productName);
	const price    = Number.isNaN(Number(product.sCost)) ? product.pCost : Number(product.sCost);
	const newPrice = price * 1.01;
	const priceScore = (product: Product) => Object.values(product.cityData).reduce((prevValue, [_, production, sale]) => prevValue + (sale - production), 0);
}

async function AwaitCycle(ns: NS) {
	const startFunds = ns.corporation.getCorporation().funds;

	while (ns.corporation.getCorporation().funds == startFunds) {
		await ns.sleep(250);
	}
}

async function AwaitFunds(ns: NS, funds: number) {
	const corp = ns.corporation.getCorporation();

	if (corp.funds >= funds) {
		return;
	}

	const gapCycles  = (funds - corp.funds) / (corp.revenue - corp.expenses);
	const timeToWait = gapCycles * ns.corporation.getConstants().secondsPerMarketCycle;

	ns.tprint(`Waiting approx ${ns.tFormat(timeToWait * 1000)} for funds (${ns.formatNumber(funds)}).`);

    while (ns.corporation.getCorporation().funds < funds) {
        await ns.sleep(1000);
    }
}
