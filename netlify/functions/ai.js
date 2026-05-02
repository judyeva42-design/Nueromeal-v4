// NeuroMeal v4 — Secure Claude AI Proxy .
// API key lives ONLY here, never in the frontend
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const allowedOrigins = [
    process.env.URL,
    process.env.DEPLOY_URL,
    "http://localhost:8888",
    "http://localhost:3000",
  ].filter(Boolean);

  const origin = event.headers.origin || "";
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";

  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "API key not configured. Add ANTHROPIC_API_KEY to Netlify environment variables." }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { messages, system, max_tokens = 1000 } = body;

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body" }) };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens,
        system: system || "You are NeuroMeal AI, a helpful family meal planning assistant.",
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return { statusCode: response.status, headers, body: JSON.stringify({ error: "AI service error. Please try again." }) };
    }

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal server error. Please try again." }) };
  }
};
