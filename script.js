const clamp = (x, min, max) => x < min ? min : x > max ? max : x;
const clamp_abs = (x, max) => clamp(x, -max, max);

class PID {
	constructor(kp, ki, kd) {
		this.kp = kp;
		this.ki = ki;
		this.kd = kd;

		this.setpoint = 0;
		this.previous_error = 0;
		this.accumulated_error = 0;
	}

	calculate(currentPoint, time_step) {
		let error_p = this.setpoint - currentPoint;

		let error_i = this.accumulated_error;
		let error_d = clamp_abs((error_p - this.previous_error) / time_step, 100);

		let result = this.kp * error_p + this.kd * error_d + this.ki * error_i;

		this.previous_error = error_p;

		if (this.ki) {
			this.accumulated_error += error_p;
			this.accumulated_error = clamp_abs(this.accumulated_error, 1 / this.ki);
		}
		else this.accumulated_error = 0;

		return result;
	}
}

class SimpleMotor {
	constructor(friction, mass) {
		this.friction = friction;
		this.mass = mass;

		this.position = 0;
		this.velocity = 0;
		this.acceleration = 0;
	}

	onTick(force, time_step = 1) {
		// This method uses Verlet integration to simulate a more accurate model

		// Calculate friction
		let frictional_acceleration = -this.friction * Math.sign(this.velocity) / this.mass;
		let applied_acceleration = force / this.mass;

		let new_position =
			this.position +
			this.velocity * time_step +
			0.5 * this.acceleration * time_step ** 2;

		let new_velocity_with_friction =
			this.velocity +
			(this.acceleration + applied_acceleration + frictional_acceleration) / 2 / this.mass * time_step;
		let new_velocity_without_friction =
			this.velocity +
			(this.acceleration + applied_acceleration) / 2 * time_step;

		// If applying friction reverses the direction of motion, then set velocity to zero
		let new_velocity = new_velocity_with_friction * new_velocity_without_friction < 0 ? 0 : new_velocity_with_friction;

		// Update values, clamp to prevent overflow
		this.position = clamp_abs(new_position, 2.2);
		this.velocity = clamp_abs(new_velocity, 10000);
		this.acceleration = force;
	}
}


let motor = new SimpleMotor(0.01, 0.01);
let pid = new PID(0, 0, 0);
let points = new Array(500).fill(0);
let setPoints = new Array(500).fill(0);
let errors = new Array(500).fill(0);

let canvas = document.getElementById("display-canvas");
let ctx = canvas.getContext('2d');

function line(i, y1, y2) {
	ctx.beginPath();
	ctx.moveTo(i * 2, 200 - y1 * 390 / 4);
	ctx.lineTo(i * 2 + 2, 200 - y2 * 390 / 4);
	ctx.closePath();
	ctx.stroke();
}

function drawPoints() {
	ctx.clearRect(0, 0, 1000, 400);

	ctx.strokeStyle = "#000";
	ctx.beginPath();
	ctx.moveTo(0, 200);
	ctx.lineTo(1000, 200);
	ctx.closePath();
	ctx.stroke();

	ctx.strokeStyle = "#FAA";
	for (let i = 1; i < 500; i++) {
		line(i - 1, errors[i - 1], errors[i]);
	}

	ctx.strokeStyle = "#DDD";
	for (let i = 1; i < 500; i++) {
		line(i - 1, setPoints[i - 1], setPoints[i]);
	}

	ctx.strokeStyle = "#28F";
	for (let i = 1; i < 500; i++) {
		line(i - 1, points[i - 1], points[i]);
	}
}

function link(variable, input) {
	input.setAttribute("min", variable.min);
	input.setAttribute("max", variable.max);
	input.setAttribute("value", variable.value);
	input.setAttribute("step", variable.step);
	variable.onchange = variable.oninput = _ => { input.value = variable.value };
	input.onchange = input.oninput = _ => {
		if (isNaN(+input.value)) return;
		if (+input.value > +variable.max || +input.value < +variable.min) {
			input.value = Math.max(Math.min(+input.value, +variable.max), +variable.min);
		}
		variable.value = input.value;
	};

	return {
		get value() { return +variable.value },
		set value(val) { variable.value = val }
	}
}

function create_variable(val, min, max, displayStep){
	let value = val;
	return {
		get value() { return value },
		set value(val) { value = val; this.onchange() },

		get step() { return displayStep },
		get min() { return min },
		get max() { return max },

		onchange() {}
	}
}

/** @param {HTMLInputElement} slider */
function create_ref_from_slider(slider){
	let res = {
		get value() { return slider.value },
		set value(val) { slider.value = val; this.onchange(); },

		get step() { return slider.step },
		get min() { return slider.min },
		get max() { return slider.max },

		onchange() {}
	}

	slider.onchange = _ => res.onchange();

	return res;
}

let kp_input = link(create_ref_from_slider(document.getElementById("slider-kp")), document.getElementById("input-kp"));
let ki_input = link(document.getElementById("slider-ki"), document.getElementById("input-ki"));
let kd_input = link(document.getElementById("slider-kd"), document.getElementById("input-kd"));
let MSE_ref = create_variable(0, 0, 0, 0)

let setpoint_input = document.getElementById("slider-setpoint");

let pauseButton = document.getElementById("running");

const TIME_STEP = 0.016;

function frame() {
	drawPoints();

	if (pauseButton.checked) {
		requestAnimationFrame(frame);
		return;
	}

	pid.kp = kp_input.value;
	pid.ki = ki_input.value;
	pid.kd = kd_input.value;

	motor.onTick(pid.calculate(motor.position, TIME_STEP), TIME_STEP);

	setPoints.shift();
	setPoints.push(pid.setpoint = +setpoint_input.value);

	points.shift();
	points.push(+motor.position);

	errors.shift();
	errors.push(points[499] - setPoints[499]);

	requestAnimationFrame(frame);
}

frame();