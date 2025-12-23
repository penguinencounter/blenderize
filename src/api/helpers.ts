export type Static<T> = { new(...args: any): T }

export function fulfilled<T>(value: T): Promise<T> {
    return new Promise((resolve, _) => resolve(value))
}

const units = [
    "B", "KB", "MB", "GB", "TB" /* if people are downloading TB of data into RAM we have other problems */
] as const
const maximumIterations = units.length

export function byteSI(bytes: number) {
    let unit: string = units.at(-1)!
    let i: number = 0
    while (true) {
        if (bytes < 1000) {
            unit = units[i]
            break
        }
        i++
        if (i < maximumIterations)
            bytes /= 1000
        else break
    }
    if (i == 0) {
        return `${bytes} ${unit}`
    }
    return `${bytes.toFixed(2)} ${unit}`
}