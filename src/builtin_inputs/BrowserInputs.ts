// browser-only: uses Fetch or Files

import {ProgressCallback, ActionPresentation} from "../api/action"
import {BlenderFile} from "../api/content"
import {Input} from "../api/flow"
import {byteSI} from "../api/helpers"

export class FetchInput implements Input {
    private promise?: Promise<BlenderFile>
    private progressCallbacks: ProgressCallback[] = []
    private progress: number = 0
    private total: number | null = null
    private readonly url: string
    private readonly options?: RequestInit

    constructor(url: string, options?: RequestInit) {
        this.url = url
        this.options = options
    }

    private bump() {
        for (let progressCallback of this.progressCallbacks) {
            progressCallback(this.progress, this.total)
        }
    }

    private async inner(): Promise<BlenderFile> {
        const resp = await fetch(this.url, this.options)

        if (resp.status != 200) throw new Error(`Server responded with ${resp.status} ${resp.statusText}`)
        if (!resp.body) throw new Error(`Bodyless response`)

        const cl = resp.headers.get("Content-Length")
        this.total = cl === null ? cl : +cl
        this.bump()

        // Try to progress the response
        let chunks: Uint8Array[] = []
        let totalLength = 0
        const reader = resp.body.getReader()
        while (true) {
            const {done, value} = await reader.read()
            if (!done) {
                chunks.push(value!)
                totalLength += value!.length
                this.progress = totalLength
                this.bump()
            } else break
        }
        await reader.cancel()

        // Success!
        const combined = new Uint8Array(totalLength)
        let cursor = 0
        for (const chunk of chunks) {
            combined.set(chunk, cursor)
            cursor += chunk.length
        }

        // Also yeah probably should figure this out
        const url = new URL(this.url)
        const filename = url.pathname.split("/").at(-1)
        return {
            content: combined,
            filename: filename
        }
    }

    start(): Promise<BlenderFile> {
        if (this.promise) throw new Error("Already started!")
        this.promise = this.inner()
        return this.promise
    }

    getProgress(): number {
        return this.progress
    }

    getTotal(): number | null {
        return this.total
    }

    getPromise(): Promise<BlenderFile> {
        return this.promise!
    }

    onProgress(callback: ProgressCallback): void {
        this.progressCallbacks.push(callback)
        callback(this.progress, this.total)
    }

    getPresentation(): ActionPresentation | null {
        const label = `download ${this.url}`
        let progressText: string
        if (this.total === null) {
            progressText = `${byteSI(this.progress)} / ???`
        } else {
            progressText = `${byteSI(this.progress)} / ${byteSI(this.total)}`
        }
        return {
            label: label,
            progressText: progressText
        }
    }
}