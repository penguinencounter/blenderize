import {FetchInput} from "../inputs/BrowserInputs"
import {ActionPresentation} from "../api/action"
import {ProgressBar} from "./ProgressBar"

interface Card {
    label: HTMLElement,
    progressText: HTMLElement,
    progress: HTMLProgressElement
}

function produceCard(card: HTMLElement): Card {
    return {
        label: <HTMLElement>card.querySelector(".-label"),
        progressText: <HTMLElement>card.querySelector(".-progress-text"),
        progress: <HTMLProgressElement>card.querySelector(".-progress")
    }
}

declare global {
    interface Window {
        test: () => void
    }
}

function updatePresentation(present: ActionPresentation, card: Card) {
    card.label.innerText = present.label
    card.progressText.innerText = present.progressText || "..."
}

window.addEventListener("load", () => {
    const card = produceCard(document.querySelector(".card")!)
    const progressBar = new ProgressBar(document.querySelector(".progress")!)

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
})