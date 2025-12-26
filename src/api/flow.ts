import {Action, ActionPresentation, ProgressCallback} from "./action"
import {fulfilled} from "./helpers"
import {BlenderFile, Tagged} from "./tagger"

export interface Planner {
    /**
     * who are you?
     */
    id: string

    /**
     * higher priority first
     */
    priority: number
}

export interface BeforeTransformPlan<C1 extends Tagged> extends Planner {
    matches(file: BlenderFile): boolean

    process(file: BlenderFile): BeforeTransformer<C1>
}

export interface MergePlan<C1 extends Tagged, C2 extends Tagged> extends Planner {
    matches(base: BlenderFile, sides: BlenderFile[], baseContainer: Tagged, sideContainers: Tagged[]): boolean

    process(base: BlenderFile, sides: BlenderFile[], baseContainer: C1, sideContainers: C1[]): Merge<C1, C2>
}

export interface AfterTransformPlan<C2 extends Tagged> extends Planner {
    matches(result: Tagged): boolean

    process(result: C2): AfterTransformer<C2>
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
