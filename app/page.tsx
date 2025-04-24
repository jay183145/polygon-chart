"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import { Button } from "@/components/ui/button"
import { savePolygonData, loadPolygonData, clearPolygonData } from "@/utils/storage"

interface PolygonPoint {
    x: number
    y: number
    plot: "A" | "B"
}

interface Polygon {
    points: PolygonPoint[]
    color: string
    name: string
}

export default function Home() {
    const svgARef = useRef<SVGSVGElement | null>(null)
    const svgBRef = useRef<SVGSVGElement | null>(null)
    const [points, setPoints] = useState<{ a: [number, number]; b: [number, number] }[]>([])
    const [clickedPoint, setClickedPoint] = useState<{ x: number; y: number; plot: "A" | "B" } | null>(null)
    const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
    const [showPolygonDialog, setShowPolygonDialog] = useState(false)
    const [polygons, setPolygons] = useState<Polygon[]>([])
    const [newPolygonColor, setNewPolygonColor] = useState("#FF0000")
    const [newPolygonName, setNewPolygonName] = useState("")
    const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([])

    const handleClick = useCallback(
        (e: MouseEvent, plot: "A" | "B") => {
            const svg = plot === "A" ? svgARef.current : svgBRef.current
            if (!svg) return

            const rect = svg.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            const margin = { top: 40, right: 20, bottom: 40, left: 50 }
            const innerWidth = 400 - margin.left - margin.right
            const innerHeight = 400 - margin.top - margin.bottom

            const plotX = x - margin.left
            const plotY = y - margin.top

            if (plotX < 0 || plotX > innerWidth || plotY < 0 || plotY > innerHeight) return

            const xScale =
                plot === "A"
                    ? d3.scaleLinear().domain([180, 1000]).range([0, innerWidth])
                    : d3.scaleLinear().domain([-20, 1000]).range([0, innerWidth])
            const yScale = d3.scaleLinear().domain([-20, 1000]).range([innerHeight, 0])

            const dataX = xScale.invert(plotX)
            const dataY = yScale.invert(plotY)

            setClickedPoint({ x: dataX, y: dataY, plot })

            if (isDrawingPolygon) {
                setPolygonPoints((currentPoints) => {
                    // 如果已經有點，檢查是否在同一個圖表上
                    if (currentPoints.length > 0 && currentPoints[0].plot !== plot) {
                        // 如果嘗試在不同圖表上添加點，停止繪製
                        setIsDrawingPolygon(false)
                        return []
                    }

                    if (currentPoints.length > 0) {
                        const firstPoint = currentPoints[0]
                        const distance = Math.sqrt(
                            Math.pow(plotX - xScale(firstPoint.x), 2) + Math.pow(plotY - yScale(firstPoint.y), 2),
                        )
                        // 誤差 20 內自動完成多邊形
                        if (distance < 20) {
                            if (currentPoints.length >= 3) {
                                setShowPolygonDialog(true)
                            }
                            return [...currentPoints, { ...firstPoint }]
                        }
                    }
                    // 其他狀況直接存入多邊形的點
                    return [...currentPoints, { x: dataX, y: dataY, plot }]
                })
            }
        },
        [isDrawingPolygon, newPolygonColor, newPolygonName],
    )

    // 初始化數據
    useEffect(() => {
        d3.csv("/CD45_pos.csv", (d) => {
            // 從 CSV 中讀取三個數值並轉換為浮點數
            // 使用 ?? "" 作為預設值，以防欄位為空
            const xA = parseFloat(d["CD45-KrO"] ?? "")
            const xB = parseFloat(d["CD19-PB"] ?? "")
            const y = parseFloat(d["SS INT LIN"] ?? "")

            // 確保所有數值都是有效的（不是 NaN）
            if (!isNaN(xA) && !isNaN(xB) && !isNaN(y)) {
                // 返回一個物件，包含兩個座標點
                return { a: [xA, y], b: [xB, y] }
            }
            // 如果有任何無效數值，返回 null
            return null
        }).then((data) => {
            // 過濾掉所有 null 值，並設置到 state 中
            setPoints(data.filter(Boolean) as { a: [number, number]; b: [number, number] }[])
        })
    }, [])

    // 初始化圖表
    useEffect(() => {
        // 設定圖表的寬度和高度
        const width = 400
        const height = 400

        const margin = { top: 40, right: 20, bottom: 40, left: 50 }
        // 計算實際可繪圖區域的大小
        const innerWidth = width - margin.left - margin.right
        const innerHeight = height - margin.top - margin.bottom

        // 選取兩個 SVG 元素並清除其內容
        const svgA = d3.select(svgARef.current)
        const svgB = d3.select(svgBRef.current)
        svgA.selectAll("*").remove()
        svgB.selectAll("*").remove()

        // 設定三個比例尺，用於數據映射：
        // 加了 20 的間距來避免原點太過壓迫圖形邊緣，看起來會更自然
        // 1. CD45-KrO 的 X 軸比例尺
        const xScaleA = d3
            .scaleLinear()
            .domain([180, 1000]) // 原始數據範圍：180 到 1000
            .range([0, innerWidth]) // 映射到畫布範圍：0 到 330

        // 2. CD19-PB 的 X 軸比例尺
        const xScaleB = d3
            .scaleLinear()
            .domain([-20, 1000]) // 原始數據範圍：-20 到 1000
            .range([0, innerWidth]) // 映射到畫布範圍：0 到 330

        // 3. SS INT LIN 的 Y 軸比例尺（注意這裡的範圍是反轉的）
        const yScale = d3
            .scaleLinear()
            .domain([-20, 1000]) // 原始數據範圍：-20 到 1000
            .range([innerHeight, 0]) // 映射到畫布範圍：320 到 0（反轉是為了正確顯示 Y 軸方向）

        // 定義繪製圖表的函數，接收以下參數：
        // - svgRef: SVG 元素的參考
        // - xScale: X 軸的比例尺
        // - labelX: X 軸的標籤文字
        // - labelY: Y 軸的標籤文字
        // - accessor: 用於獲取數據點座標的函數
        function drawPlot(
            svgRef: React.RefObject<SVGSVGElement | null>,
            xScale: d3.ScaleLinear<number, number>,
            labelX: string,
            labelY: string,
            accessor: (d: { a: [number, number]; b: [number, number] }) => [number, number],
        ) {
            // 選取 SVG 元素並清空其內容
            const svg = d3.select(svgRef.current)
            svg.selectAll("*").remove()

            // 創建一個新的 g 元素作為主要繪圖區域，並設定位移以留出邊距空間
            const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

            // 創建座標軸
            // 設定 X 軸，使用 6 個刻度
            const xAxis = d3.axisBottom(xScale).ticks(6)
            // 設定 Y 軸，使用 6 個刻度
            const yAxis = d3.axisLeft(yScale).ticks(6)

            // 繪製 X 軸，位置在底部
            g.append("g").attr("transform", `translate(0,${innerHeight})`).call(xAxis)
            // 繪製 Y 軸
            g.append("g").call(yAxis)

            // 添加 X 軸標籤
            svg.append("text")
                .attr("x", width / 2) // 放在寬度中間
                .attr("y", height - 5) // 放在底部
                .attr("text-anchor", "middle") // 文字置中對齊
                .attr("font-size", 12)
                .text(labelX)

            // 添加 Y 軸標籤
            svg.append("text")
                .attr("transform", `rotate(-90)`) // 旋轉 90 度
                .attr("x", -height / 2) // 放在高度中間
                .attr("y", 15) // 距離左邊 15 像素
                .attr("text-anchor", "middle") // 文字置中對齊
                .attr("font-size", 12)
                .text(labelY)

            // 繪製數據點
            g.selectAll("circle") // 選擇所有圓點（雖然一開始沒有）
                .data(points) // 綁定數據
                .enter() // 為新數據創建元素
                .append("circle") // 添加圓形
                .attr("cx", (d) => xScale(accessor(d)[0])) // 設定 X 座標
                .attr("cy", (d) => yScale(accessor(d)[1])) // 設定 Y 座標
                .attr("r", 1) // 設定圓的半徑
                .attr("fill", "gray") // 設定填充顏色
        }

        // 如果 SVG A 存在，繪製第一個圖表（CD45-KrO vs SS INT LIN）
        if (svgARef.current) {
            drawPlot(svgARef, xScaleA, "CD45-KrO", "SS INT LIN", (d) => d.a)
        }
        // 如果 SVG B 存在，繪製第二個圖表（CD19-PB vs SS INT LIN）
        if (svgBRef.current) {
            drawPlot(svgBRef, xScaleB, "CD19-PB", "SS INT LIN", (d) => d.b)
        }
    }, [points])

    // 計算點是否在多邊形內部
    const isPointInPolygon = useCallback((point: [number, number], polygon: [number, number][]) => {
        let inside = false
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0]
            const yi = polygon[i][1]
            const xj = polygon[j][0]
            const yj = polygon[j][1]

            const intersect =
                yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
            if (intersect) inside = !inside
        }
        return inside
    }, [])

    // 計算多邊形內部的點數量
    const countPointsInPolygon = useCallback(
        (polygon: PolygonPoint[], plot: "A" | "B") => {
            // 將多邊形點轉換為繪圖座標
            const xScale =
                plot === "A"
                    ? d3.scaleLinear().domain([180, 1000]).range([0, 330])
                    : d3.scaleLinear().domain([-20, 1000]).range([0, 330])
            const yScale = d3.scaleLinear().domain([-20, 1000]).range([320, 0])

            const polygonCoords = polygon.map((p) => [xScale(p.x), yScale(p.y)] as [number, number])

            // 計算內部點數量
            return points.filter((p) => {
                const point = plot === "A" ? p.a : p.b
                return isPointInPolygon([xScale(point[0]), yScale(point[1])], polygonCoords)
            }).length
        },
        [points, isPointInPolygon],
    )

    // 繪製多邊形
    useEffect(() => {
        function drawPolygon(svgRef: React.RefObject<SVGSVGElement | null>, plot: "A" | "B") {
            const svg = d3.select(svgRef.current)
            const g = svg.select<SVGGElement>("g")

            // 清除舊的多邊形
            g.selectAll(".polygon-point").remove()
            g.selectAll(".polygon-line").remove()
            g.selectAll(".polygon-area").remove()
            g.selectAll(".polygon-label").remove()

            const xScale =
                plot === "A"
                    ? d3.scaleLinear().domain([180, 1000]).range([0, 330])
                    : d3.scaleLinear().domain([-20, 1000]).range([0, 330])
            const yScale = d3.scaleLinear().domain([-20, 1000]).range([320, 0])

            // 繪製當前正在繪製的多邊形
            if (isDrawingPolygon) {
                const pointsForThisPlot = polygonPoints.filter((p) => p.plot === plot)
                if (pointsForThisPlot.length > 0) {
                    drawSinglePolygon(g, pointsForThisPlot, xScale, yScale, newPolygonColor, "Drawing...")
                }
            }

            // 繪製已儲存的多邊形
            polygons.forEach((polygon) => {
                const pointsForThisPlot = polygon.points.filter((p) => p.plot === plot)
                if (pointsForThisPlot.length >= 3) {
                    drawSinglePolygon(g, pointsForThisPlot, xScale, yScale, polygon.color, polygon.name)
                }
            })
        }

        function drawSinglePolygon(
            g: d3.Selection<SVGGElement, unknown, null, undefined>,
            points: PolygonPoint[],
            xScale: d3.ScaleLinear<number, number>,
            yScale: d3.ScaleLinear<number, number>,
            color: string,
            name: string,
        ) {
            // 將點轉換為繪圖座標
            const polygonCoords: [number, number][] = points.map((p) => [xScale(p.x), yScale(p.y)])

            // 繪製多邊形區域
            if (points.length >= 3) {
                const polygon = d3
                    .line<[number, number]>()
                    .x((d) => d[0])
                    .y((d) => d[1])
                    .curve(d3.curveLinearClosed)

                g.append("path")
                    .attr("class", "polygon-area")
                    .attr("d", polygon(polygonCoords))
                    .attr("fill", color)
                    .attr("fill-opacity", 0.2)
                    .attr("stroke", "none")
            }

            // 繪製多邊形邊界
            if (points.length > 1) {
                const line = d3
                    .line<PolygonPoint>()
                    .x((d) => xScale(d.x))
                    .y((d) => yScale(d.y))

                g.append("path")
                    .attr("class", "polygon-line")
                    .attr("d", line(points))
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 2)
            }

            // 繪製點
            g.selectAll(".polygon-point")
                .data(points)
                .enter()
                .append("circle")
                .attr("class", "polygon-point")
                .attr("cx", (d) => xScale(d.x))
                .attr("cy", (d) => yScale(d.y))
                .attr("r", 4)
                .attr("fill", color)

            // 添加名稱標籤和點數量
            if (points.length >= 3) {
                const centroid = d3.polygonCentroid(polygonCoords)
                const pointCount = countPointsInPolygon(points, points[0].plot)

                // 添加名稱標籤
                g.append("text")
                    .attr("class", "polygon-label")
                    .attr("x", centroid[0])
                    .attr("y", centroid[1] - 10) // 向上偏移 10 像素
                    .attr("text-anchor", "middle")
                    .attr("fill", color)
                    .attr("font-weight", "bold")
                    .text(name)

                // 添加細胞數量標籤
                g.append("text")
                    .attr("class", "polygon-label")
                    .attr("x", centroid[0])
                    .attr("y", centroid[1] + 10) // 向下偏移 10 像素
                    .attr("text-anchor", "middle")
                    .attr("fill", color)
                    .attr("font-weight", "bold")
                    .text(`${pointCount} cells`)
            }
        }

        if (svgARef.current) {
            drawPolygon(svgARef, "A")
        }
        if (svgBRef.current) {
            drawPolygon(svgBRef, "B")
        }
    }, [polygonPoints, isDrawingPolygon, newPolygonColor, polygons, countPointsInPolygon])

    // 事件監聽器
    useEffect(() => {
        const svgA = svgARef.current
        const svgB = svgBRef.current

        const handleClickA = (e: MouseEvent) => handleClick(e, "A")
        const handleClickB = (e: MouseEvent) => handleClick(e, "B")

        if (isDrawingPolygon) {
            if (svgA) {
                svgA.addEventListener("click", handleClickA)
            }
            if (svgB) {
                svgB.addEventListener("click", handleClickB)
            }
        }

        return () => {
            // 清理事件監聽器
            if (svgA) {
                svgA.removeEventListener("click", handleClickA)
            }
            if (svgB) {
                svgB.removeEventListener("click", handleClickB)
            }
        }
    }, [handleClick, isDrawingPolygon])

    const handlePolygonButtonClick = useCallback(() => {
        if (isDrawingPolygon) {
            setIsDrawingPolygon(false)
        } else {
            setIsDrawingPolygon(true)
        }
    }, [isDrawingPolygon])

    const handleSavePolygon = useCallback(() => {
        if (polygonPoints.length >= 3 && newPolygonName.trim()) {
            // 儲存多邊形
            setPolygons((prev) => [
                ...prev,
                {
                    // 將多邊形的點加上第一個點，形成閉合的多邊形
                    points: [...polygonPoints, { ...polygonPoints[0] }],
                    color: newPolygonColor,
                    name: newPolygonName,
                },
            ])
            // 儲存到 localStorage
            savePolygonData({
                tagName: newPolygonName,
                color: newPolygonColor,
                polygon: polygonPoints,
            })

            // 重置狀態
            setShowPolygonDialog(false)
            setNewPolygonName("")
            setNewPolygonColor("#FF0000")
            setPolygonPoints([])
            setIsDrawingPolygon(false)
        }
    }, [polygonPoints, newPolygonColor, newPolygonName])

    return (
        <div className="flex flex-col items-center gap-8 p-4">
            <Button onClick={handlePolygonButtonClick} className={isDrawingPolygon ? "bg-red-500" : ""}>
                {isDrawingPolygon ? "Drawing..." : "Click to Draw"}
            </Button>
            <div className="flex gap-8">
                <div className="flex flex-col items-center">
                    <span className="mb-1 text-sm font-medium">Plot A (CD45-KrO vs SS INT LIN)</span>
                    <svg ref={svgARef} width={400} height={400} className="border" />
                </div>
                <div className="flex flex-col items-center">
                    <span className="mb-1 text-sm font-medium">Plot B (CD19-PB vs SS INT LIN)</span>
                    <svg ref={svgBRef} width={400} height={400} className="border" />
                </div>
            </div>
            {clickedPoint && (
                <div className="mb-4 rounded bg-gray-100 p-2">
                    Clicked at Plot {clickedPoint.plot}: X: {clickedPoint.x.toFixed(2)}, Y: {clickedPoint.y.toFixed(2)}
                </div>
            )}
            {showPolygonDialog && (
                <div className="bg-opacity-50 fixed inset-0 flex items-center justify-center bg-black">
                    <div className="rounded-lg bg-white p-6">
                        <h2 className="mb-4 text-xl font-bold">Save Polygon</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={newPolygonName}
                                onChange={(e) => setNewPolygonName(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                placeholder="Enter polygon name"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Color</label>
                            <input
                                type="color"
                                value={newPolygonColor}
                                onChange={(e) => setNewPolygonColor(e.target.value)}
                                className="mt-1 block h-10 w-full"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowPolygonDialog(false)
                                    setNewPolygonName("")
                                }}
                                className="rounded bg-gray-500 px-4 py-2 text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePolygon}
                                disabled={!newPolygonName.trim()}
                                className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
