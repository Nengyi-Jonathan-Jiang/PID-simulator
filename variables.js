class Variable {
    /** @type {()=>void} */ _onchange = () => {};

    /** @type {number} */
    get value();

    /** @param {number} value */
    set value(value) {
        this.direct_set_value(value);
        this._onchange();
    }

    /** @type {number} */
    get step();

    /** @param {number} step */
    set step(step);

    /** @type {number} */
    get max();

    /** @param {number} max */
    set max(max);

    /** @type {number} */
    get min();

    /** @param {number} min */
    set min(min);

    /** @param {number} val */
    direct_set_value(val);

    /**
     * @param {number} val
     * @param {number} min
     * @param {number} max
     * @param {number} step
     * @returns {Variable}
     */
    static create(val, min, max, step){
        let value = val;
        return {
            get value() { return value },
            set value(val) { value = val; this.onchange() },

            get step() { return step },
            get min() { return min },
            get max() { return max },

            onchange() {}
        }
    }

    /**
     * @param {HTMLInputElement} slider
     * @returns {Variable}
     */
    static create_from_slider(slider){
        let res = /** @extends Variable */ new class extends Variable {
            get value() { return +slider.value }
            direct_set_value(val) { slider.value = `${val}`; this.onchange(); }

            get step() { return +slider.step }
            set step(step) { slider.step = `${step}` }
            get min() { return +slider.min }
            set min(min) { slider.min = `${min}` }
            get max() { return +slider.max }
            set max(max) { slider.max = `${max}` }

            onchange() {}
        }

        slider.onchange = _ => res.onchange();
        slider.oninput = _ => res.onchange();

        return res;
    }

    /**
     * @param {HTMLInputElement} slider
     * @returns {Variable}
     */
    static create_from_slider(slider){
        let res = /** @implements Variable */{
            get value() { return +slider.value },
            set value(val) { slider.value = val; this.onchange(); },

            get step() { return +slider.step },
            set step(step) { slider.step = step },
            get min() { return +slider.min },
            set min(min) { slider.min = min },
            get max() { return +slider.max },
            set max(max) { slider.max = max },

            onchange() {}
        }

        slider.onchange = _ => res.onchange();
        slider.oninput = _ => res.onchange();

        return res;
    }

    /**
     * Copies min, max, and step between variables
     * @param {Variable} from
     * @param {Variable} to
     */
    static copyProperties(from, to){
        to.min = from.min;
        to.max = from.max;
        to.step = from.step;
    }

    /**
     * Links two variables together and copies min/max/step from var1 to var2
     * @param {Variable} var1
     * @param {Variable} var2
     */
    static link(var1, var2) {
        var1._onchange = _ => { var2.direct_set_value(var1.value) };
        var2._onchange = _ => { var1.direct_set_value(var2.value) };

        var2._onchange = input.oninput = _ => {
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
}