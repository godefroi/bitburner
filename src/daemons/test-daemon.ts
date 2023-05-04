import { NS } from "@ns";
import { Execute } from "@/_tools/daemon";

type MyFlagsType = { flag1: string };
type MyStateType = { prop1: string, prop2: number, prop3: boolean };

export async function main(ns: NS) {
	await Execute(ns, 19, InitializeState, RunDaemon, [], { flag1: "flag1default", } as MyFlagsType);
}


function InitializeState(ns: NS) {
	return { prop1: "the prop1", prop2: 2, prop3: true };
}


async function RunDaemon(ns: NS, state: MyStateType) {
	return 1000;
}
