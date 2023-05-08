import { type CityName, NS, Product } from "@ns";
import { CITIES } from "@/_tools/enums";

const PRODUCT_NAME  = "Tobacco v4";
const DIVISION_NAME = "Tobacco";


class CorpProduct {
	name: string;
	product: Product;
	version: number;
	quantity: number;
	produced: number;
	sold: number;
	multiplier: number;

	constructor(ns: NS, divisionName: string, productName: string) {
		this.name       = productName;
		this.product    = ns.corporation.getProduct(divisionName, productName);
		this.version    = parseInt(/\d+$/.exec(productName)?.[0] ?? "0");
		this.quantity   = 0;
		this.produced   = 0;
		this.sold       = 0;
		this.multiplier = 0;

		for (const c in this.product.cityData) {
			const [qty, prod, sell] = this.product.cityData[c as keyof Record<(CityName | `${CityName}`), number[]>];

			this.quantity += qty;
			this.produced += prod;
			this.sold     += sell;
		}

		this.quantity = Math.round(this.quantity);

		const matches = /MP\*(\d+)/.exec(this.product.sCost.toString());

		if (matches != null && matches.length > 0) {
			this.multiplier = parseInt(matches[1]);
		}
	}
}


export async function main(ns: NS) {
	const products = ns.corporation.getDivision(DIVISION_NAME).products
		.map(p => new CorpProduct(ns, DIVISION_NAME, p))
		.sort((a, b) => b.version - a.version); // sort newest first... ours should be at the top, index 0

	//const ourProduct  = products[0];
	//const prevProduct = products[1];
	//const prevX = 1e-9;
	const prevX = products[1].multiplier - 1;

	let ourX = prevX;

	while (true) {
		const ourProduct = new CorpProduct(ns, DIVISION_NAME, PRODUCT_NAME);

		if (ourProduct.quantity == 0) {
			// multiply x by a constant; 2 is probably safe, 10 would lead to faster convergence
			ourX *= 2;
			//ourX = ourX * 10;
		} else {
			const buffer  = ourProduct.produced / 10;
			const desired = ourProduct.quantity - buffer;
			const xMult   = Math.max(0.33, Math.sqrt(ourProduct.sold / desired));

			ourX *= xMult;

			ns.tprint(`buffer: ${buffer}`);
			ns.tprint(`desired: ${desired}`);
			ns.tprint(`xMult: ${xMult}`);
			ns.tprint(`curQty: ${ourProduct.quantity}`);
			ns.tprint(`prevSold: ${ourProduct.sold}`);
			ns.tprint(`produced: ${ourProduct.produced}`);
			ns.tprint(`ourX: ${ourX}`);
	
		}

		const newK = Math.ceil(ourX + 1);

		ns.tprint(`Setting new sell price to ${newK}`);
		ns.corporation.sellProduct(DIVISION_NAME, CITIES.Aevum, PRODUCT_NAME, "MAX", `MP*${newK}`, true);

		// wait for the next cycle
		await AwaitCycle(ns);
	}
}


async function AwaitCycle(ns: NS) {
	const startFunds = ns.corporation.getCorporation().funds;

	while (ns.corporation.getCorporation().funds == startFunds) {
		await ns.sleep(100);
	}
}
