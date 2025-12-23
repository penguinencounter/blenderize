type ProgressCallback<P> = (progress: P | null, total: P | null) => void

export type MaybeProgress<T, P> = Progressible<T, P> | Promise<T>

export interface Progressible<FinishT, ProgressT> {
    complete: Promise<FinishT>

    onProgress(callback: ProgressCallback<ProgressT>): Progressible<FinishT, ProgressT>
}

export function completed<T>(result: T): Progressible<T, never> {
    return new class implements Progressible<T, never> {
        complete: Promise<T> = new Promise<T>(
            (resolve, _) => resolve(result)
        )

        onProgress(callback: ProgressCallback<never>): Progressible<T, never> {
            return this
        }
    }
}

class ProgressibleImpl<FinishT, ProgressT> implements Progressible<FinishT, ProgressT> {
    public complete: Promise<FinishT>
    private progressListeners: ProgressCallback<ProgressT>[] = []
    private total: ProgressT | null
    private progress: ProgressT | null

    static numeric<FinishT>(around: Promise<FinishT>, total: number): ProgressibleImpl<FinishT, number> {
        return new ProgressibleImpl<FinishT, number>(around, total)
    }

    static numericIndeterminate<FinishT>(around: Promise<FinishT>): ProgressibleImpl<FinishT, number> {
        return new ProgressibleImpl<FinishT, number>(around, null)
    }

    constructor(around: Promise<FinishT>, initialTotal: ProgressT | null) {
        this.complete = around
        this.total = initialTotal
        this.progress = null
    }

    onProgress(callback: ProgressCallback<ProgressT>): ProgressibleImpl<FinishT, ProgressT> {
        this.progressListeners.push(callback)
        return this
    }

    private pushUpdate() {
        this.progressListeners.forEach(it => it(this.progress, this.total))
    }

    public updateTotal(total: ProgressT | null) {
        this.total = total
        this.pushUpdate()
    }

    public updateProgress(progress: ProgressT | null): void {
        this.progress = progress
        this.pushUpdate()
    }
}

export default ProgressibleImpl

// bootstrapping for Progressible objects because they love to be self-referential
export class ProgressibleBuilder<T, P> {
    private around: Promise<T> | undefined
    private total: P | null = null
    private progress: P | null = null

    private result: ProgressibleImpl<T, P> | undefined

    public use(block: (it: ProgressibleBuilder<T, P>) => Promise<T>): ProgressibleBuilder<T, P> {
        if (this.around === undefined) throw new Error("this is already initialized!")
        this.around = block(this)
        return this
    }

    public updateTotal(total: P | null) {
        if (this.result) this.result.updateTotal(total)
        else this.total = total
    }

    public updateProgress(progress: P | null) {
        if (this.result) this.result.updateProgress(progress)
        else this.progress = progress
    }

    public build(): ProgressibleImpl<T, P> {
        this.result = new ProgressibleImpl<T, P>(this.around!, this.total)
        if (this.progress !== null) this.result.updateProgress(this.progress)
        return this.result
    }
}
