import {Tagged} from "../typing/helpers"

export interface TaggedBytes extends Tagged {
    readonly type: "raw_bytes"
    bytes: Uint8Array
}

export function wrapWithTag(bytes: Uint8Array): TaggedBytes {
    return {
        type: "raw_bytes" as const,
        bytes: bytes
    }
}