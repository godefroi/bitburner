import { NS, NodeStats } from "@ns";
import { HACKNET_PORT } from "@/_tools/ports";
import { DaemonCommand, Execute } from "@/_tools/daemon";

const MAX_SERVER_LEVEL = 192;
const MAX_SERVER_RAM   = 1e9; 
const MAX_SERVER_CORES = 48;
const MAX_SERVER_CACHE = 6;

export async function main(ns: NS) {
	ns.disableLog("sleep");

	const daemonCommands: DaemonCommand<MyFlags, MyState>[] = [
		{
			command: "upgradenodes",
			helpText: "Instructs the hacknet daemon to spend all money upgrading hacknet nodes.",
			handler: async (ns, args, flags, state) => {
				state.mode = OperatingMode.UpgradeNodes;
				if (state.upgradeTarget === Infinity) {
					ns.print("Operating mode set to UpgradeNodes.");
				} else {
					state.upgradeTarget = Infinity;
					ns.print("Operating mode set to UpgradeNodes; target reset to Infinity.");
				}
			},
		},
		{
			command: "target",
			helpText: "Sets a target hash production value, at which the mode will be set to extract cash.",
			handler: async (ns, args, flags, state) => {
				const target = Number(args.shift);

				if (!Number.isNaN(target) && target > 0) {
					state.upgradeTarget = target;
					ns.tprint(`Upgrade target set to ${target}`);
				} else {
					ns.tprint("Provide a target production in hashes/sec.");
				}
			},
		},
		{
			command: "extractcash",
			helpText: "Instructs the hacknet daemon to spend all hashes generating funds.",
			handler: async (ns, args, flags, state) => {
				state.mode = OperatingMode.ExtractCash;
				ns.tprint("Operating mode set to ExtractCash");
				//const totalProduction = state.servers.reduce((total, curServer) => total + ns.hacknet.getNodeStats(curServer.index).production, 0);
				//const costToSell      = ns.hacknet.hashCost(HashSaleUpgrade.SellForMoney);
				//const sellsPerSecond  = totalProduction / costToSell;
				const moneyMult = ns.getPlayer().mults.hacknet_node_money;
				const gainRate = state.servers.reduce((total, curServer) => total + ns.formulas.hacknetNodes.moneyGainRate(curServer.stats.level, curServer.stats.ram, curServer.stats.cores, moneyMult), 0)
				ns.tprint(`Expected money gain rate: ${ns.formatNumber(gainRate)}/sec`);
			},
		},
		{
			command: "improvestudy",
			helpText: "Instructs the hacknet daemon to spend all hashes improving universities.",
			handler: async (ns, args, flags, state) => {
				state.mode = OperatingMode.ImproveStudy;
				ns.tprint("Operating mode set to ImproveStudy");
			},
		},
		{
			command: "corpfunds",
			helpText: "Instructs the hacknet daemon to spend all hashes buying corporation funds.",
			handler: async (ns, args, flags, state) => {
				state.mode = OperatingMode.CorpFunds;
				ns.tprint("Operating mode set to CorpFunds");
			},
		},
		{
			command: "corprnd",
			helpText: "Instructs the hacknet daemon to spend all hashes buying corporation research.",
			handler: async (ns, args, flags, state) => {
				state.mode = OperatingMode.CorpRnD;
				ns.print("Operating mode set to CorpRnD");
			},
		},
	];

	await Execute(ns, HACKNET_PORT, InitializeState, RunDaemon, daemonCommands, {});
}


function InitializeState(ns: NS): MyState {
	const servers = [...Array(ns.hacknet.numNodes()).keys()].map(i => ComputeServerInfo(ns, i));

	return {
		servers: servers,
		upgrades: ComputePotentialUpgrades(ns, servers),
		upgradeTarget: Infinity,
		mode: OperatingMode.ExtractCash,
	};
}


async function RunDaemon(ns: NS, state: MyState): Promise<number> {
	switch (state.mode) {
		case OperatingMode.UpgradeNodes:
			const sleepTime = UpgradeAllNodes(ns, state);
			if (state.upgradeTarget < Infinity) {
				if (state.servers.reduce((total, server) => total + server.stats.production, 0) >= state.upgradeTarget) {
					ns.tprint(`Upgrade target of ${state.upgradeTarget} reached; mode set to ExtractCash.`);
					state.mode = OperatingMode.ExtractCash;
				}
			}
			return sleepTime;

		case OperatingMode.ExtractCash:
			SpendAllHashes(ns, HashSaleUpgrade.SellForMoney);
			return 1000;

		case OperatingMode.ImproveStudy:
			SpendAllHashes(ns, HashSaleUpgrade.ImproveStudying);
			if (ns.hacknet.hashCost(HashSaleUpgrade.ImproveStudying) > ns.hacknet.hashCapacity()) {
				ns.print("Insufficient hash capacity; mode reset to ExtractCash");
				state.mode = OperatingMode.ExtractCash;
			}
			return 1000;

		case OperatingMode.CorpFunds:
			SpendAllHashes(ns, HashSaleUpgrade.CorpFunds);
			if (ns.hacknet.hashCost(HashSaleUpgrade.CorpFunds) > ns.hacknet.hashCapacity()) {
				ns.print("Insufficient hash capacity; mode reset to ExtractCash");
				state.mode = OperatingMode.ExtractCash;
			}
			return 1000;

		case OperatingMode.CorpRnD:
			SpendAllHashes(ns, HashSaleUpgrade.CorpResearch);
			if (ns.hacknet.hashCost(HashSaleUpgrade.CorpResearch) > ns.hacknet.hashCapacity()) {
				ns.print("Insufficient hash capacity; mode reset to ExtractCash");
				state.mode = OperatingMode.ExtractCash;
			}
			return 1000;

		default:
			state.mode = OperatingMode.ExtractCash;
			return 1000;
	}
}


function SpendAllHashes(ns: NS, upgrade: HashSaleUpgrade) {
	while (ns.hacknet.numHashes() > ns.hacknet.hashCost(upgrade)) {
		if (!ns.hacknet.spendHashes(upgrade)) {
			ns.print(`Unable to purchase upgrade ${upgrade} at hash cost ${ns.hacknet.hashCost(upgrade)}; current hashes: ${ns.hacknet.numHashes()}`);
			break;
		}
	}
}


function UpgradeAllNodes(ns: NS, state: {servers: ServerInfo[], upgrades: ServerUpgrade[]}) : number {
	// sell any hashes we can for money
	SpendAllHashes(ns, HashSaleUpgrade.SellForMoney);

	const currentFunds     = ns.getPlayer().money;
	const possibleUpgrades = state.upgrades
		.filter(u => u.cost <= currentFunds)
		.sort((a, b) => b.value - a.value);

	// if we have no possible upgrades, then wait a while and try again
	if (possibleUpgrades.length == 0) {
		return 1000;
	}

	// run the best upgrade we can
	const upgrade = possibleUpgrades[0];

	ns.print(`Executing upgrade of type ${upgrade.type} for index ${upgrade.index} at cost ${ns.formatNumber(upgrade.cost)}, value ${ns.formatNumber(upgrade.value)}`);

	if (!upgrade.execute(ns, upgrade.index)) {
		ns.tprint(`Upgrade of type ${upgrade.type} for index ${upgrade.index} failed!`);
		return 1000;
	}

	// recalculate the affected server info
	if (upgrade.type == "new") {
		state.servers.push(ComputeServerInfo(ns, state.servers.length));
	} else {
		state.servers[upgrade.index] = ComputeServerInfo(ns, upgrade.index);
	}

	// recompute the potential upgrades
	state.upgrades = ComputePotentialUpgrades(ns, state.servers);

	// don't sleep long, we might have more work to do
	return 100;
}


function ComputeServerInfo(ns: NS, index: number) : ServerInfo {
	const stats         = ns.hacknet.getNodeStats(index);
	const levelCost     = stats.level >= MAX_SERVER_LEVEL ? Infinity : ns.hacknet.getLevelUpgradeCost(index, 1);
	const ramCost       = stats.ram >= MAX_SERVER_RAM ? Infinity : ns.hacknet.getRamUpgradeCost(index, 1);
	const coresCost     = stats.cores >= MAX_SERVER_CORES ? Infinity : ns.hacknet.getCoreUpgradeCost(index, 1);
	const cacheCost     = (stats.cache ?? 0) >= MAX_SERVER_LEVEL ? Infinity : ns.hacknet.getCacheUpgradeCost(index, 1);
	const levelIncrease = levelCost == Infinity ? 0 : stats.production - ns.formulas.hacknetServers.hashGainRate(stats.level + 1, 0, stats.ram, stats.cores/*, ns.getPlayer().mults.hacknet_node_money*/);
	const ramIncrease   = ramCost == Infinity ? 0 : stats.production - ns.formulas.hacknetServers.hashGainRate(stats.level, 0, stats.ram * 2, stats.cores/*, ns.getPlayer().mults.hacknet_node_money*/);
	const coresIncrease = coresCost == Infinity ? 0 : stats.production - ns.formulas.hacknetServers.hashGainRate(stats.level, 0, stats.ram, stats.cores + 1/*, ns.getPlayer().mults.hacknet_node_money*/);

	return {
		index,
		stats,
		levelCost,
		levelIncrease,
		levelValue: (levelIncrease * 1e10) / levelCost,
		ramCost,
		ramIncrease,
		ramValue: (ramIncrease * 1e10) / ramCost,
		coresCost,
		coresIncrease,
		coresValue: (coresIncrease * 1e10) / coresCost,
		cacheCost,
	};
}


function ComputePotentialUpgrades(ns: NS, servers: ServerInfo[]): ServerUpgrade[] {
	const maxNodes = ns.hacknet.maxNumNodes();
	const upgrades = servers.flatMap(server => [
		{
			index: server.index,
			type: "level",
			cost: server.levelCost,
			value: server.levelValue,
			execute: (ns: NS, index: number) => ns.hacknet.upgradeLevel(index, 1),
		},
		{
			index: server.index,
			type: "ram",
			cost: server.ramCost,
			value: server.ramValue,
			execute: (ns: NS, index: number) => ns.hacknet.upgradeRam(index, 1),
		},
		{
			index: server.index,
			type: "cores",
			cost: server.coresCost,
			value: server.coresValue,
			execute: (ns: NS, index: number) => ns.hacknet.upgradeCore(index, 1),
		},
	]);

	// if we're under our max node count, then add an item to consider for buying a server
	if (servers.length < maxNodes) {
		const newCost = ns.hacknet.getPurchaseNodeCost();

		upgrades.push({
			index: -1,
			type: "new",
			cost: newCost,
			value: (ns.formulas.hacknetServers.hashGainRate(1, 0, 1, 1) * 1e10/*, ns.getPlayer().mults.hacknet_node_money*/) / newCost,
			execute: (ns: NS, index: number) => ns.hacknet.purchaseNode() != -1,

		});
	}

	return upgrades;
}


interface ServerInfo {
	index: number,
	stats: NodeStats,
	levelCost: number,
	levelIncrease: number,
	levelValue: number,
	ramCost: number,
	ramIncrease: number,
	ramValue: number,
	coresCost: number,
	coresIncrease: number,
	coresValue: number,
	cacheCost: number,
}


interface ServerUpgrade {
	index: number,
	type: string,
	cost: number,
	value: number,
	execute: (ns: NS, index: number) => boolean,
}

enum OperatingMode {
	UpgradeNodes,
	ExtractCash,
	ImproveStudy,
	CorpFunds,
	CorpRnD,
}

enum HashSaleUpgrade {
	SellForMoney    = "Sell for Money",
	ImproveStudying = "Improve Studying",
	CorpFunds       = "Sell for Corporation Funds",
	CorpResearch    = "Exchange for Corporation Research",
}

type MyFlags = {};

type MyState = { servers: ServerInfo[], upgrades: ServerUpgrade[], upgradeTarget: number, mode: OperatingMode };
