import {InstantInput} from "../api/flow"
import {BlenderFile, MergeInfo} from "../api/tagger"

export class ByteArrayInput extends InstantInput {
    private readonly bytes: Uint8Array
    private readonly filename: string | undefined
    private readonly merge: MergeInfo

    constructor(bytes: Uint8Array, merge: MergeInfo, filename?: string) {
        super()
        this.bytes = bytes
        this.merge = merge
        this.filename = filename
    }

    produce(): BlenderFile {
        return {
            filename: this.filename,
            merge: this.merge,
            content: this.bytes
        }
    }
}

export class StringInput extends InstantInput {
    private readonly source: string
    private readonly filename: string | undefined
    private readonly merge: MergeInfo

    constructor(source: string, merge: MergeInfo, filename?: string) {
        super()
        this.source = source
        this.merge = merge
        this.filename = filename
    }

    getLabel(): string {
        return this.filename ? `${this.filename} import (string)` : "(internal file import)"
    }

    produce(): BlenderFile {
        return {
            filename: this.filename,
            merge: this.merge,
            content: new TextEncoder().encode(this.source)
        }
    }
}
