const { isAdmin } = require("./_lib/admin-auth");
const { readResponseRecords } = require("./_lib/github-storage");

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

    if (!isAdmin(body.username, body.password)) {
      return res.status(401).json({ error: "Credentiale gresite." });
    }

    const data = await readResponseRecords();
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Nu s-au putut incarca raspunsurile."
    });
  }
};
