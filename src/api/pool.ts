// the heart. maybe not the soul but definitely the heart

import {BlenderFile, Tagged} from "./tagger"
import {AfterTransformer, BeforeTransformer, Input, Merge} from "./flow"
import {findAfter, findBefore, findMerge} from "../planners/PlannerRegistry"

interface MergeQueueItem {
    file: BlenderFile
    container: Tagged
}

const mergeMembers = new Map<string, number>()

const inputs = new Set<Input>()
const inputWaitingRoom: BlenderFile[] = []
const beforeTransformers = new Set<BeforeTransformer<Tagged>>()
let mergeWaitingRoom: MergeQueueItem[] = []
const merges = new Set<Merge<Tagged, Tagged>>()
const afterWaitingRoom: Tagged[] = []
const afters = new Set<AfterTransformer<Tagged>>()
const outputWaitingRoom: BlenderFile[] = []


function die(message: string): never {
    throw new Error(message)
}


export function submit(input: Input) {
    inputs.add(input)
    console.log(`Starting input`, input)
    input.start().then(file => {
        inputWaitingRoom.push(file)
        inputs.delete(input)
    })
}


export function stepInputs() {
    inputWaitingRoom.forEach(file => {
        const tx = findBefore(file)
        beforeTransformers.add(tx)
        mergeMembers.set(file.merge.key, (mergeMembers.get(file.merge.key) ?? 0) + 1)
        console.log(`Starting before transform ${file.merge.key} ${file.merge.side}`, tx)
        tx.start().then(container => {
            beforeTransformers.delete(tx)
            mergeWaitingRoom.push({
                file: file,
                container: container
            })
        })
    })
    inputWaitingRoom.length = 0
}

function getGoingWithTheMergeAlready(items: MergeQueueItem[]) {
    mergeWaitingRoom = mergeWaitingRoom.filter(it => !items.includes(it))

    const bases = items.filter(it => it.container.merge.side === "base")
    if (bases.length !== 1) die(`wrong number of 'base' sides: ${bases.length} (key ${items[0]?.container?.merge?.key ?? 'n/a'})`)
    const base = bases[0]
    const sides = items
        .filter(it => it.container.merge.side !== "base")
        .sort((a, b) => <number>a.container.merge.side - <number>b.container.merge.side)
    const sideFiles = sides.map(it => it.file)
    const sideContainers = sides.map(it => it.container)

    const tx = findMerge(base.file, sideFiles, base.container, sideContainers)
    merges.add(tx)
    console.log(`Starting merge ${base.file.merge.key} (${sideContainers.length} sides + base)`, tx)
    tx.start().then(container => {
        merges.delete(tx)
        afterWaitingRoom.push(container)
    })
}

export function stepMerges() {
    const presence = new Map<string, MergeQueueItem[]>()
    mergeWaitingRoom.forEach(queueItem => {
        const key = queueItem.container.merge.key
        if (key !== queueItem.file.merge.key)
            die(`the before transformer assigned to merge ${key} / side ${queueItem.container.merge.side} `
                + `...or perhaps ${queueItem.file.merge.key} / ${queueItem.file.merge.side}? bait and switched us D:`)

        const queue = presence.get(key) ?? []
        queue.push(queueItem)
        presence.set(key, queue)

        const checkins = queue.length
        const checkouts = mergeMembers.get(key) ?? die(`so something broke and the merge key ${key} doesn't exist...?`)
        if (checkins > checkouts) die(`more completed tasks than started tasks? (${key}: ${checkins} checkins vs ${checkouts} checkouts)`)
        if (checkins === checkouts) {
            // let's get cooking!
            mergeMembers.delete(key)
            getGoingWithTheMergeAlready(queue)
        }
    })
}

export function stepOutputs() {
    afterWaitingRoom.forEach(container => {
        const tx = findAfter(container)
        afters.add(tx)
        console.log(`Starting after transform ${container.merge.key}`, tx)
        tx.start().then(file => {
            afters.delete(tx)
            outputWaitingRoom.push(file)
            console.log(`Completed ${container.merge.key}`, file)
        })
    })
    afterWaitingRoom.length = 0
}

export function step() {
    stepInputs()
    stepMerges()
    stepOutputs()
}
