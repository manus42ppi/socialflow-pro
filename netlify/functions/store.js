exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const body = JSON.parse(event.body || "{}");
    const { method, path: p, value } = body;
    const key = p || "default";

    // Netlify Blobs via eingebaute Context-Variablen
    const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_LOCAL_BLOB_SERVER_TOKEN;
    const blobUrl = process.env.NETLIFY_BLOBS_URL;

    // Nutze fetch (in Node 18+ eingebaut) direkt gegen Netlify Blobs API
    const apiBase = blobUrl 
      ? `${blobUrl}/${siteId}/socialflow`
      : `https://api.netlify.com/api/v1/blobs/${siteId}/socialflow`;
    
    const authHeader = token 
      ? { "Authorization": `Bearer ${token}` }
      : { "Authorization": `Bearer ${process.env.NETLIFY_API_TOKEN || ""}` };

    if (method === "get") {
      const res = await fetch(`${apiBase}/${key}`, { headers: authHeader });
      if (res.status === 404) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: null }) };
      if (!res.ok) throw new Error(`Blob get failed: ${res.status}`);
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data }) };
    }

    if (method === "set") {
      const res = await fetch(`${apiBase}/${key}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(value)
      });
      if (!res.ok) throw new Error(`Blob set failed: ${res.status}`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (method === "delete") {
      await fetch(`${apiBase}/${key}`, { method: "DELETE", headers: authHeader });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown method" }) };
  } catch (e) {
    console.error("Store error:", e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};