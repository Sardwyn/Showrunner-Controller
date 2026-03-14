// components/StudioButton.jsx
import React from "react";

export default function StudioButton({ label, onClick, color = "gray", full = true, isActive = false }) {
    const colorMap = {
        gray: "bg-gray-700 hover:bg-gray-600",
        red: "bg-red-600 hover:bg-red-700",
        green: "bg-green-600 hover:bg-green-700",
        blue: "bg-blue-600 hover:bg-blue-700",
        yellow: "bg-yellow-500 hover:bg-yellow-600 text-black",
    };

    return (
        <button
            onClick={onClick}
            className={`relative ${full ? "w-full" : ""} py-2 px-4 rounded font-semibold text-white shadow transition-all duration-150 ${colorMap[color]}`}
        >
            {/* Top-right indicator pip */}
            <span
                className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full
          ${isActive ? "bg-green-400 shadow-[0_0_4px_#22c55e]" : "bg-red-500"}`}
            ></span>
            {label}
        </button>
    );
}
