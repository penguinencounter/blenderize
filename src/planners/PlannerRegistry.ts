import {
    AfterTransformer,
    AfterTransformPlan,
    BeforeTransformer,
    BeforeTransformPlan, ConflictHandler,
    Merge,
    MergePlan
} from "../api/flow"
import {BlenderFile, Tagged} from "../api/tagger"

let baked = false
const before = new Map<string, BeforeTransformPlan<Tagged>>()
const merge = new Map<string, MergePlan<Tagged, Tagged>>()
const conflict = new Map<string, ConflictHandler<Tagged, Tagged>>()
const after = new Map<string, AfterTransformPlan<Tagged>>()

const sortedBefore: BeforeTransformPlan<Tagged>[] = []
const sortedMerge: MergePlan<Tagged, Tagged>[] = []
const sortedConflict: ConflictHandler<Tagged, Tagged>[] = []
const sortedAfter: AfterTransformPlan<Tagged>[] = []

export function registerBefore(plan: BeforeTransformPlan<Tagged>) {
    const result = before.get(plan.id)
    if (result && result !== plan) throw new Error(`registerBefore: id ${plan.id} conflict (existing is ${result}, incoming is ${plan})`)
    if (!result) {
        before.set(plan.id, plan)
        baked = false
    }
}

export function registerMerge(plan: MergePlan<Tagged, Tagged>) {
    const result = merge.get(plan.id)
    if (result && result !== plan) throw new Error(`registerMerge: id ${plan.id} conflict (existing is ${result}, incoming is ${plan})`)
    if (!result) {
        merge.set(plan.id, plan)
        baked = false
    }
}

export function registerConflictHandler(handler: ConflictHandler<Tagged, Tagged>) {
    const result = conflict.get(handler.id)
    if (result && result !== handler) throw new Error(`registerConflictHandler: id ${handler.id} conflict (existing is ${result}, incoming is ${handler})`)
    if (!result) {
        conflict.set(handler.id, handler)
        baked = false
    }
}

export function registerAfter(plan: AfterTransformPlan<Tagged>) {
    const result = after.get(plan.id)
    if (result && result !== plan) throw new Error(`registerAfter: id ${plan.id} conflict (existing is ${result}, incoming is ${plan})`)
    if (!result) {
        after.set(plan.id, plan)
        baked = false
    }
}

function bakeIt() {
    sortedBefore.length = 0
    sortedMerge.length = 0
    sortedConflict.length = 0
    sortedAfter.length = 0
    before.forEach(value => sortedBefore.push(value))
    merge.forEach(value => sortedMerge.push(value))
    conflict.forEach(value => sortedConflict.push(value))
    after.forEach(value => sortedAfter.push(value))
    sortedBefore.sort((a, b) => a.priority - b.priority)
    sortedMerge.sort((a, b) => a.priority - b.priority)
    sortedConflict.sort((a, b) => a.priority - b.priority)
    sortedAfter.sort((a, b) => a.priority - b.priority)
    baked = true
}

function bakeIfNeeded() {
    if (!baked) bakeIt()
}

function die(message: string): never {
    throw new TypeError(message)
}

export function findBefore(file: BlenderFile): BeforeTransformer<Tagged> {
    bakeIfNeeded()
    return (
        sortedBefore.find(it => it.matches(file))
        ?? die("No suitable plan found. (You might want to register a fallback planner, like GuessTextOrBinary.)")
    ).process(file)
}

export function findMerge(baseFile: BlenderFile, sideFiles: BlenderFile[], baseContainer: Tagged, sideContainers: Tagged[]): Merge<Tagged, Tagged> {
    bakeIfNeeded()
    return (
        sortedMerge.find(it => it.matches(baseFile, sideFiles, baseContainer, sideContainers))
        ?? die("No suitable merge plan found.")
    ).process(baseFile, sideFiles, baseContainer, sideContainers)
}

export function findConflict(conflict: Tagged): Promise<Tagged> {
    bakeIfNeeded()
    return (
        sortedConflict.find(it => it.matches(conflict))
        ?? die("No conflict handlers are installed that can handle this conflict.")
    ).process(conflict)
}

export function findAfter(result: Tagged): AfterTransformer<Tagged> {
    bakeIfNeeded()
    return (
        sortedAfter.find(it => it.matches(result))
        ?? die("No suitable postprocess plan found. (If this is a regular file, you might want to register a fallback planner like FileOutput.)")
    ).process(result)
}