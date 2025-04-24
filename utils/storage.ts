interface PolygonPoint {
    x: number
    y: number
    plot: "A" | "B"
}

interface PolygonStorage {
    tagName: string
    color: string
    polygon: PolygonPoint[]
}

const STORAGE_KEY = "polygon_data"

export const savePolygonData = (data: PolygonStorage) => {
    try {
        const currentPolygonData = loadPolygonData()
        if (currentPolygonData) {
            currentPolygonData.push(data)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPolygonData))
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([data]))
        }
    } catch (error) {
        console.error("Error saving polygon data:", error)
    }
}

export const loadPolygonData = (): PolygonStorage[] | null => {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) {
            return JSON.parse(data)
        }
    } catch (error) {
        console.error("Error loading polygon data:", error)
    }
    return null
}

export const clearPolygonData = () => {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
        console.error("Error clearing polygon data:", error)
    }
}
