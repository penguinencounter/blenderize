/**
 * Simple processing facilities and processors.
 */

import {completed, MaybeProgress} from "../progressible"
import {
    InputProvider,
    BeforeProcess,
    AfterProcess,
    TaskVisuals,
    regItemStaticValidator
} from "../struct/process"
import {getUniqueID} from "../globals"
import {TaggedBytes, wrapWithTag} from "../struct/TaggedBytes"

export class Uint8ArrayInput implements InputProvider, regItemStaticValidator<typeof Uint8ArrayInput> {
    private readonly content: Uint8Array

    constructor(content: Uint8Array) {
        this.content = content
    }

    getContent(): MaybeProgress<Uint8Array, number> {
        return completed(this.content)
    }

    visual(): TaskVisuals | null {
        return null
    }

    static typeID: string = "default/uint8_input"
    static kind = "InputProvider" as const
    id: number = getUniqueID()
}

export class StringInput implements InputProvider, regItemStaticValidator<typeof StringInput> {
    private readonly content: string

    constructor(content: string) {
        this.content = content
    }

    getContent(): MaybeProgress<Uint8Array, number> {
        return completed(new TextEncoder().encode(this.content))
    }

    visual(): TaskVisuals | null {
        return null
    }

    static typeID: string = "default/string_input"
    static kind = "InputProvider" as const
    id: number = getUniqueID()
}

export class NoOpBeforeProcess implements BeforeProcess<TaggedBytes>, regItemStaticValidator<typeof NoOpBeforeProcess> {
    pre(content: Uint8Array): MaybeProgress<TaggedBytes, number> {
        return completed(wrapWithTag(content))
    }

    visual(): TaskVisuals | null {
        return null
    }

    static typeID: string = "default/no_before"
    static kind = "BeforeProcess" as const
    id: number = getUniqueID()
}

export class NoOpAfterProcess implements AfterProcess<Uint8Array>, regItemStaticValidator<typeof NoOpAfterProcess> {
    post(result: Uint8Array<ArrayBufferLike>): MaybeProgress<Uint8Array, number> {
        return completed(result)
    }

    visual(): TaskVisuals | null {
        return null
    }

    static typeID: string = "default/no_after"
    static kind = "AfterProcess" as const
    id: number = getUniqueID()
}