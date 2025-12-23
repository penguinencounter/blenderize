import {Action, ActionPresentation, ProgressCallback} from "./action"
import {BlenderFile} from "./content"
import {fulfilled} from "./helpers"

export interface Plan<Container1, Container2> {
    // these are all PRODUCERS
    beforeTransform(): () => BeforeTransformer<Container1>

    merger(): () => Merge<Container1, Container2>

    afterTransform(): () => AfterTransformer<Container2>
}

export interface Planner<C1, C2> {
    getPlan(file: BlenderFile): Plan<C1, C2> | null
}

export interface Input extends Action<BlenderFile> {
}

/**
 * Input that completes immediately.
 */
export abstract class InstantInput implements Input {
    abstract produce(): BlenderFile

    protected wrap: Promise<BlenderFile> | undefined

    start(): void {
        this.wrap = fulfilled(this.produce())
    }

    getProgress(): number {
        return 0
    }

    getTotal(): number | null {
        return null
    }

    abstract getLabel(): string

    getPromise(): Promise<BlenderFile> {
        return this.wrap!
    }

    onProgress(_: ProgressCallback): void {
    }

    getPresentation(): ActionPresentation | null {
        return null
    }
}

export interface BeforeTransformer<Out> extends Action<Out> {
    new(source: BlenderFile): ThisType<this>
}

export interface Merge<In, Out> extends Action<Out> {
    new(base: In, diff1: In, diff2: In): ThisType<this>
}

export interface AfterTransformer<In> extends Action<Uint8Array> {
    new(source: In): ThisType<this>
}
