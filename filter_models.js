const fs = require('fs');
try {
    const data = fs.readFileSync('models_new_key.json', 'utf8');
    // The previous output might be messy or have extra text. Let's try to parse it if valid JSON, 
    // or just regex search if it's text dump.
    // Given previous output looked like JSON array...

    // Let's just regex for model names to be safe against bad JSON
    const regex = /"name":\s*"models\/([^"]*)"/g;
    let match;
    const models = [];
    while ((match = regex.exec(data)) !== null) {
        models.push(match[1]);
    }

    console.log("Found models:", models);

    const flashModels = models.filter(m => m.includes('flash'));
    console.log("Flash models:", flashModels);

    const twoPointZero = models.filter(m => m.includes('2.0') || m.includes('2.5'));
    console.log("2.x models:", twoPointZero);

} catch (e) {
    console.error("Error:", e.message);
}
