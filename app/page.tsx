"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

export default function Home() {
    const svgARef = useRef<SVGSVGElement | null>(null)
    const svgBRef = useRef<SVGSVGElement | null>(null)
    const [points, setPoints] = useState<{ a: [number, number]; b: [number, number] }[]>([])

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

    useEffect(() => {
        // 設定圖表的寬度和高度
        const width = 400
        const height = 400

        // 選取兩個 SVG 元素並清除其內容
        const svgA = d3.select(svgARef.current)
        const svgB = d3.select(svgBRef.current)
        svgA.selectAll("*").remove()
        svgB.selectAll("*").remove()

        // 設定比例尺（Scale）
        // xScaleA：將 CD45-KrO 的數值（200-1000）映射到畫布寬度（0-400）
        const xScaleA = d3.scaleLinear().domain([200, 1000]).range([0, width])
        // xScaleB：將 CD19-PB 的數值（0-1000）映射到畫布寬度（0-400）
        const xScaleB = d3.scaleLinear().domain([0, 1000]).range([0, width])
        // yScale：將 SS INT LIN 的數值（0-1000）映射到畫布高度（400-0，注意是反轉的）
        const yScale = d3.scaleLinear().domain([0, 1000]).range([height, 0])

        // 繪製第一個散點圖（Plot A）
        svgA.selectAll("circle") // 選擇所有圓點（雖然一開始沒有）
            .data(points) // 綁定數據
            .enter() // 為新數據創建元素
            .append("circle") // 添加圓形
            .attr("cx", (d) => xScaleA(d.a[0])) // 設定 x 座標
            .attr("cy", (d) => yScale(d.a[1])) // 設定 y 座標
            .attr("r", 3) // 設定圓的半徑
            .attr("fill", "gray") // 設定填充顏色

        // 繪製第二個散點圖（Plot B），邏輯同上
        svgB.selectAll("circle")
            .data(points)
            .enter()
            .append("circle")
            .attr("cx", (d) => xScaleB(d.b[0]))
            .attr("cy", (d) => yScale(d.b[1]))
            .attr("r", 3)
            .attr("fill", "gray")
    }, [points]) // 當 points 數據變化時重新執行

    return (
        <div className="flex flex-col items-center gap-8 p-4">
            <h1 className="text-xl font-semibold">Plot A (CD45-KrO vs SS INT LIN)</h1>
            <svg ref={svgARef} width={400} height={400} className="border" />

            <h1 className="text-xl font-semibold">Plot B (CD19-PB vs SS INT LIN)</h1>
            <svg ref={svgBRef} width={400} height={400} className="border" />
        </div>
    )
}
