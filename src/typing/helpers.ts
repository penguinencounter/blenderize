export interface Static<T> {
    new(...args: any[]): T
}

// use this helper type in an 'implements' clause to assert that the static of this type conforms to an interface
export type companion<I extends new (...args: any[]) => any, _C extends I> = any

export type Tagged = {
    type: string
}