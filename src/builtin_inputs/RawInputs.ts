import {BlenderFile} from "../api/content"
import {InstantInput} from "../api/flow"

export class ByteArrayInput extends InstantInput {
    private readonly bytes: Uint8Array
    private readonly filename: string | undefined

    constructor(bytes: Uint8Array, filename?: string) {
        super()
        this.bytes = bytes
        this.filename = filename
    }

    getLabel(): string {
        return this.filename ? `${this.filename} import (bytes)` : "(internal file import)"
    }

    produce(): BlenderFile {
        return {
            filename: this.filename,
            content: this.bytes
        }
    }
}

export class StringInput extends InstantInput {
    private readonly source: string
    private readonly filename: string | undefined

    constructor(source: string, filename?: string) {
        super()
        this.source = source
        this.filename = filename
    }

    getLabel(): string {
        return this.filename ? `${this.filename} import (string)` : "(internal file import)"
    }

    produce(): BlenderFile {
        return {
            filename: this.filename,
            content: new TextEncoder().encode(this.source)
        }
    }
}
