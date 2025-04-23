"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import { Button } from "@/components/ui/button"

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
    const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([])
    const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
    const [polygons, setPolygons] = useState<Polygon[]>([])
    const [showPolygonDialog, setShowPolygonDialog] = useState(false)
    const [newPolygonColor, setNewPolygonColor] = useState("#FF0000")
    const [newPolygonName, setNewPolygonName] = useState("")
    const [tempPolygon, setTempPolygon] = useState<PolygonPoint[]>([])

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
                    if (currentPoints.length > 0) {
                        const firstPoint = currentPoints[0]
                        const distance = Math.sqrt(
                            Math.pow(plotX - xScale(firstPoint.x), 2) + Math.pow(plotY - yScale(firstPoint.y), 2),
                        )

                        if (distance < 20) {
                            if (currentPoints.length >= 3) {
                                setTempPolygon([...currentPoints, { ...firstPoint }])
                                setShowPolygonDialog(true)
                            }
                            setIsDrawingPolygon(false)
                            return []
                        }
                    }
                    return [...currentPoints, { x: dataX, y: dataY, plot }]
                })
            }
        },
        [isDrawingPolygon],
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

    // 繪製多邊形
    useEffect(() => {
        function drawPolygon(svgRef: React.RefObject<SVGSVGElement | null>, plot: "A" | "B") {
            const svg = d3.select(svgRef.current)
            const g = svg.select("g")

            g.selectAll(".polygon-point").remove()
            g.selectAll(".polygon-line").remove()
            g.selectAll(".polygon-area").remove()
            g.selectAll(".polygon-area-text").remove()

            // 繪製已保存的多邊形
            polygons.forEach((polygon) => {
                const pointsForThisPlot: PolygonPoint[] = polygon.points.filter((p: PolygonPoint) => p.plot === plot)
                if (!pointsForThisPlot.length) return

                const xScale =
                    plot === "A"
                        ? d3.scaleLinear().domain([180, 1000]).range([0, 330])
                        : d3.scaleLinear().domain([-20, 1000]).range([0, 330])
                const yScale = d3.scaleLinear().domain([-20, 1000]).range([320, 0])
                const color = polygon.color

                // 將點轉換為繪圖座標
                const polygonCoords: [number, number][] = pointsForThisPlot.map((p: PolygonPoint) => [
                    xScale(p.x),
                    yScale(p.y),
                ])

                // 繪製多邊形區域
                if (pointsForThisPlot.length >= 3) {
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
                if (pointsForThisPlot.length > 1) {
                    const line = d3
                        .line<PolygonPoint>()
                        .x((d) => xScale(d.x))
                        .y((d) => yScale(d.y))

                    g.append("path")
                        .attr("class", "polygon-line")
                        .attr("d", line(pointsForThisPlot))
                        .attr("fill", "none")
                        .attr("stroke", color)
                        .attr("stroke-width", 2)
                }

                // 繪製點
                g.selectAll(".polygon-point")
                    .data(pointsForThisPlot)
                    .enter()
                    .append("circle")
                    .attr("class", "polygon-point")
                    .attr("cx", (d: PolygonPoint) => xScale(d.x))
                    .attr("cy", (d: PolygonPoint) => yScale(d.y))
                    .attr("r", 4)
                    .attr("fill", color)
            })

            // 繪製當前正在繪製的多邊形
            if (isDrawingPolygon) {
                const pointsForThisPlot: PolygonPoint[] = polygonPoints.filter((p: PolygonPoint) => p.plot === plot)
                if (!pointsForThisPlot.length) return

                const xScale =
                    plot === "A"
                        ? d3.scaleLinear().domain([180, 1000]).range([0, 330])
                        : d3.scaleLinear().domain([-20, 1000]).range([0, 330])
                const yScale = d3.scaleLinear().domain([-20, 1000]).range([320, 0])
                const color = newPolygonColor

                // 將點轉換為繪圖座標
                const polygonCoords: [number, number][] = pointsForThisPlot.map((p: PolygonPoint) => [
                    xScale(p.x),
                    yScale(p.y),
                ])

                // 計算多邊形面積
                const area = d3.polygonArea(polygonCoords)

                // 繪製多邊形區域
                if (pointsForThisPlot.length >= 3) {
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
                if (pointsForThisPlot.length > 1) {
                    const line = d3
                        .line<PolygonPoint>()
                        .x((d) => xScale(d.x))
                        .y((d) => yScale(d.y))

                    g.append("path")
                        .attr("class", "polygon-line")
                        .attr("d", line(pointsForThisPlot))
                        .attr("fill", "none")
                        .attr("stroke", color)
                        .attr("stroke-width", 2)
                }

                // 繪製點
                g.selectAll(".polygon-point")
                    .data(pointsForThisPlot)
                    .enter()
                    .append("circle")
                    .attr("class", "polygon-point")
                    .attr("cx", (d: PolygonPoint) => xScale(d.x))
                    .attr("cy", (d: PolygonPoint) => yScale(d.y))
                    .attr("r", 4)
                    .attr("fill", color)

                // 顯示多邊形面積
                if (pointsForThisPlot.length >= 3) {
                    const centroid = d3.polygonCentroid(polygonCoords)
                    g.append("text")
                        .attr("class", "polygon-area-text")
                        .attr("x", centroid[0])
                        .attr("y", centroid[1])
                        .attr("text-anchor", "middle")
                        .attr("fill", color)
                        .text(`Area: ${Math.abs(area).toFixed(2)}`)
                }
            }
        }

        if (svgARef.current) {
            drawPolygon(svgARef, "A")
        }
        if (svgBRef.current) {
            drawPolygon(svgBRef, "B")
        }
    }, [polygonPoints, isDrawingPolygon, polygons, newPolygonColor])

    // 事件監聽器
    useEffect(() => {
        const svgA = svgARef.current
        const svgB = svgBRef.current

        if (svgA) {
            svgA.addEventListener("click", (e) => handleClick(e, "A"))
        }
        if (svgB) {
            svgB.addEventListener("click", (e) => handleClick(e, "B"))
        }

        return () => {
            if (svgA) {
                svgA.removeEventListener("click", (e) => handleClick(e, "A"))
            }
            if (svgB) {
                svgB.removeEventListener("click", (e) => handleClick(e, "B"))
            }
        }
    }, [handleClick])

    const handlePolygonButtonClick = useCallback(() => {
        if (isDrawingPolygon) {
            // 如果正在繪製，則保存多邊形並清理
            if (polygonPoints.length >= 3) {
                setTempPolygon([...polygonPoints])
                setShowPolygonDialog(true)
            }
            setIsDrawingPolygon(false)
            setPolygonPoints([])
        } else {
            // 如果沒有在繪製，則開始繪製
            setIsDrawingPolygon(true)
            setPolygonPoints([])
        }
    }, [isDrawingPolygon, polygonPoints])

    const handleSavePolygon = useCallback(() => {
        if (tempPolygon.length >= 3 && newPolygonName.trim()) {
            setPolygons((prev) => [
                ...prev,
                { points: tempPolygon, color: newPolygonColor, name: newPolygonName.trim() },
            ])
            setShowPolygonDialog(false)
            setNewPolygonName("")
        }
    }, [tempPolygon, newPolygonColor, newPolygonName])

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
