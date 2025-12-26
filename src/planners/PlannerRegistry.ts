import {AfterTransformPlan, BeforeTransformPlan, MergePlan} from "../api/flow"

let baked = false
const before = new Map<string, BeforeTransformPlan<any>>()
const merge = new Map<string, MergePlan<any, any>>()
const after = new Map<string, AfterTransformPlan<any>>()

// TODO: Unified entrypoint
export function registerBefore(plan: BeforeTransformPlan<any>) {
    const result = before.get(plan.id)
    if (result && result !== plan) throw new Error(`registerBefore: id ${plan.id} conflict (existing is ${result}, incoming is ${plan})`)
    if (!result) before.set(plan.id, plan)
}

export function registerMerge(plan: MergePlan<any, any>) {
    const result = merge.get(plan.id)
    if (result && result !== plan) throw new Error(`registerMerge: id ${plan.id} conflict (existing is ${result}, incoming is ${plan})`)
    if (!result) merge.set(plan.id, plan)
}

export function registerAfter(plan: AfterTransformPlan<any>) {
    const result = after.get(plan.id)
    if (result && result !== plan) throw new Error(`registerAfter: id ${plan.id} conflict (existing is ${result}, incoming is ${plan})`)
    if (!result) after.set(plan.id, plan)
}