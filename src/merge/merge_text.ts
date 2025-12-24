import {ProgressCallback, ActionPresentation} from "../api/action"
import {Merge} from "../api/flow"
import {TaggedRawBytes} from "../transformers/RawTransformers"
import {Tagged} from "../api/tagger"

type FileAtoms = string[]

interface Range {
    from: number
    to: number
}

interface Region {
    left: Range
    right: Range
}

type AtomHistogram = Map<string, number>

type Edit<T> = {
    kind: "insert" | "delete" | "equal",
    left: T | null,
    right: T | null
}

type Move = {
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
}

/**
 * diff
 * https://en.wikipedia.org/wiki/Diff
 * https://www.nathaniel.ai/myers-diff/
 * http://www.xmailserver.org/diff2.pdf
 * https://link.springer.com/article/10.1007/s10664-019-09772-z (OA)
 * https://www.raygard.net/2025/01/28/how-histogram-diff-works/ <-- this one's pretty good
 * https://blog.jcoglan.com/2017/02/12/the-myers-diff-algorithm-part-1/ <-- this one's pretty good too
 */
export class MeyersDiff {
    /*
    okay so we're going to need some sort of graph structure (?)
    and then we can have some BFS heuristic

    0. right means deleting, down means inserting. bottom right corner = B, top left corner = A
    1. take as many diagonals as possible; assume always taken
    2. prefer deletions (moving 'right') first over insertions (moving 'down')
    3. score positions based on BFS with fixed number of steps
    4. actually, score based on (x - y)
     */
    // CREDIT: adapted from https://blog.jcoglan.com/2017/02/15/the-myers-diff-algorithm-part-2/
    // THANK YOU!!
    // FIXME: d is too big for some reason
    static shortest_edit(left: ArrayLike<any>, right: ArrayLike<any>): number[][] {
        const n = left.length
        const m = right.length
        const max = n + m

        // hold largest X for each K (value of x-y; this changes when following a diagonal)
        const v: number[] = new Array(2 * max + 1)
        v[1] = 0
        const trace: number[][] = []

        for (let d = 0; d <= max; d++) {
            trace.push([...v])

            for (let k = -d; k <= d; k += 2) {
                let x: number
                // choose what to do from the previous round
                if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
                    // down (i.e. insert)
                    x = v[k + 1]
                } else {
                    // right (i.e. delete)
                    x = v[k - 1] + 1
                }
                // derive (because k = x - y, y = x - k)
                let y = x - k

                // try to follow diagonals as much as possible (i.e. matching)
                //     vv not EOF vv     vv same content vv
                while (x < n && y < m && left[x] === right[y]) {
                    x = x + 1
                    y = y + 1
                }

                // if we've taken a diagonal, then the best X has changed; store
                v[k] = x

                // profit?
                if (x >= n && y >= m) return trace
            }
        }
        throw new Error("failed!")
    }

    static backtrack(left: ArrayLike<any>, right: ArrayLike<any>) {
        let x = left.length
        let y = right.length
        const moves: Move[] = []
        this.shortest_edit(left, right)
            .map((v, d) => ({v: v, d: d}))
            .reverse()
            .forEach(({v, d}) => {
                const k = x - y
                let prevK: number
                if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
                    prevK = k + 1
                } else {
                    prevK = k - 1
                }
                const prevX = v[prevK]
                const prevY = prevX - prevK

                // diagonals
                while (x > prevX && y > prevY) {
                    moves.push({
                        fromX: x - 1,
                        fromY: y - 1,
                        toX: x,
                        toY: y
                    })
                    x = x - 1
                    y = y - 1
                }

                // down or right
                if (d > 0)
                    moves.push({
                        fromX: prevX,
                        fromY: prevY,
                        toX: x,
                        toY: y
                    })

                x = prevX
                y = prevY
            })
        return moves
    }

    static diff<T>(left: ArrayLike<T>, right: ArrayLike<T>) {
        const diff: Edit<T>[] = []
        this.backtrack(left, right).forEach(({fromX, fromY, toX, toY}) => {
            const a = left[fromX]
            const b = right[fromY]
            if (toX === fromX) diff.push({
                kind: "insert",
                left: null,
                right: b
            })
            else if (toY === fromY) diff.push({
                kind: "delete",
                left: a,
                right: null
            })
            else diff.push({
                    kind: "equal",
                    left: a,
                    right: b,
                })
        })
        return diff
    }
}

/**
 * Line merge algorithm that supports exactly 2 sides and a base.
 * https://www.cis.upenn.edu/~bcpierce/papers/diff3-short.pdf
 * https://www.gnu.org/software/diffutils/manual/diffutils.html#diff3-Merging
 * https://en.wikipedia.org/wiki/Diff3
 * https://en.wikipedia.org/wiki/Merge_(version_control)
 */
export class TextThreeWayMerge implements Merge<TaggedRawBytes, TaggedRawBytes> {
    private readonly baseText: string
    private readonly side1text: string
    private readonly side2text: string

    static atomize(text: string): FileAtoms {
        // on the subject of CRLFs: keep 'em :shrug:
        return text.split("\n")
    }

    static reconstruct(atoms: FileAtoms): string {
        return atoms.join("\n")
    }

    constructor(
        base: TaggedRawBytes,
        side1: TaggedRawBytes,
        side2: TaggedRawBytes
    ) {
        const decoder = new TextDecoder("utf-8", {fatal: true})
        this.baseText = decoder.decode(base.content)
        this.side1text = decoder.decode(side1.content)
        this.side2text = decoder.decode(side2.content)
    }

    // TODO: Use a worker to off-thread this?
    start(): Promise<TaggedRawBytes> {
        throw new Error("Method not implemented.")
    }

    getProgress(): number {
        throw new Error("Method not implemented.")
    }

    getTotal(): number | null {
        throw new Error("Method not implemented.")
    }

    getPromise(): Promise<TaggedRawBytes> {
        throw new Error("Method not implemented.")
    }

    onProgress(callback: ProgressCallback): void {
        throw new Error("Method not implemented.")
    }

    getPresentation(): ActionPresentation | null {
        throw new Error("Method not implemented.")
    }
}