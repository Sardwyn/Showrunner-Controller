import React, { useState } from "react";

const items = [
    "Opening Sequence",
    "Host Intro",
    "Segment 1",
    "Ad Break",
    "Segment 2",
    "Closing"
];

export default function RundownPanel() {
    const [prerundown, setPrerundown] = useState([]);
    const [breakdown, setBreakdown] = useState([]);
    const [rundown, setRundown] = useState([]);

    const handleRightClick = (e, item) => {
        e.preventDefault();
        if (!prerundown.includes(item) && !rundown.includes(item)) {
            setPrerundown([...prerundown, item]);
        }
    };

    const promoteToRundown = (item) => {
        setPrerundown(prerundown.filter(i => i !== item));
        setRundown([...rundown, item]);
        setBreakdown([item, ...breakdown]);
    };

    return (
        <div className="grid grid-cols-3 gap-4 h-full">
            {/* Breakdown */}
            <div className="col-span-1 bg-gray-800 p-4 rounded shadow text-white overflow-y-auto">
                <h2 className="text-lg font-bold mb-2">Breakdown</h2>
                <p className="text-sm opacity-60 mb-2">Click any item to add it back to the prerundown.</p>
                {breakdown.map(item => (
                    <div
                        key={`history-${item}-${Math.random()}`}
                        className="pro-button mb-1 cursor-pointer"
                        onClick={(e) => handleRightClick(e, item)}
                    >
                        {item}
                    </div>
                ))}
            </div>

            {/* Prerundown */}
            <div className="col-span-1 bg-gray-800 p-4 rounded shadow text-white overflow-y-auto">
                <h2 className="text-lg font-bold mb-2">Prerundown</h2>
                <p className="text-sm opacity-60 mb-2">Click an item to promote it to the Rundown.</p>
                {prerundown.map(item => (
                    <div
                        key={item}
                        className="pro-button mb-1 cursor-pointer"
                        onClick={() => promoteToRundown(item)}
                    >
                        {item}
                    </div>
                ))}
            </div>

            {/* Rundown */}
            <div className="col-span-1 bg-gray-800 p-4 rounded shadow text-white overflow-y-auto">
                <h2 className="text-lg font-bold mb-2">Rundown</h2>
                {rundown.map(item => (
                    <div key={item} className="pro-button mb-1">
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}
