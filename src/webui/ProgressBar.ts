const key = (() => {
    const x = new Uint32Array(1)
    crypto.getRandomValues(x)
    return x[0].toString(16).padStart(8, "0")
})()

const INDETERMINATE_CLASS = "-indeterminate"
const FINISHED_CLASS = "-finished"
const ERROR_CLASS = "-error"
const VALUE_PROPERTY = `--progressbar-${key}-value`
const MAX_PROPERTY = `--progressbar-${key}-max`

function flattenTemplateCallback(targs: TemplateStringsArray, ...args: any[]) {
    return targs.reduce(
        (prev, current, idx) =>
            prev + current + (idx < args.length ? args[idx] : "").toString(),
        ""
    )
}

function html(targs: TemplateStringsArray, ...args: any[]) {
    const template = document.createElement("template")
    template.innerHTML = flattenTemplateCallback(targs, ...args)
    return template.content
}

function css(targs: TemplateStringsArray, ...args: any[]) {
    const stylesheet = new CSSStyleSheet()
    stylesheet.replaceSync(flattenTemplateCallback(targs, ...args))
    return stylesheet
}

const PROGRESS_BAR_STYLESHEET = css`
    #progress {
        border-radius: .5rem;
        background: #444;
        position: relative;
        overflow: clip;
        transition: ${VALUE_PROPERTY} ease-out 0.25s, ${MAX_PROPERTY} ease-out 0.25s;
        height: 100%;

        & > #slider {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            right: calc(100% - (var(${VALUE_PROPERTY}) / var(${MAX_PROPERTY})) * 100%);
            background: #b8f;
        }
    }

    #progress.-indeterminate > #slider {
        background: repeating-linear-gradient(-45deg, #86a 0, #86a 0.5rem, #437 0.5rem, #437 1rem);
        inset: 0;
    }

    #progress.-error > #slider {
        background: repeating-linear-gradient(-45deg, #d44 0, #d44 0.5rem, #b22 0.5rem, #b22 1rem);
        inset: 0;
    }
`

const PROGRESS_BAR_TEMPLATE = html`
    <div id="progress" role="progressbar" aria-valuemin="0" aria-valuemax="0">
        <div id="slider"></div>
    </div>
`

export class ProgressBar extends HTMLElement {
    public wrapper?: HTMLElement
    public value = 0.0
    public max: number | null = 1.0

    constructor() {
        super();
    }

    connectedCallback() {
        const shadow = this.attachShadow({mode: "open"})
        shadow.appendChild(document.importNode(PROGRESS_BAR_TEMPLATE, true))
        shadow.adoptedStyleSheets.push(PROGRESS_BAR_STYLESHEET)

        this.wrapper = shadow.getElementById("progress") as HTMLElement

        this.wrapper.ariaValueMin = "0"
        this.wrapper.classList.remove(FINISHED_CLASS)
        this.wrapper.classList.remove(ERROR_CLASS)
        this.push()
    }

    private push() {
        if (!this.wrapper) throw new Error("Too early (element not initialized)")
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
        if (!this.wrapper) throw new Error("Too early (element not initialized)")
        this.value = this.max || 1.0
        if (this.max === null) this.max = 1.0
        this.wrapper.classList.add(FINISHED_CLASS)
        this.push()
    }

    error() {
        if (!this.wrapper) throw new Error("Too early (element not initialized)")
        this.wrapper.classList.add(ERROR_CLASS)
    }

    update(progress: number, max: number | null) {
        this.value = progress
        this.max = max
        this.push()
    }
}

let isAlreadySetUp = false
export function setup() {
    if (isAlreadySetUp) return
    isAlreadySetUp = true
    customElements.define("bz-progress-bar", ProgressBar)
    CSS.registerProperty({
        name: VALUE_PROPERTY,
        syntax: "<number>",
        inherits: true,
        initialValue: "0"
    })
    CSS.registerProperty({
        name: MAX_PROPERTY,
        syntax: "<number>",
        inherits: true,
        initialValue: "1"
    })
}

setup()