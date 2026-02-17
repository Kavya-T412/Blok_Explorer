const { GoogleGenerativeAI } = require("@google/generative-ai");
const Fuse = require("fuse.js");
const fs = require("fs");
const path = require("path");

// Load knowledge base
const kbPath = path.join(__dirname, "knowledge_base.json");
const knowledgeBase = JSON.parse(fs.readFileSync(kbPath, "utf8"));

// Initialize Fuse.js for simple RAG (similarity search)
const fuse = new Fuse(knowledgeBase, {
  keys: ["title", "content"],
  threshold: 0.4,
});

// Initialize Gemini
// Supports both GEMINI_API_KEY and GOOGLE_API_KEY naming
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Retrieves relevant context from the knowledge base based on the query.
 */
function getContext(query) {
  const results = fuse.search(query);
  if (results.length === 0) return "";

  // Take top 3 relevant parts
  return results
    .slice(0, 3)
    .map((res) => `[${res.item.title}]: ${res.item.content}`)
    .join("\n\n");
}

/**
 * Generates a response using Gemini with RAG context.
 */
async function generateAiResponse(userMessage, chatHistory = []) {
  try {
    if (!apiKey) {
      return "I'm sorry, the AI service is not configured yet (API key missing). Please add GEMINI_API_KEY or GOOGLE_API_KEY to your .env file.";
    }

    const context = getContext(userMessage);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an AI assistant for "Blockverse", a multi-chain block explorer and DeFi dashboard.
Using the provided context from our documentation, answer the user's question accurately.
If the context doesn't contain the answer, use your general knowledge but mention it's not specifically in the app docs.
Keep your response professional, helpful, and concise.

CONTEXT FROM BLOCKVERSE DOCS:
${context || "No specific documentation found for this query."}

USER QUESTION: ${userMessage}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Service Error:", error);
    return "I encountered an error while processing your request. Please try again later.";
  }
}

module.exports = { generateAiResponse };
