import {FetchInput} from "../builtin_inputs/BrowserInputs"
import {ActionPresentation} from "../api/action"

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

    window.test = function () {
        let task = new FetchInput("https://penguinencounter.github.io/mvn/snapshots/org/figuramc/figura-fabric/0.1.5%2B1.21.8-SNAPSHOT/figura-fabric-0.1.5%2B1.21.8-20251030.060822-1.jar")
        task.onProgress((progress, total) => {
            if (total === null) {
                card.progress.removeAttribute("value")
            } else {
                card.progress.max = total
                card.progress.value = progress
            }
            const present = task.getPresentation()
            updatePresentation(present!, card)
        })
        task.start()
        task.getPromise().then(file => {
            updatePresentation(task.getPresentation()!, card)
            card.progress.max = 1
            card.progress.value = 1
            console.log(file)
        })
    }
})