import {ProgressCallback, ActionPresentation} from "../api/action"
import {Merge} from "../api/flow"
import {BlenderFile, MergeInfo, RawFile} from "../api/tagger"

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

type DiffAlgorithm = (left: FileAtoms, right: FileAtoms) => TwoWayDiffResult<string>

export class TwoWayDiffResult<T> {
    readonly edits: Edit<T>[] = []
    readonly ltrMap: Map<number, number | null> = new Map<number, number>()
    readonly rtlMap: Map<number, number | null> = new Map<number, number>()

    public submitAdd(
        right: T,
        rightI: number,
    ) {
        this.edits.unshift({
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
        this.edits.unshift({
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
        this.edits.unshift({
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

function fatal(message: string): never {
    debugger
    throw new TypeError(message)
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
export const MyersDiff = ((): DiffAlgorithm => {
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
    function shortest_edit(left: ArrayLike<any>, right: ArrayLike<any>): Map<number, number>[] {
        const n = left.length
        const m = right.length
        const max = n + m

        // hold largest X for each K (value of x-y; this changes when following a diagonal)
        const v: Map<number, number> = new Map()
        v.set(1, 0)
        const trace: Map<number, number>[] = []

        for (let d = 0; d <= max; d++) {
            trace.push(new Map(v))

            for (let k = -d; k <= d; k += 2) {
                let x: number
                // choose what to do from the previous round
                if (k === -d || (k !== d && v.get(k - 1)! < v.get(k + 1)!)) {
                    // down (i.e. insert)
                    x = v.get(k + 1) ?? fatal(`v at ${k + 1}`)
                } else {
                    // right (i.e. delete)
                    x = (v.get(k - 1) ?? fatal(`v at ${k - 1}`)) + 1
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
                v.set(k, x)

                // profit?
                if (x >= n && y >= m) return trace
            }
        }
        throw new Error("failed!")
    }

    function backtrack(left: ArrayLike<any>, right: ArrayLike<any>) {
        let x = left.length
        let y = right.length
        const moves: Move[] = []
        shortest_edit(left, right)
            .map((v, d) => ({v: v, d: d}))
            .reverse()
            .forEach(({v, d}) => {
                const k = x - y
                let prevK: number
                if (
                    k === -d || (k !== d &&
                        (v.get(k - 1) ?? fatal(`v at ${k - 1}`)) < (v.get(k + 1) ?? fatal(`v at ${k + 1}`))
                    )
                ) {
                    prevK = k + 1
                } else {
                    prevK = k - 1
                }
                const prevX = v.get(prevK) ?? fatal(`v at ${prevK}`)
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

    function diff<T>(left: ArrayLike<T>, right: ArrayLike<T>) {
        const result = new TwoWayDiffResult<T>()
        backtrack(left, right).forEach(({fromX, fromY, toX, toY}) => {
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

    return diff
})()

/**
 * `[from, to)`
 */
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

function arrayEq<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false
    return a.every((v, i) => v === b[i])
}

/**
 * Line merge algorithm that supports exactly 2 sides and a base.
 * https://www.cis.upenn.edu/~bcpierce/papers/diff3-short.pdf
 * https://www.gnu.org/software/diffutils/manual/diffutils.html#diff3-Merging
 * https://en.wikipedia.org/wiki/Diff3
 * https://en.wikipedia.org/wiki/Merge_(version_control)
 */
export class TextThreeWayMerge implements Merge<RawFile, RawFile> {
    private static readonly TWO_WAY_ALGORITHM = MyersDiff

    private promise?: Promise<RawFile>

    private readonly baseFile: BlenderFile
    private readonly baseText: string
    private readonly side1Text: string
    private readonly side2Text: string
    private readonly baseAtoms: FileAtoms
    private readonly side1Atoms: FileAtoms
    private readonly side2Atoms: FileAtoms
    private readonly merge: MergeInfo

    static atomize(text: string): FileAtoms {
        // on the subject of CRLFs: keep 'em :shrug:
        return text.split("\n")
    }

    static recombine(atoms: FileAtoms): string {
        // on the subject of CRLFs: keep 'em :shrug:
        return atoms.join('\n')
    }

    constructor(
        baseF: BlenderFile,
        base: RawFile,
        side1: RawFile,
        side2: RawFile
    ) {
        this.baseFile = baseF
        const decoder = new TextDecoder("utf-8", {fatal: true})
        this.baseText = decoder.decode(base.content)
        this.side1Text = decoder.decode(side1.content)
        this.side2Text = decoder.decode(side2.content)
        this.baseAtoms = TextThreeWayMerge.atomize(this.baseText)
        this.side1Atoms = TextThreeWayMerge.atomize(this.side1Text)
        this.side2Atoms = TextThreeWayMerge.atomize(this.side2Text)

        this.merge = base.merge
    }

    private build2way(): { diff1: TwoWayDiffResult<string>, diff2: TwoWayDiffResult<string> } {
        const diff1 = TextThreeWayMerge.TWO_WAY_ALGORITHM(this.baseAtoms, this.side1Atoms)
        const diff2 = TextThreeWayMerge.TWO_WAY_ALGORITHM(this.baseAtoms, this.side2Atoms)
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

                if (diff1.ltrMap.get(baseAt) === side1At && diff2.ltrMap.get(baseAt) === side2At) continue

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
                            base: [baseAt, o],
                            side1: [side1At, a],
                            side2: [side2At, b]
                        })
                        lBase = o
                        lSide1 = a
                        lSide2 = b
                        continue step2
                    }
                } else {
                    // stable
                    chunks.push({
                        base: [lBase, baseAt],
                        side1: [lSide1, side1At],
                        side2: [lSide2, side2At],
                    })
                    lBase = baseAt
                    lSide1 = side1At
                    lSide2 = side2At
                    continue step2
                }
            }
        }

        if (lBase < baseN || lSide1 < side1N || lSide2 < side2N) {
            chunks.push({
                base: [lBase, baseN],
                side1: [lSide1, side1N],
                side2: [lSide1, side2N],
            })
        }

        return chunks
    }

    private resolveChunk(chunk: Chunk): string | null {
        const base = this.baseAtoms.slice(...chunk.base)
        const side1 = this.side1Atoms.slice(...chunk.side1)
        const side2 = this.side2Atoms.slice(...chunk.side2)
        const s1b = arrayEq(base, side1)
        const s2b = arrayEq(base, side2)
        const s1s2 = arrayEq(side1, side2)

        // same
        if (s1b && s2b) return TextThreeWayMerge.recombine(base)
        // changed in 1
        if (!s1b && s2b) return TextThreeWayMerge.recombine(side1)
        // changed in 2
        if (s1b && !s2b) return TextThreeWayMerge.recombine(side2)
        // fake conflict
        if (s1s2) return TextThreeWayMerge.recombine(side1)
        // real conflict
        if (!s1b && !s2b && !s1s2) return null
        throw new Error("this can't happen what")
    }

    private async run(): Promise<RawFile> {
        const {diff1, diff2} = this.build2way()
        const parsed = this.parse(diff1, diff2)
        console.info(parsed)
        return {
            merge: this.merge,
            content: new TextEncoder().encode(parsed.map(it => this.resolveChunk(it)).join("\n")),
            type: {rawFile: true},
            isText: true,
            tag: "raw"
        }
    }

    // TODO: Use a worker to off-thread this?
    start(): Promise<RawFile> {
        return this.promise = this.run()
    }

    getProgress(): number {
        return 0
    }

    getTotal(): number | null {
        return null
    }

    getPromise(): Promise<RawFile> {
        return this.promise!
    }

    onProgress(callback: ProgressCallback): void {
    }

    getPresentation(): ActionPresentation | null {
        const name = this.merge.key
        return {
            label: `Merge ${name}`
        }
    }
}