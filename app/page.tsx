"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

export default function Home() {
    const svgARef = useRef<SVGSVGElement | null>(null)
    const svgBRef = useRef<SVGSVGElement | null>(null)
    const [points, setPoints] = useState<{ a: [number, number]; b: [number, number] }[]>([])

    useEffect(() => {
        d3.csv("/CD45_pos.csv", (d) => {
            const xA = parseFloat(d["CD45-KrO"] ?? "")
            const xB = parseFloat(d["CD19-PB"] ?? "")
            const y = parseFloat(d["SS INT LIN"] ?? "")

            if (!isNaN(xA) && !isNaN(xB) && !isNaN(y)) {
                return { a: [xA, y], b: [xB, y] }
            }
            return null
        }).then((data) => {
            setPoints(data.filter(Boolean) as { a: [number, number]; b: [number, number] }[])
        })
    }, [])

    useEffect(() => {
        const width = 400
        const height = 400

        const svgA = d3.select(svgARef.current)
        const svgB = d3.select(svgBRef.current)
        svgA.selectAll("*").remove()
        svgB.selectAll("*").remove()

        const xScaleA = d3.scaleLinear().domain([200, 1000]).range([0, width])
        const xScaleB = d3.scaleLinear().domain([0, 1000]).range([0, width])
        const yScale = d3.scaleLinear().domain([0, 1000]).range([height, 0])

        svgA.selectAll("circle")
            .data(points)
            .enter()
            .append("circle")
            .attr("cx", (d) => xScaleA(d.a[0]))
            .attr("cy", (d) => yScale(d.a[1]))
            .attr("r", 3)
            .attr("fill", "gray")

        svgB.selectAll("circle")
            .data(points)
            .enter()
            .append("circle")
            .attr("cx", (d) => xScaleB(d.b[0]))
            .attr("cy", (d) => yScale(d.b[1]))
            .attr("r", 3)
            .attr("fill", "gray")
    }, [points])

    return (
        <div className="flex flex-col items-center gap-8 p-4">
            <h1 className="text-xl font-semibold">Plot A (CD45-KrO vs SS INT LIN)</h1>
            <svg ref={svgARef} width={400} height={400} className="border" />

            <h1 className="text-xl font-semibold">Plot B (CD19-PB vs SS INT LIN)</h1>
            <svg ref={svgBRef} width={400} height={400} className="border" />
        </div>
    )
}
