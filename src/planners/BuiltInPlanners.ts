import {
    AfterTransformer,
    AfterTransformPlan,
    BeforeTransformer,
    BeforeTransformPlan,
    Merge,
    MergePlan
} from "../api/flow"
import {BlenderFile, RawFile, Tagged} from "../api/tagger"
import {AssumeTextTransformer, NoAfterTransformer} from "../transformers/RawTransformers"
import {registerAfter, registerBefore, registerMerge} from "./PlannerRegistry"
import {GuessContentTypeTransformer} from "../transformers/BuiltInTransformers"
import {TextThreeWayMerge} from "../merge/merge_text"


const PROBABLY_TEXT_EXTENSIONS = new Set([
    // text formats
    "txt", "md", "tex",
    // programming (web platform)
    "js", "ts", "htm", "html", "xhtml", "css", "jsx", "tsx", "less", "sass", "map",
    // other programming languages
    "rb", "py", "php", "rs", "c", "h", "cpp", "hpp", "java", "vbs", "bat", "ps1", "pl", "cgi", "cs", "xml",
    "ahk", "awk", "cmd", "dart", "go", "gd", "hta", "ino", "kt", "lua", "svelte", "vue", "wat", "xaml", "gradle",
    "sc", "cxx", "hxx", "cc", "hh",
    // programming (configuration & textual data)
    "gitignore", "gitattributes", "vcsignore", "ini", "toml", "yaml", "json",
    // textual data storage formats
    "csv", "tsv", "log", "ass" /* SUBTITLES */,
    // specialty
    "bbmodel",
])

/**
 * gitattributes but scuffed
 */
export const KnownTextFormats: BeforeTransformPlan<RawFile> = {
    id: "builtin/in/known_text",
    priority: -5,
    process(file: BlenderFile): BeforeTransformer<RawFile> {
        return new AssumeTextTransformer(file)
    },
    matches(file: BlenderFile): boolean {
        if (!file.filename) return false
        const extension = file.filename.split(".").at(-1)
        if (!extension || extension.includes("/") || extension.includes("\\"))
            return false // No file extension
        return PROBABLY_TEXT_EXTENSIONS.has(extension.toLowerCase())
    }
}

export const GuessTextOrBinary: BeforeTransformPlan<RawFile> = {
    id: "builtin/in/auto",
    priority: -10,
    process(file: BlenderFile): BeforeTransformer<RawFile> {
        return new GuessContentTypeTransformer(file)
    },
    matches(file: BlenderFile) {
        // yeah!
        return true
    }
}

export const FileOutput: AfterTransformPlan<RawFile> = {
    id: "builtin/out/file",
    priority: -10,
    process(result: RawFile): AfterTransformer<RawFile> {
        return new NoAfterTransformer(result)
    },
    matches<T extends Tagged>(result: T): boolean {
        return !!result.type.rawFile
    }
}


export const ThreeWay: MergePlan<RawFile, RawFile> = {
    id: "builtin/merge/three",
    priority: -10,
    process(_1: BlenderFile, _2: BlenderFile[], baseContainer: RawFile, sideContainers: RawFile[]): Merge<RawFile, RawFile> {
        return new TextThreeWayMerge(baseContainer, sideContainers[0], sideContainers[1])
    },
    matches(_1: BlenderFile, _2: BlenderFile[], baseContainer: Tagged, sideContainers: Tagged[]): boolean {
        return (
            sideContainers.length === 2
            && RawFile.isRawFile(baseContainer)
            && RawFile.isRawFile(sideContainers[0])
            && RawFile.isRawFile(sideContainers[1])
        )
    }
}


export function registerBuiltins() {
    registerBefore(KnownTextFormats)
    registerBefore(GuessTextOrBinary)
    registerMerge(ThreeWay)
    registerAfter(FileOutput)
}