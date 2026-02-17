require('dotenv').config();
const { generateAiResponse } = require('./ai_service');

async function testAi() {
    console.log("🧪 Testing AI Service...");

    const queries = [
        "What is Blockverse?",
        "Which chains are supported?",
        "How do I swap tokens?"
    ];

    for (const query of queries) {
        console.log(`\nUser: ${query}`);
        const response = await generateAiResponse(query);
        console.log(`AI: ${response}`);
    }
}

testAi();
