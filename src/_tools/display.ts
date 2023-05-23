import { NS } from "@ns";

export const FormatDuration = (ns: NS, duration: number | undefined) => duration === undefined ? "" : ns.tFormat(duration).replaceAll(/( |)(day|hour|minute|second)(s|)( |)/g, (match, p1, p2) => p2.substring(0, 1));
