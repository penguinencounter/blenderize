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

export type Tagged = {
    /**
     * Differentiates types of container.
     */
    readonly tag: string
    /**
     * Keeps containers for the same merge bundled together.
     */
    readonly merge: MergeInfo
}

