import React from "react";

export default function PanelCard({ title, children }) {
    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-inner text-white">
            {title && <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">{title}</h2>}
            {children}
        </div>
    );
}
