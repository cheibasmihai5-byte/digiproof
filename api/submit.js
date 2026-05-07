const crypto = require("crypto");
const { appendResponse } = require("./_lib/github-storage");

function clean(value, maxLength = 2000) {
  return String(value || "").trim().slice(0, maxLength);
}

function parseBody(req) {
  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  return req.body || {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metoda nepermisa." });
  }

  try {
    const body = parseBody(req);
    const record = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: new Intl.DateTimeFormat("ro-RO", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Chisinau"
      }).format(new Date()),
      nume: clean(body.nume, 160),
      username: clean(body.username, 120),
      email: clean(body.email, 180),
      evaluare: clean(body.evaluare, 80),
      competente: Array.isArray(body.competente)
        ? body.competente.map((item) => clean(item, 120)).filter(Boolean)
        : [],
      activitate_utila: clean(body.activitate_utila, 160),
      experienta: clean(body.experienta, 3000)
    };

    if (!record.nume || !record.email || !record.evaluare || !record.activitate_utila || !record.experienta) {
      return res.status(400).json({ error: "Completeaza toate campurile obligatorii." });
    }

    await appendResponse(record);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Nu s-a putut salva raspunsul."
    });
  }
};
