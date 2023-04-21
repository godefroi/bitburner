import { NS, CorpIndustryName, type CityName } from "@ns";
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

const CORPNAME = "Corp";
const AGRICULTURE: CorpIndustryName = "Agriculture";

export async function main(ns: NS) {
	// ensure the corporation exists
	if (!ns.corporation.hasCorporation()) {
		if (!ns.corporation.createCorporation(CORPNAME, true)) {
			ns.tprint("Unable to create corporation.");
			return;
		}

		ns.tprint("Corporation started.");
	} else {
		ns.tprint("Corporation already exists.");
	}

	// ensure we've purchased Smart Supply
	if (!ns.corporation.hasUnlockUpgrade("Smart Supply")) {
		ns.corporation.unlockUpgrade("Smart Supply");
		ns.tprint("Smart Supply purchased.");
	} else {
		ns.tprint("Smart Supply already purchased.");
	}

	// ensure we have an agriculture division
	ExpandDivision(ns, AGRICULTURE);

	// ensure the agriculture div's warehouses are correctly set up
	SetupWarehouses(ns, AGRICULTURE, 3);

	// get our basic employees in place
	for (const city of ns.corporation.getDivision(AGRICULTURE).cities) {
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Operations, 1);
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Engineer,   1);
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Business,   1);
	}

	// get our basic upgrades in place
	for (let i = 1; i <= 2; i++) {
		for (const upgrade of ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants", "Smart Factories"]) {
			await EnsureUpgrade(ns, upgrade, i);
		}
	}

	// buy some materials to up our production
	await EnsureMaterials(ns, AGRICULTURE, [{ name: "Hardware", total: 125 }, { name: "AI Cores", total: 75 }, { name: "Real Estate", total: 27_000 }])

	// wait for great employees
	await EnsureEmployeeLevels(ns, AGRICULTURE, 100.000, 99.998, 99.998);

	// then we're looking for investment of $210bn (2.1e11)
	// ... we can know to skip this if our offices are >3 employees each...
return;

	// more employees
	for (const city of ns.corporation.getDivision(AGRICULTURE).cities) {
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Operations,  2);
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Engineer,    2);
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Business,    1);
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.Management,  2);
		EnsureEmployees(ns, AGRICULTURE, city, EmployeeJob.ResearchDev, 2);
	}

	// some upgrades
	for (const upgrade of ["Smart Factories", "Smart Storage"]) {
		await EnsureUpgrade(ns, upgrade, 10);
	}

	// upgrade warehouses to level 10 (2k space, hopefully...)
	SetupWarehouses(ns, AGRICULTURE, 10);

	// more materials
	await EnsureMaterials(ns, AGRICULTURE, [{ name: "Hardware", total: 2800 }, { name: "Robots", total: 96 }, { name: "AI Cores", total: 2520 }, { name: "Real Estate", total: 146_400 }]);

	// level 19 (3.8k space, theoretically)
	SetupWarehouses(ns, AGRICULTURE, 19);

	// last round of materials
	await EnsureMaterials(ns, AGRICULTURE, [{ name: "Hardware", total: 9300 }, { name: "Robots", total: 726 }, { name: "AI Cores", total: 6270 }, { name: "Real Estate", total: 230_400 }]);

	// production multiplier should be >500... we could check for that...
}


function ExpandDivision(ns: NS, industryName: CorpIndustryName, adVertLevel: number = 1) {
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

	if (ns.corporation.getHireAdVertCount(industryName) < adVertLevel) {
		ns.corporation.hireAdVert(industryName);
	}
}

function SetupWarehouses(ns: NS, divisionName: string, warehouseLevel: number) {
	const division = ns.corporation.getDivision(divisionName);

	for (const city of division.cities) {
		// if (ns.corporation.hasWarehouse(divisionName, city))
		// ns.tprint(`div ${divisionName} city ${city} warehouse level ${ns.corporation.getWarehouse(divisionName, city).level}`); else ns.tprint(`div ${divisionName} city ${city} no warehouse`);
		// continue;
		if (!ns.corporation.hasWarehouse(divisionName, city)) {
			ns.corporation.purchaseWarehouse(divisionName, city);
		}

		const wh = ns.corporation.getWarehouse(divisionName, city);

		if (!wh.smartSupplyEnabled) {
			ns.corporation.setSmartSupply(divisionName, city, true);
		}

		for (const material of USED_MATERIALS[division.type]) {
			ns.corporation.setSmartSupplyUseLeftovers(AGRICULTURE, city, material, true);
		}

		for (const material of PRODUCED_MATERIALS[division.type]) {
			ns.corporation.sellMaterial(divisionName, city, material, "MAX", "MP");
		}

		if (wh.level < warehouseLevel) {
			ns.corporation.upgradeWarehouse(divisionName, city, warehouseLevel - wh.level);
		}
	}
}

function EnsureEmployees(ns: NS, divisionName: string, city: CityName, position: EmployeeJob, employees: number) {
	const office  = ns.corporation.getOffice(AGRICULTURE, city);
	const curEmps = ns.corporation.getOffice(AGRICULTURE, city).employeeJobs[position];

	// if we already have enough employees in this position, we're done here
	if (curEmps >= employees) {
		return true;
	}

	const empsNeeded = employees - curEmps;
	// TODO: not really sure what setAutoJobAssignment does... probably takes from unassigned, but who knows?
	// if (office.employeeJobs.Unassigned >= empsNeeded) {
	// 	ns.corporation.setAutoJobAssignment(divisionName, city, position, employees);
	// }

	// expand the office if necessary
	while (ns.corporation.getOffice(AGRICULTURE, city).size < (office.employees + empsNeeded)) {
		ns.corporation.upgradeOfficeSize(divisionName, city, 3);
	}
	
	// hire the requested employees
	for (let i = 0; i < empsNeeded; i++) {
		if (!ns.corporation.hireEmployee(divisionName, city, position)) {
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
		ns.tprint(`waiting for ${pendingCitites.length}: ${cities.map(c => c.city).join(", ")}`);
		for (const city of cities.filter(c => !c.done)) {
			const office = ns.corporation.getOffice(divisionName, city.city);

			if (office.avgMor > avgMorale && office.avgHap > avgHappiness && office.avgEne >= avgEnergy) {
				city.done = true;
			}
		}

		await ns.sleep(60000);
	}

	ns.tprint("Employee levels reached targets.");
}

async function AwaitFunds(ns: NS, funds: number) {
    while (ns.corporation.getCorporation().funds < funds) {
        await ns.sleep(1000);
    }
}
