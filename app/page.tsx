"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import { Button } from "@/components/ui/button"

const LABEL_COLORS = {
    "CD45-": "#FFC0CB", // 粉色
    Gr: "#0000FF", // 藍色
    Mo: "#00FF00", // 綠色
    Ly: "#FF0000", // 紅色
}

export default function Home() {
    const svgARef = useRef<SVGSVGElement | null>(null)
    const svgBRef = useRef<SVGSVGElement | null>(null)
    const [points, setPoints] = useState<{ a: [number, number]; b: [number, number] }[]>([])
    const [clickedPoint, setClickedPoint] = useState<{ x: number; y: number; plot: "A" | "B" } | null>(null)
    const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number; plot: "A" | "B" }[]>([])
    const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
    const [selectedLabel, setSelectedLabel] = useState<"CD45-" | "Gr" | "Mo" | "Ly" | null>(null)

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
        if (!polygonPoints.length) return

        const width = 400
        const height = 400
        const margin = { top: 40, right: 20, bottom: 40, left: 50 }
        const innerWidth = width - margin.left - margin.right
        const innerHeight = height - margin.top - margin.bottom

        const xScaleA = d3.scaleLinear().domain([180, 1000]).range([0, innerWidth])
        const xScaleB = d3.scaleLinear().domain([-20, 1000]).range([0, innerWidth])
        const yScale = d3.scaleLinear().domain([-20, 1000]).range([innerHeight, 0])

        function drawPolygon(svgRef: React.RefObject<SVGSVGElement | null>, plot: "A" | "B") {
            const svg = d3.select(svgRef.current)
            const g = svg.select("g")

            // 清除之前的多邊形
            g.selectAll(".polygon-point").remove()
            g.selectAll(".polygon-line").remove()

            const pointsForThisPlot = polygonPoints.filter((p) => p.plot === plot)
            if (!pointsForThisPlot.length) return

            const xScale = plot === "A" ? xScaleA : xScaleB
            const color = selectedLabel ? LABEL_COLORS[selectedLabel] : "red"

            // 繪製點
            g.selectAll(".polygon-point")
                .data(pointsForThisPlot)
                .enter()
                .append("circle")
                .attr("class", "polygon-point")
                .attr("cx", (d) => xScale(d.x))
                .attr("cy", (d) => yScale(d.y))
                .attr("r", 4)
                .attr("fill", color)

            // 繪製線
            if (pointsForThisPlot.length > 1) {
                const line = d3
                    .line<{ x: number; y: number }>()
                    .x((d) => xScale(d.x))
                    .y((d) => yScale(d.y))

                g.append("path")
                    .attr("class", "polygon-line")
                    .datum(pointsForThisPlot)
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 2)
                    .attr("d", line)
            }
        }

        if (svgARef.current) {
            drawPolygon(svgARef, "A")
        }
        if (svgBRef.current) {
            drawPolygon(svgBRef, "B")
        }
    }, [polygonPoints, selectedLabel])

    const handleClick = useCallback(
        (e: MouseEvent, plot: "A" | "B") => {
            const svg = plot === "A" ? svgARef.current : svgBRef.current
            if (!svg) return

            // 獲取 SVG 元素的位置和大小
            const rect = svg.getBoundingClientRect()

            // 計算相對於 SVG 的座標
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            const margin = { top: 40, right: 20, bottom: 40, left: 50 }
            const innerWidth = 400 - margin.left - margin.right
            const innerHeight = 400 - margin.top - margin.bottom

            // 計算相對於繪圖區域的座標
            const plotX = x - margin.left
            const plotY = y - margin.top

            // 確保座標在繪圖區域內
            if (plotX < 0 || plotX > innerWidth || plotY < 0 || plotY > innerHeight) return

            const xScale =
                plot === "A"
                    ? d3.scaleLinear().domain([180, 1000]).range([0, innerWidth])
                    : d3.scaleLinear().domain([-20, 1000]).range([0, innerWidth])
            const yScale = d3.scaleLinear().domain([-20, 1000]).range([innerHeight, 0])

            const dataX = xScale.invert(plotX)
            const dataY = yScale.invert(plotY)

            setClickedPoint({ x: dataX, y: dataY, plot })

            if (isDrawingPolygon && selectedLabel) {
                setPolygonPoints((prev) => [...prev, { x: dataX, y: dataY, plot }])
            }
        },
        [isDrawingPolygon, selectedLabel],
    )

    useEffect(() => {
        // 為兩個 SVG 元素添加點擊事件監聽器
        if (svgARef.current) {
            svgARef.current.addEventListener("click", (e) => handleClick(e, "A"))
        }
        if (svgBRef.current) {
            svgBRef.current.addEventListener("click", (e) => handleClick(e, "B"))
        }

        // 清理函數：移除事件監聽器，避免記憶體洩漏
        return () => {
            if (svgARef.current) {
                svgARef.current.removeEventListener("click", (e) => handleClick(e, "A"))
            }
            if (svgBRef.current) {
                svgBRef.current.removeEventListener("click", (e) => handleClick(e, "B"))
            }
        }
    }, [handleClick])

    const handleLabelClick = useCallback((label: "CD45-" | "Gr" | "Mo" | "Ly") => {
        setSelectedLabel(label)
    }, [])

    const handlePolygonButtonClick = useCallback(() => {
        if (!selectedLabel) return
        setIsDrawingPolygon(true)
        setPolygonPoints([])
    }, [selectedLabel])

    return (
        <div className="flex flex-col items-center gap-8 p-4">
            <div className="flex gap-4">
                {(["CD45-", "Gr", "Mo", "Ly"] as const).map((label) => (
                    <Button
                        key={label}
                        onClick={() => handleLabelClick(label)}
                        style={{
                            backgroundColor: LABEL_COLORS[label],
                            border: selectedLabel === label ? "2px solid black" : "none",
                        }}
                        className="text-white"
                    >
                        {label}
                    </Button>
                ))}
            </div>
            <Button
                onClick={handlePolygonButtonClick}
                disabled={!selectedLabel}
                className={!selectedLabel ? "opacity-50" : ""}
            >
                Arbitrary Polygon
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
            {/* 顯示點擊座標的區域 */}
            {clickedPoint && (
                <div className="mb-4 rounded bg-gray-100 p-2">
                    {/* 顯示點擊的是哪個圖表 */}
                    Clicked at Plot {clickedPoint.plot}: X: {clickedPoint.x.toFixed(2)}, Y: {clickedPoint.y.toFixed(2)}
                </div>
            )}
        </div>
    )
}
