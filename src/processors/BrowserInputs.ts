import {InputProvider, TaskVisuals} from "../struct/process"
import {MaybeProgress, ProgressibleBuilder} from "../progressible"
import {getUniqueID} from "../globals"

export class BrowserFetchInput implements InputProvider {
    url: string
    options: RequestInit | undefined
    id: number = getUniqueID()

    constructor(url: string, options: RequestInit | undefined) {
        this.url = url
        this.options = options
    }

    visual(): TaskVisuals | null {
        throw new Error("Method not implemented.")
    }

    getContent(): MaybeProgress<Uint8Array, number> {
        return new ProgressibleBuilder<Uint8Array, number>()
            .use(it => fetch(this.url, this.options).then(resp => {
                const expectedLen = resp.headers.get("Content-Length")
                it.updateTotal(expectedLen == null ? null : +expectedLen)

                const reader = resp.body!.getReader()
                let total = 0
                let chunks: Uint8Array[] = []

                const wrap = async () => {
                    while (true) {
                        const {done, value} = await reader.read()
                        if (!done) {
                            chunks.push(value!)
                            total += value!.length
                            it.updateProgress(total)
                        } else break
                    }
                    const body = new Uint8Array(total)
                    let pos = 0
                    for (let chunk of chunks) {
                        body.set(chunk, pos)
                        pos += chunk.length
                    }

                    return body
                }
                return wrap()
            })).build()
    }
}

export class FileReaderInput implements InputProvider {
    private around: File
    id: number = getUniqueID()

    constructor(around: File) {
        this.around = around
    }

    visual(): TaskVisuals | null {
        throw new Error("Method not implemented.")
    }

    getContent(): MaybeProgress<Uint8Array, number> {
        return new ProgressibleBuilder<Uint8Array, number>()
            .use(it => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.readAsArrayBuffer(this.around)
                    reader.addEventListener("progress", ev => {
                        it.updateTotal(ev.total)
                        it.updateProgress(ev.loaded)
                    })
                    reader.addEventListener("load", _ => {
                        resolve(new Uint8Array(<ArrayBuffer>(reader.result)))
                    })
                    reader.addEventListener("abort", _ => {
                        reject(`File read aborted`)
                    })
                    reader.addEventListener("error", _ => {
                        reject(`File read error`)
                    })
                })
            }).build()
    }
}
