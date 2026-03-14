// src/components/SequencePanel.jsx
import React, { useCallback, useEffect, useState } from "react";
import { sendCue } from "../utils/sendCue";

// Registry: UI label → Unreal sequence name + optional hotkey
const SEQUENCES = [
    { label: "Confetti", name: "Confetti", hotkey: "c" },
    { label: "Stinger", name: "Stinger", hotkey: "s" },
    { label: "Lower Third", name: "LowerThird", hotkey: "l" },
    { label: "Intro Music", name: "IntroMusic", hotkey: "i" },
    { label: "Cut to Black", name: "CutToBlack", hotkey: "b" },
    { label: "Applause", name: "Applause", hotkey: "a" },
    { label: "Sponsor Slide", name: "SponsorSlide", hotkey: "p" },
    { label: "Guest Reveal", name: "GuestReveal", hotkey: "g" },
    { label: "Roll Credits", name: "RollCredits", hotkey: "r" },
];

export default function SequencePanel() {
    const [sendingIndex, setSendingIndex] = useState(null);
    const [armedIndex, setArmedIndex] = useState(null);

    const trigger = useCallback(async (idx) => {
        const seq = SEQUENCES[idx];
        try {
            setSendingIndex(idx);
            // Your relay expects: { cue, data }
            await sendCue("SEQUENCE_TRIGGER", { name: seq.name });
            setArmedIndex(idx); // visual confirmation
            setTimeout(() => setArmedIndex(null), 800);
        } catch (e) {
            console.error("Sequence trigger failed", e);
        } finally {
            setSendingIndex(null);
        }
    }, []);

    // Hotkeys (letters listed in the registry)
    useEffect(() => {
        const onKey = (e) => {
            const el = document.activeElement;
            if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

            const key = e.key?.toLowerCase();
            const idx = SEQUENCES.findIndex((s) => s.hotkey === key);
            if (idx !== -1) {
                e.preventDefault();
                trigger(idx);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [trigger]);

    return (
        <div className="grid grid-cols-3 gap-2">
            {SEQUENCES.map((s, index) => (
                <button
                    key={s.label}
                    className={`pro-button ${armedIndex === index ? "active" : ""}`}
                    disabled={sendingIndex === index}
                    onClick={() => trigger(index)}
                    title={s.hotkey ? `Hotkey: ${s.hotkey.toUpperCase()}` : ""}
                >
                    {sendingIndex === index ? "…" : s.label}
                </button>
            ))}
        </div>
    );
}
