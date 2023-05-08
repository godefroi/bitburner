
export interface PidState {
	/** Gain values to control the influence of various facets of the process */
	gain: {
		/** Proportional gain. Proportional to the rate of change of the error. */
		P: number,
		/** Integral gain. Proportional to both the magnitude of the error and the duration of the error. */
		I: number,
		/** Derivitive gain. Proportional to the rate of change of the error. */
		D: number
	};

	/** Minimum output value the process can accept. */
	outputMin: number;

	/** Maximum output value the process can accept. */
	outputMax: number;

	/** Adjustment made by considering the accumulated error over time. */
	I: number;

	// minI: number;
	// maxI: number;
	// previousError: number;

	/** The target value for the process output value. */
	target: number;

	/** The previous value of the process variable. Used to calculate the rate of change of the output. */
	lastProcessVariable: number;

	/** Timestamp of the previous update. Used to calculate the rate of change. */
	lastUpdateTime: number;
}


function Clamp(value: number, min: number, max: number) {
	if (value < min) {
		return min;
	}

	if (value > max) {
		return max;
	}

	return value;
}


/**
 * (P)roportional, (I)ntegral, (D)erivative Controller
 * 
 * A PID controller should be able to control any process with a
 * measureable value, a known ideal value and an input to the
 * process that will affect the measured value.
 * 
 * https://en.wikipedia.org/wiki/PID_controller
 * @param processVariable Current value of the process variable (the process output variable, i.e. vehicle speed)
 * @param state PID controller state
 * @returns A new calculated value for the control variable (the process input variable, i.e. throttle value)
 */
export function ExecutePidController(processVariable: number, state: PidState): number {
	const error           = state.target - processVariable;
	const thisUpdate      = Date.now();
	const timeSinceUpdate = (thisUpdate - state.lastUpdateTime) / 1000;

	// calculate the I term
	state.I += Clamp(state.gain.I * error * timeSinceUpdate, state.outputMin, state.outputMax); // the JS impl has separate i-term min/max values

	// calculate the D term
	const dTerm = state.gain.D * ((processVariable - state.lastProcessVariable) / timeSinceUpdate); // note that discord thinks D might be unneeded and thus the gain could be 0

	// calculate the P term
	const pTerm = state.gain.P * error;

	// update the state
	state.lastProcessVariable = processVariable;
	state.lastUpdateTime      = thisUpdate;

	// calculate the new calculated control value
	return Clamp(pTerm + state.I - pTerm, state.outputMin, state.outputMax);
}


class PidController {
	#target: number;

	#gains         = {P: 1, I: 1, D: 0};
	#iTerm         = 0;
	#iTermLimits   = {min: -1000, max: 1000};
	#previousError = 0;
	#output        = {min: 0, max: 0, minThreshold: 0};

	constructor(target: number) {
		this.#target = target;
	}

	run(current: number): number {
		const error = current - this.#target;
		const pTerm = error * this.#gains.P;
		const dTerm = (error - this.#previousError) * this.#gains.D;

		// record the error so we can reference it the next time
		this.#previousError = error;

		this.#iTerm += (error * this.#gains.I);

		// clamp the I-term between the limits
		this.#iTerm = Math.min(this.#iTerm, this.#iTermLimits.max);
		this.#iTerm = Math.max(this.#iTerm, this.#iTermLimits.min);

		let output = pTerm + this.#iTerm + dTerm;

		if (output < this.#output.minThreshold) {
			return this.#output.min;
		} else if (output > this.#output.max) {
			return this.#output.max;
		} else {
			return output;
		}
	}
}
