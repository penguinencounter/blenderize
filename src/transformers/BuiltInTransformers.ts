import {ProgressCallback, ActionPresentation} from "../api/action"
import {BeforeTransformer} from "../api/flow"
import {BlenderFile, RawFile} from "../api/tagger"
import {fulfilled} from "../api/helpers"

export interface StringStats {
    /**
     * the 66 defined noncharacters
     */
    noncharacter: number
    /**
     * the replacement character � u+fffd
     */
    replacement: number
    /**
     * the private use areas
     */
    pua: number
    /**
     * characters on planes 4 to 13, which have no assigned characters
     */
    offPlane: number
    /**
     * characters on planes 3 and 14 in large unassigned areas
     */
    unassignedBad: number
    /**
     * ASCII control characters not commonly found in text
     */
    asciiControl: number
    total: number
}

export function stringStats(str: string): StringStats {
    const stats: StringStats = {
        noncharacter: 0,
        replacement: 0,
        pua: 0,
        offPlane: 0,
        unassignedBad: 0,
        asciiControl: 0,
        total: 0
    }
    for (let codePoint of str) {
        const i = codePoint.codePointAt(0)
        if (i === undefined) continue
        stats.total++
        if (
            (i >= 0xFDD0 && i <= 0xFDEF)
            || i === 0xFFFE || i === 0xFFFF
            || ((i & 0xFFFE) === 0xFFFE && i > 0x10000)
        ) stats.noncharacter++
        if (i === 0xFFFD) stats.replacement++
        if (
            (i >= 0xE000 && i <= 0xF8FF)
            || (i >= 0xF0000 && i <= 0xFFFFD)
            || (i >= 0x100000 && i <= 0x10FFFD)
        ) stats.pua++
        if (
            (i >= 0x34000 && i <= 0x3FFFF)
            || (i >= 0xE0200 && i <= 0xEFFFF)
        ) stats.unassignedBad++
        if (i >= 0x40000 && i <= 0xDFFFF) stats.offPlane++
        if (i < 0x20 && i !== 0x0D && i !== 0x0A && i !== 0x09) // not CR, LF, or TAB
            stats.asciiControl++
        if (i === 0x7F) stats.asciiControl++ // DEL
    }
    return stats
}

const THRESHOLDS = {
    noncharacter: 0.025,
    replacement: 0.05,
    pua: 1.0, // conlangs or something?
    offPlane: 0.05,
    unassignedBad: 0.2, // more lenient in case this is used in the far future. tweak as needed
    asciiControl: 0.05,
} as const

export function isStatsBinaryLike(stats: StringStats) {
    if (stats.total === 0) return false // it's ... empty
    if (stats.noncharacter / stats.total >= THRESHOLDS.noncharacter) return true
    if (stats.replacement / stats.total >= THRESHOLDS.replacement) return true
    if (stats.pua / stats.total >= THRESHOLDS.pua) return true
    if (stats.offPlane / stats.total >= THRESHOLDS.offPlane) return true
    if (stats.unassignedBad / stats.total >= THRESHOLDS.unassignedBad) return true
    // noinspection RedundantIfStatementJS - YOU RUINED IT >:(
    if (stats.asciiControl / stats.total >= THRESHOLDS.asciiControl) return true
    return false
}

const UTF_8 = new TextDecoder("utf-8", {fatal: true})
const UTF_16_BE = new TextDecoder("utf-16be", {fatal: true})
const UTF_16_LE = new TextDecoder("utf-16le", {fatal: true})

function utf16be(raw: Uint8Array) {
    try {
        return UTF_16_BE.decode(raw)
    } catch (e) {
        return null
    }
}

function utf16le(raw: Uint8Array) {
    try {
        return UTF_16_LE.decode(raw)
    } catch (e) {
        return null
    }
}

function autodetect16(raw: Uint8Array) {
    // BOMless UTF-16: try to guess based on presence of 0x00 in even vs odd positions
    let even = 0
    let odd = 0
    let i = 0
    for (const byte of raw) {
        if (byte === 0) {
            if (i % 2 === 0) even++
            else odd++
        }

        // only scan the first 0xFFFF bytes
        if (i++ > 0xFFFF) break
    }
    if (odd >= even) return utf16le(raw) ?? utf16be(raw)
    return utf16be(raw) ?? utf16le(raw)
}

function utf8(raw: Uint8Array) {
    try {
        return UTF_8.decode(raw)
    } catch (e) {
        return null
    }
}

/**
 * Try to decode a string.
 * Returns `null` if nothing works, or the BOM is lying to us.
 * May successfully decode binaries into UTF-16 so watch out for that
 */
export function bytesToStr(raw: Uint8Array) {
    three: {
        if (raw.length < 3) break three
        // UTF-8 BOM, which is useless except as an indicator
        if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) return utf8(raw)
    }
    two: {
        if (raw.length < 2) break two
        // UTF-16 BOM
        if (raw[0] === 0xFE && raw[1] === 0xFF) return utf16be(raw)
        if (raw[0] === 0xFF && raw[1] === 0xFE) return utf16le(raw)
    }
    // Try to figure out if it's UTF-16 by asking if it's 20% zeroes
    let zeroes = 0
    let i = 0
    for (const byte of raw) {
        if (byte === 0) zeroes++
        if (i++ > 0xFFFF) break
    }
    const probably16 = zeroes > (Math.min(0xFFFF, raw.length) * 0.25)

    if (probably16) return autodetect16(raw) ?? utf8(raw)
    return utf8(raw) ?? autodetect16(raw)
}

export function isBinary(content: Uint8Array) {
    const str = bytesToStr(content)
    if (str === null) return true
    const stats = stringStats(str)
    return isStatsBinaryLike(stats)
}

export class GuessContentTypeTransformer implements BeforeTransformer<RawFile> {
    private readonly result: RawFile
    private promise?: Promise<RawFile>

    constructor(source: BlenderFile) {
        this.result = {
            content: source.content,
            rawFile: true,
            isText: isBinary(source.content),
            merge: source.merge,
            tag: "guess_text_or_not"
        }
    }

    start(): Promise<RawFile> {
        if (this.promise) throw new Error("already started!")
        return this.promise = fulfilled(this.result)
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

    onProgress(_: ProgressCallback): void {
    }

    getPresentation(): ActionPresentation | null {
        return null
    }
}