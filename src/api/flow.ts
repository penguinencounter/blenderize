import {Action, ActionPresentation, ProgressCallback} from "./action"
import {BlenderFile} from "./content"
import {fulfilled} from "./helpers"
import {Tagged} from "./tagger"

export interface BeforeTransformPlan<C1 extends Tagged> {
    matches(file: BlenderFile): boolean

    process(file: BlenderFile): BeforeTransformer<C1>
}

export interface MergePlan<C1 extends Tagged, C2 extends Tagged> {
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
        if (this.wrap) throw new Error("Already started!")
        return this.wrap = fulfilled(this.produce())
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

export interface BeforeTransformer<Out extends Tagged> extends Action<Out> {
}

export interface Merge<In extends Tagged, Out extends Tagged> extends Action<Out> {

}

export interface AfterTransformer<In extends Tagged> extends Action<BlenderFile> {
}
