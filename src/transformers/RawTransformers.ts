import { ProgressCallback, ActionPresentation } from "../api/action";
import {BeforeTransformer} from "../api/flow"
import {BlenderFile} from "../api/content"

class NoOpPreprocess implements BeforeTransformer<any> {
    constructor(source: BlenderFile) {

    }

    start(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getProgress(): number {
        throw new Error("Method not implemented.");
    }
    getTotal(): number | null {
        throw new Error("Method not implemented.");
    }
    getPromise(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    onProgress(callback: ProgressCallback): void {
        throw new Error("Method not implemented.");
    }
    getPresentation(): ActionPresentation | null {
        throw new Error("Method not implemented.");
    }

}