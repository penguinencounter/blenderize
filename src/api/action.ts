export type ProgressCallback = (progress: number, total: number | null) => void

export interface ActionPresentation {
    label: string
    detail?: string

    /**
     * if unspecified, a default progress text will be built using getProgress and getTotal
     */
    progressText?: string
}

export interface Action<T> {
    start(): void

    getProgress(): number

    /**
     * @return `null` for indeterminate progress, total number of operations otherwise
     */
    getTotal(): number | null

    getPromise(): Promise<T>

    /**
     * Register for progress callbacks.
     * @param callback
     */
    onProgress(callback: ProgressCallback): void

    /**
     * @return presentation data, or null if this should not be displayed at all
     * (usually bad unless you know it's going to immediately finish)
     */
    getPresentation(): ActionPresentation | null
}
