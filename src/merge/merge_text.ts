import {ProgressCallback, ActionPresentation} from "../api/action"
import {Merge} from "../api/flow"
import {TaggedRawBytes} from "../transformers/RawTransformers"

type FileAtoms = string[]

type Edit<T> = {
    kind: "insert" | "delete" | "equal",
    left: T | null,
    leftI: number | null,
    right: T | null,
    rightI: number | null,
}

type Move = {
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
}

interface DiffAlgorithm {
    diff(left: FileAtoms, right: FileAtoms): TwoWayDiffResult<string>
}

export class TwoWayDiffResult<T> {
    readonly edits: Edit<T>[] = []
    readonly ltrMap: Map<number, number | null> = new Map<number, number>()
    readonly rtlMap: Map<number, number | null> = new Map<number, number>()

    public submitAdd(
        right: T,
        rightI: number,
    ) {
        this.edits.push({
            kind: "insert",
            left: null,
            leftI: null,
            right: right,
            rightI: rightI
        })
        this.rtlMap.set(rightI, null)
    }

    public submitDel(
        left: T,
        leftI: number,
    ) {
        this.edits.push({
            kind: "delete",
            left: left,
            leftI: leftI,
            right: null,
            rightI: null
        })
        this.ltrMap.set(leftI, null)
    }

    public submitEqual(
        left: T,
        leftI: number,
        right: T,
        rightI: number,
    ) {
        this.edits.push({
            kind: "equal",
            left: left,
            leftI: leftI,
            right: right,
            rightI: rightI
        })
        this.ltrMap.set(leftI, rightI)
        this.rtlMap.set(rightI, leftI)
    }
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
export class MyersDiff {
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
        const result = new TwoWayDiffResult<T>()
        this.backtrack(left, right).forEach(({fromX, fromY, toX, toY}) => {
            const a = left[fromX]
            const b = right[fromY]
            if (toX === fromX)
                result.submitAdd(b, fromY)
            else if (toY === fromY)
                result.submitDel(a, fromX)
            else
                result.submitEqual(a, fromX, b, fromY)
        })
        return result
    }

    static readonly DIFF: DiffAlgorithm = this
}

type Range = [number, number]

/*
from the upenn paper:
- STABLE if all three ranges are the same length and same content
- UNSTABLE otherwise, with 4 variants:
*note: == means content equal
  - changed in side1, if base == side2 but side2 != side1
  - changed in side2, if base == side1 but side1 != side2
  - falsely conflicting if base != side1, but side1 == side2
  - truly conflicting if all three sides are different
 */
interface Chunk {
    base: Range
    side1: Range
    side2: Range
}

const Chunk = {
    size(c: Chunk) {
        return c.base[1] - c.base[0] + c.side1[1] - c.side1[0] + c.side2[1] - c.side2[0]
    }
} as const

/**
 * Line merge algorithm that supports exactly 2 sides and a base.
 * https://www.cis.upenn.edu/~bcpierce/papers/diff3-short.pdf
 * https://www.gnu.org/software/diffutils/manual/diffutils.html#diff3-Merging
 * https://en.wikipedia.org/wiki/Diff3
 * https://en.wikipedia.org/wiki/Merge_(version_control)
 */
export class TextThreeWayMerge implements Merge<TaggedRawBytes, TaggedRawBytes> {
    private static readonly TWO_WAY_ALGORITHM = MyersDiff.DIFF

    private readonly baseText: string
    private readonly side1Text: string
    private readonly side2Text: string
    private readonly baseAtoms: FileAtoms
    private readonly side1Atoms: FileAtoms
    private readonly side2Atoms: FileAtoms

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
        this.side1Text = decoder.decode(side1.content)
        this.side2Text = decoder.decode(side2.content)
        this.baseAtoms = TextThreeWayMerge.atomize(this.baseText)
        this.side1Atoms = TextThreeWayMerge.atomize(this.side1Text)
        this.side2Atoms = TextThreeWayMerge.atomize(this.side2Text)
    }

    private build2way(): { diff1: TwoWayDiffResult<string>, diff2: TwoWayDiffResult<string> } {
        const diff1 = TextThreeWayMerge.TWO_WAY_ALGORITHM.diff(this.baseAtoms, this.side1Atoms)
        const diff2 = TextThreeWayMerge.TWO_WAY_ALGORITHM.diff(this.baseAtoms, this.side2Atoms)
        return {
            diff1: diff1,
            diff2: diff2
        }
    }

    // see Figure 2 "The Diff3 Algorithm"
    // it uses 1-indexed arrays though and pays the price for it by having all sorts of janky +/-
    private parse(diff1: TwoWayDiffResult<string>, diff2: TwoWayDiffResult<string>) {
        // 1.
        let lBase = 0, lSide1 = 0, lSide2 = 0
        const chunks: Chunk[] = []

        const baseN = this.baseAtoms.length
        const side1N = this.side1Atoms.length
        const side2N = this.side2Atoms.length

        step2: while (true) {
            for (let i = 0; ; i++) {
                // M_A[x, y] means "does line X in base correspond to line Y in side1"?
                // i.e. ltrMapping.get(x) === y
                const baseAt = lBase + i
                if (baseAt >= baseN) break step2
                const side1At = lSide1 + i
                const side2At = lSide2 + i

                if (diff1.ltrMap.get(baseAt) === side1At || diff2.ltrMap.get(baseAt) === side2At) continue

                if (i === 0) {
                    // unstable
                    // find some O >= lBase that exists on both sides:
                    for (let o = lBase; ; o++) {
                        if (o >= baseN) break step2
                        const a = diff1.ltrMap.get(o)
                        if (!a) continue
                        const b = diff2.ltrMap.get(o)
                        if (!b) continue
                        chunks.push({
                            base: [baseAt, o - 1],
                            side1: [side1At, a - 1],
                            side2: [side2At, b - 1]
                        })
                        lBase = o
                        lSide1 = a
                        lSide2 = b
                        continue step2
                    }
                } else {
                    // stable
                    chunks.push({
                        base: [lBase, baseAt - 1],
                        side1: [lSide1, side1At - 1],
                        side2: [lSide2, side2At - 1],
                    })
                    lBase = baseAt
                    lSide1 = side1At
                    lSide2 = side2At
                    continue step2
                }
            }
        }

        if (lBase < baseN - 1 || lSide1 < side1N - 1 || lSide2 < side2N - 1) {
            chunks.push({
                base: [lBase, baseN - 1],
                side1: [lSide1, side1N - 1],
                side2: [lSide1, side2N - 1],
            })
        }

        return chunks
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