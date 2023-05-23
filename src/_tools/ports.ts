export const HACKNET_PORT     = 1;
export const SOLVER_PORT      = 2;
export const PURCHASER_PORT   = 3;
export const BATCHER_PORT     = 4;
export const HWGW_SCRIPT_PORT = 5;
export const CORPORATION_PORT = 6;
export const HELMSMAN_PORT    = 7;
export const SLEEVES_PORT     = 8;

class Queue<T> {
	private storage: T[] = [];

	constructor(private capacity: number = Infinity) {}

	enqueue(item: T): void {
		if (this.size() === this.capacity) {
			throw Error("Queue has reached max capacity, you cannot add more items");
		}

		this.storage.push(item);
	}

	dequeue(): T | undefined {
		return this.storage.shift();
	}

	size(): number {
		return this.storage.length;
	}
}
