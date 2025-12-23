// blenderize: the 3 way merge tool for, like, zips and stuff

/*
pipeline overview:
input -> before -> merge -> after -> output
 */

import {MaybeProgress} from "../progressible"
import {companion, Static, Tagged} from "../typing/helpers"

export type RegistryType = "InputProvider" | "BeforeProcess" | "MergeProcess" | "AfterProcess"

export interface TaskVisuals {
    label: string
    detail: string
}

export interface RegistryItem<T> extends Static<T> {
    typeID: string
    kind: RegistryType
    understands: string[]
}

// hint: use 'as const' to force exact typing on string fields
type _validateKindField<T extends Static<_C>, _C = InstanceType<T>> =
    _C extends InputProvider ? { kind: "InputProvider" } :
    _C extends BeforeProcess<any> ? { kind: "BeforeProcess" } :
    _C extends MergeProcess<any, any> ? { kind: "MergeProcess" } :
    _C extends AfterProcess<any> ? { kind: "AfterProcess" } :
    never

export type regItemStaticValidator<typeofT extends RegistryItem<any> & _T, _T = typeofT extends _validateKindField<typeofT> ? unknown : never> = any

export interface Task {
    visual(): TaskVisuals | null

    id: number
}

export interface InputProvider extends Task {
    getContent(): MaybeProgress<Uint8Array, number>
}

export interface BeforeProcess<InPack extends Tagged> extends Task {
    understands: string[]

    pre(content: Uint8Array): MaybeProgress<InPack, number>
}

export interface MergeProcess<InPack extends Tagged, OutPack extends Tagged> extends Task {
    merge(base: InPack | null, leaf1: InPack | null, leaf2: InPack | null): MaybeProgress<OutPack, number>
}

export interface AfterProcess<OutPack extends Tagged> extends Task {
    post(result: OutPack): MaybeProgress<Uint8Array, number>
}
