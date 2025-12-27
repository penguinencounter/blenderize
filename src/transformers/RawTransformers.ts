import {ProgressCallback, ActionPresentation} from "../api/action"
import {AfterTransformer, BeforeTransformer} from "../api/flow"
import {BlenderFile, RawFile, Tagged} from "../api/tagger"
import {fulfilled} from "../api/helpers"

export class AssumeTextTransformer implements BeforeTransformer<RawFile> {
    private readonly result: RawFile
    private promise?: Promise<RawFile>

    constructor(source: BlenderFile) {
        this.result = {
            content: source.content,
            tag: "always_text",
            isText: true, // totally real
            merge: source.merge,
            type: {rawFile: true}
        }
    }

    start(): Promise<RawFile> {
        if (this.promise) throw new Error("already started!")
        return this.promise = fulfilled(this.result)
    }

    getProgress(): number {
        return 0
    }

    getTotal(): number | null {
        return null
    }

    getPromise(): Promise<any> {
        return this.promise!
    }

    onProgress(_: ProgressCallback): void {
    }

    getPresentation(): ActionPresentation | null {
        return null
    }
}

export class NoAfterTransformer implements AfterTransformer<RawFile> {
    private readonly result: BlenderFile
    private promise?: Promise<BlenderFile>

    constructor(source: RawFile) {
        this.result = {
            merge: source.merge,
            filename: undefined,
            content: source.content
        }
    }

    start(): Promise<BlenderFile> {
        if (this.promise) throw new Error("already started!")
        return this.promise = fulfilled(this.result)
    }

    getProgress(): number {
        return 0
    }

    getTotal(): number | null {
        return null
    }

    getPromise(): Promise<BlenderFile> {
        return this.promise!
    }

    onProgress(_: ProgressCallback): void {
    }

    getPresentation(): ActionPresentation | null {
        return null
    }
}