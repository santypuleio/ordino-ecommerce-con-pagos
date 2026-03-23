const DEFAULT_API_BASE = "http://localhost:4000";

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, "");
}

export async function createPreference({ items }) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/create-preference`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || "No se pudo crear la preferencia";
    const err = new Error(message);
    err.details = data;
    throw err;
  }

  return data;
}

