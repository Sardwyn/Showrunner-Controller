// utils/sendCue.js
export async function sendCue(cue, data = {}) {
    try {
        console.log("📡 Sending cue to relay:", cue, data);

        const response = await fetch('http://localhost:3030/cue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cue, data }),
        });

        if (!response.ok) {
            console.error(`❌ Cue failed: ${response.status}`);
        } else {
            console.log(`✅ Cue sent: ${cue}`, data);
        }
    } catch (err) {
        console.error("❌ Error sending cue:", err);
    }
}
