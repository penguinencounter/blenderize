import {FetchInput} from "../inputs/BrowserInputs"
import {ActionPresentation} from "../api/action"
import {ProgressBar} from "./ProgressBar"
import {TextThreeWayMerge} from "../merge/merge_text"
import {RawFile} from "../api/tagger"
import {bytesToStr, isBinary, stringStats} from "../transformers/BuiltInTransformers"
import {registerBuiltins} from "../planners/BuiltInPlanners"
import {step, submit} from "../api/pool"
import {StringInput} from "../inputs/RawInputs"

interface Card {
    label: HTMLElement,
    progressText: HTMLElement,
    progress: HTMLProgressElement
}

function produceCard(card: HTMLElement): Card {
    return {
        label: <HTMLElement>card.querySelector(".-label"),
        progressText: <HTMLElement>card.querySelector(".-progress-text"),
        progress: <HTMLProgressElement>card.querySelector(".-progress"),
    }
}

declare global {
    interface Window {
        test: () => void
        test2: (a: string, b: string, c: string) => any
        test3: (a: string) => any
        bytesToStr: typeof bytesToStr
        stringStats: typeof stringStats
    }
}

function updatePresentation(present: ActionPresentation, card: Card) {
    card.label.innerText = present.label
    card.progressText.innerText = present.progressText || "..."
}

window.addEventListener("load", () => {
    const card = produceCard(document.querySelector(".card")!)
    const progressBar = new ProgressBar(document.querySelector(".progress")!)

    registerBuiltins()

    window.test = function () {
        progressBar.update(0.0, null)
        let task = new FetchInput(
            "https://cdn.modrinth.com/data/s9gIPDom/versions/caTeyUwg/figura-0.1.5b%2B1.21.4-neoforge-mc.jar",
            {
                key: "root",
                side: "base"
            }
        )
        task.onProgress((progress, total) => {
            progressBar.update(progress, total)
            const present = task.getPresentation()
            updatePresentation(present!, card)
        })
        task.start().then(file => {
            updatePresentation(task.getPresentation()!, card)
            progressBar.finish()
            console.log(file)
        }).catch(reason => {
            const present = task.getPresentation()!
            updatePresentation({
                label: present.label,
                progressText: `error: ${reason}`
            }, card)
            progressBar.error()
        })
    }

    function demoEncoding(label: string, array: Iterable<number>) {
        const ui8 = new Uint8Array(array)
        const s = bytesToStr(ui8)
        console.log(label, s)
        console.log(s && stringStats(s))
        console.log("OVERALL VERDICT", isBinary(ui8))
        console.log()
    }

    window.test3 = function () {
        const file1 = `
        hello
        world
        this
        is
        the
        text
        `
        const file2 = `
        hello
        world
        yet
        again
        here
        is
        the
        text
        `
        const file3 = `
        hello
        world
        this
        is
        the
        poem
        `
        const pad = new Uint32Array(1)
        crypto.getRandomValues(pad)
        const mk = `test3_merge_${pad[0]}`
        const inB = new StringInput(file1, {key: mk, side: "base"})
        const in1 = new StringInput(file2, {key: mk, side: 0})
        const in2 = new StringInput(file3, {key: mk, side: 1})
        submit(inB)
        submit(in1)
        submit(in2)
    }

    window.bytesToStr = bytesToStr

    window.setInterval(step, 100)
})