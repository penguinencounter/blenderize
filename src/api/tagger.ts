import {Input} from "./flow"

export type MergeInfo = {
    /**
     * All files in a merge have the same key.
     */
    key: string,
    /**
     * "base" for the base file, then an integer starting from 0 for each diff.
     */
    side: "base" | number
}

export interface Tagged {
    /**
     * Differentiates types of container.
     */
    readonly tag: string
    /**
     * Keeps containers for the same merge bundled together.
     */
    readonly merge: MergeInfo
}

export interface RawFile extends Tagged {
    rawFile: true
    isText: boolean
    content: Uint8Array
}

/**
 * Represents a filesystem of some kind. This could be an actual folder (ex. "open folder"), a container (ex. ZIP),
 * or some other kind of multi-file _thing_ (ex. git patch file)
 */
export interface Filesystem extends Tagged {
    filesystem: true

    hasFile(path: string): boolean
    getFile(path: string, merge: MergeInfo): Input
    allPaths(): string[]
}

export interface BlenderFile {
    filename?: string
    merge: MergeInfo
    content: Uint8Array
}
