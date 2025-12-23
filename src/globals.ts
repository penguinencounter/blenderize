let nextID = 0

export function getUniqueID() {
    return ++nextID
}