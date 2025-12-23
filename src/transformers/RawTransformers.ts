import {ProgressCallback, ActionPresentation} from "../api/action"
import {AfterTransformer, BeforeTransformer} from "../api/flow"
import {BlenderFile} from "../api/content"
import {Tagged} from "../api/tagger"
import {fulfilled} from "../api/helpers"

export interface TaggedRawBytes extends Tagged {
    readonly content: Uint8Array
    readonly tag: "raw_bytes"
}

class NoBeforeTransformer implements BeforeTransformer<TaggedRawBytes> {
    private readonly result: TaggedRawBytes
    private promise?: Promise<TaggedRawBytes>

    constructor(source: BlenderFile) {
        this.result = {
            content: source.content,
            tag: "raw_bytes",
            merge: source.merge
        }
    }

    start(): Promise<TaggedRawBytes> {
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

class NoAfterTransformer implements AfterTransformer<TaggedRawBytes> {
    private readonly result: BlenderFile
    private promise?: Promise<BlenderFile>

    constructor(source: TaggedRawBytes) {
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