// blenderize: the 3 way merge tool for, like, zips and stuff

/*
pipeline overview:
input -> before -> merge -> after -> output
 */

import {MaybeProgress} from "./progressible";

export interface InputProvider {
    getContent(): MaybeProgress<Uint8Array, number>
}

export interface BeforeProcess<Pack> {
    pre(content: Uint8Array): MaybeProgress<Pack, number>
}

export interface MergeProcess<InPack, OutPack> {
    merge(base: InPack | null, leaf1: InPack | null, leaf2: InPack | null): MaybeProgress<OutPack, number>
}

export interface AfterProcess<OutPack> {
    post(result: OutPack): MaybeProgress<Uint8Array, number>
}
