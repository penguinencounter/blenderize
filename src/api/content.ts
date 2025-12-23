import {MergeInfo} from "./tagger"

export interface BlenderFile {
    filename?: string
    merge: MergeInfo
    content: Uint8Array
}
