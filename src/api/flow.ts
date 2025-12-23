import {Action, ActionPresentation, ProgressCallback} from "./action"
import {BlenderFile} from "./content"
import {fulfilled} from "./helpers"

export interface Plan<Container1, Container2> {
    // these are all PRODUCERS
    beforeTransform(): () => BeforeTransformer<Container1>

    merger(): () => Merge<Container1, Container2>

    afterTransform(): () => AfterTransformer<Container2>
}

export interface BeforeTransformPlan<C1> {
    matches(file: BlenderFile): boolean
    process(file: BlenderFile): BeforeTransformer<C1>
}

export interface MergePlan<C1, C2> {
    matches(base: BlenderFile, sides: BlenderFile[], sideContainers: any[]): boolean
    process(base: BlenderFile, sides: BlenderFile[], sideContainers: C1[]): Merge<C1, C2>
}

export interface Input extends Action<BlenderFile> {
}

/**
 * Input that completes immediately.
 */
export abstract class InstantInput implements Input {
    abstract produce(): BlenderFile

    protected wrap: Promise<BlenderFile> | undefined

    start(): Promise<BlenderFile> {
        this.wrap = fulfilled(this.produce())
        return this.wrap
    }

    getProgress(): number {
        return 0
    }

    getTotal(): number | null {
        return null
    }

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
}

export interface Merge<In, Out> extends Action<Out> {

}

export interface AfterTransformer<In> extends Action<Uint8Array> {
}
