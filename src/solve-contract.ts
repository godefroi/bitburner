import { NS } from "@ns";

export async function main(ns: NS) {
	let i = 2;
	let number = Number(ns.args[0]);

	while (number > 1) {
		if (number % i == 0) {
			number /= i;
		} else {
			i += 1;
		}
	}

	ns.tprint(i);
}
