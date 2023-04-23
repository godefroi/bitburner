import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
	if (ns.getPlayer().location == "the_moon") {
		ns.singularity.connect("home");
	}

	ns.tprint(eval(ns.args[0].toString()));

	//ns.singularity.destroyW0r1dD43m0n()
  }
  