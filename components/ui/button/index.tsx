import { ButtonHTMLAttributes } from "react"
import cn from "@/utils/cn"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost"
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                "cursor-pointer rounded-md px-4 py-2 font-medium text-white transition-colors",
                variant === "default" && "bg-blue-600 hover:bg-blue-700",
                variant === "outline" && "border border-gray-400 bg-white text-gray-700 hover:bg-gray-100",
                variant === "ghost" && "bg-transparent text-gray-700 hover:bg-gray-100",
                className,
            )}
            {...props}
        />
    )
}
