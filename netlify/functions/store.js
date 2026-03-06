const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const store = getStore("socialflow");
    const body = JSON.parse(event.body || "{}");
    const { method, path: p, value } = body;
    const key = p || "default";
    if (method === "get") {
      const data = await store.get(key, { type: "json" });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: data ?? null }) };
    }
    if (method === "set") {
      await store.setJSON(key, value);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
    if (method === "delete") {
      await store.delete(key);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown method" }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};