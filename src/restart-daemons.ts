import { NS } from "@ns";
import { DAEMON_JSON_FILENAME, ScriptInfo } from "@/install-augmentations";

export async function main(ns: NS) {
	// if we don't have daemon state, then that's an error
	if (!ns.fileExists(DAEMON_JSON_FILENAME, "home")) {
		throw new Error("No daemon state file found.");
	}

	// parse out the info on the daemons we should restart
	const runningDaemons = JSON.parse(ns.read(DAEMON_JSON_FILENAME)) as ScriptInfo[];

	// remove the state file
	ns.rm(DAEMON_JSON_FILENAME, "home");

	for (const daemon of runningDaemons) {
		const pid = ns.exec(daemon.filename, "home", 1, ...daemon.args);

		if (pid != 0) {
			ns.tprint(`Daemon ${daemon.filename} restarted as PID ${pid}`);
		} else {
			ns.tprint(`Daemon ${daemon.filename} with args ${daemon.args} FAILED TO RESTART.`);
		}
	}
}