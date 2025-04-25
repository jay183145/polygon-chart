import { Point } from "@/types"

const STORAGE_KEY = "polygon_chart_saves"

interface StoredData {
    name: string
    timestamp: number
    data: {
        points: Point[]
        polygons: {
            points: { x: number; y: number; plot: "A" | "B" }[]
            color: string
            name: string
            visible: boolean
        }[]
        dyedGroups: { [key: string]: boolean }
    }
}

export const saveToLocalStorage = (name: string, data: StoredData["data"]): boolean => {
    try {
        const saves = getAllSaves()
        const newSave: StoredData = {
            name,
            timestamp: Date.now(),
            data,
        }

        // 檢查是否已存在同名保存
        const existingIndex = saves.findIndex((save) => save.name === name)
        if (existingIndex !== -1) {
            saves[existingIndex] = newSave
        } else {
            saves.push(newSave)
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(saves))
        return true
    } catch (error) {
        console.error("Error saving to localStorage:", error)
        return false
    }
}

export const loadFromLocalStorage = (name: string): StoredData["data"] | null => {
    try {
        const saves = getAllSaves()
        const save = saves.find((save) => save.name === name)
        return save ? save.data : null
    } catch (error) {
        console.error("Error loading from localStorage:", error)
        return null
    }
}

export const deleteFromLocalStorage = (name: string): boolean => {
    try {
        const saves = getAllSaves()
        const filteredSaves = saves.filter((save) => save.name !== name)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSaves))
        return true
    } catch (error) {
        console.error("Error deleting from localStorage:", error)
        return false
    }
}

export const getAllSaves = (): StoredData[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch (error) {
        console.error("Error getting saves:", error)
        return []
    }
}
