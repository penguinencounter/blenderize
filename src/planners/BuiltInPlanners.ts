import {BeforeTransformer, BeforeTransformPlan} from "../api/flow"
import {BlenderFile, RawFile} from "../api/tagger"
import {AssumeTextTransformer} from "../transformers/RawTransformers"
import {registerBefore} from "./PlannerRegistry"


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
    id: "builtin/known_text_formats",
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
    id: "builtin/guess_text_or_binary",
    priority: -10,
    process(file: BlenderFile): BeforeTransformer<RawFile> {
        // lie
        return new AssumeTextTransformer(file)
    },
    matches(file: BlenderFile) {
        return false
    }
}


export function registerAll() {
    registerBefore(GuessTextOrBinary)
}