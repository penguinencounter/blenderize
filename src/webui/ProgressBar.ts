const WRAPPER_CLASS = "progress"
const BAR_CLASS = "-progress-slider"
const INDETERMINATE_CLASS = "-indeterminate"
const FINISHED_CLASS = "-finished"
const ERROR_CLASS = "-error"
const VALUE_PROPERTY = "--value"
const MAX_PROPERTY = "--max"

export class ProgressBar {

    public readonly wrapper: HTMLElement
    public value = 0.0
    public max: number | null = 1.0

    static create(): ProgressBar {
        const wrapper = document.createElement("div")
        wrapper.classList.add(WRAPPER_CLASS)
        wrapper.role = "progressbar"
        const bar = document.createElement("div")
        bar.classList.add(BAR_CLASS)
        wrapper.appendChild(bar)
        return new ProgressBar(wrapper)
    }

    constructor(wrapper: HTMLElement) {
        this.wrapper = wrapper
        wrapper.ariaValueMin = "0"
        this.wrapper.classList.remove(FINISHED_CLASS)
        this.wrapper.classList.remove(ERROR_CLASS)
        this.push()
    }

    private push() {
        if (this.max === null) {
            this.wrapper.classList.add(INDETERMINATE_CLASS)
            this.wrapper.removeAttribute("aria-valuenow")
        } else {
            this.wrapper.classList.remove(INDETERMINATE_CLASS)
            this.wrapper.ariaValueMax = this.max.toString()
            this.wrapper.ariaValueNow = this.value.toString()
            this.wrapper.style.setProperty(MAX_PROPERTY, this.max.toString())
            this.wrapper.style.setProperty(VALUE_PROPERTY, this.value.toString())
        }
    }

    finish() {
        this.value = this.max || 1.0
        if (this.max === null) this.max = 1.0
        this.wrapper.classList.add(FINISHED_CLASS)
        this.push()
    }

    error() {
        this.wrapper.classList.add(ERROR_CLASS)
    }

    update(progress: number, max: number | null) {
        this.value = progress
        this.max = max
        this.push()
    }
}