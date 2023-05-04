import { NS } from "@ns";
import { Flags, FlagsRecord, ToMap } from "@/_tools/tools";

const MIN_LOOP_SLEEP = 10;


export type DaemonLoop<TState> = (ns: NS, state: TState) => Promise<number>;


export type StateInitializer<TState> = (ns: NS) => TState;


export type CommandHandler<TFlags, TState> = (ns: NS, args: string[], flags: TFlags, state: TState) => Promise<void>;


export interface DaemonCommand<TFlags, TState> {
	command: string,
	helpText: string,
	handler: CommandHandler<TFlags, TState>
}


export async function Execute<TFlags extends FlagsRecord, TState>(ns: NS, commandPort: number, stateInitializer: StateInitializer<TState>, runDaemon: DaemonLoop<TState>, daemonCommands: DaemonCommand<TFlags, TState>[], flagDefaults: TFlags): Promise<void> {
	const scriptName = ns.getScriptName();

	// if we're supposed to run the daemon, do that
	if (ns.args.length == 1 && ns.args[0].toString() == "--daemon") {
		await RunDaemonLoop(ns, commandPort, stateInitializer, runDaemon, daemonCommands);
		return;
	}

	// if the daemon is not running, start it
	if (ns.getRunningScript(scriptName, "home", "--daemon") == null) {
		if (ns.exec(scriptName, "home", 1, "--daemon") == 0) {
			ns.tprint("Failed to start daemon.");
		} else {
			ns.tprint(`Daemon starting...`);
		}
	}

	// parse out any flags we were sent
	const {flags, args} = Flags(ns, flagDefaults);

	// if we weren't given a command, print out help
	if (args.length == 0) {
		ShowUsage(ns, daemonCommands);
		return;
	}

	// the first arg is the command
	const command = args.shift();

	if (command == "start") {
		// dummy command, just starts the daemon
	} else if (command == "restart") {
		ns.kill(scriptName, "home", "--daemon");

		if (ns.exec(scriptName, "home", 1, "--daemon") == 0) {
			ns.tprint("Failed to start daemon.");
		} else {
			ns.tprint(`Daemon starting...`);
		}
	} else if (command == "exit") {
		ns.kill(scriptName, "home", "--daemon");
	} else if (!daemonCommands.some(c => c.command == command)) {
		// if the command we were given isn't a known command, print out help
		ShowUsage(ns, daemonCommands);
	} else {
		// send the command to the daemon
		ns.writePort(commandPort, JSON.stringify({command, args, flags}));
	}
}


async function RunDaemonLoop<TFlags, TState>(ns: NS, commandPort: number, stateInitializer: StateInitializer<TState>, runDaemon: DaemonLoop<TState>, daemonCommands: DaemonCommand<TFlags, TState>[]) {
	const state    = stateInitializer(ns);
	const port     = ns.getPortHandle(commandPort);
	const commands = ToMap(daemonCommands, c => c.command);

	while (true) {
		// handle any incoming commands
		while (!port.empty()) {
			const portData    = port.read();
			const commandMeta = JSON.parse(portData.toString()) as {command: string, args: string[], flags: TFlags};

			if (commandMeta == null) {
				ns.print("Invalid command received (JSON.parse failed).");
				break;
			}

			const command = commands.get(commandMeta.command);

			if (command == undefined) {
				ns.tprint(`Daemon received unrecognized command [${commandMeta.command}]; did you forget to restart the daemon?`);
			} else {
				ns.print(`Command received: ${command.command}`);
				await command.handler(ns, commandMeta.args, commandMeta.flags, state);
			}
		}

		// then, execute the main daemon loop handler
		const sleepTime = await runDaemon(ns, state);

		// if sleepTime is -1, then exit
		if (sleepTime == -Infinity) {
			return;
		}

		// finally, sleep
		await ns.sleep(Math.max(MIN_LOOP_SLEEP, sleepTime));
	}
}


function ShowUsage<TFlags extends FlagsRecord, TState>(ns: NS, daemonCommands: DaemonCommand<TFlags, TState>[]): void {
	ns.tprint("AVAILABLE COMMANDS:");
	ns.tprint("");

	for (const command of daemonCommands) {
		ns.tprint(command.command);
		ns.tprint(`\t${command.helpText}`);
	}

	ns.tprint("start");
	ns.tprint("\tStarts the daemon (or does nothing if the daemon is already running).");
	ns.tprint("restart");
	ns.tprint("\tRestarts the daemon.");
	ns.tprint("exit");
	ns.tprint("\tCauses the daemon to terminate.");
}
