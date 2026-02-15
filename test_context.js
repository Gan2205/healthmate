// Native fetch is available in Node.js 18+
// Actually, modern Node.js has built-in fetch.

async function testContext() {
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "What is my name and heart rate?",
                userContext: {
                    name: "John Doe",
                    sugarLevel: "120 mg/dL",
                    heartRate: "72 bpm"
                }
            })
        });
        const data = await response.json();
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}

testContext();
