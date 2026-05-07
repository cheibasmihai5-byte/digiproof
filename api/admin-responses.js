const crypto = require("crypto");
const { isAdmin } = require("./_lib/admin-auth");
const { readResponseRecords, readAdminLoginLogs, appendAdminLoginLog } = require("./_lib/github-storage");
const { buildRequestMeta } = require("./_lib/request-meta");

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
    const requestMeta = buildRequestMeta(req);
    const username = String(body.username || "").trim();
    const authOk = isAdmin(username, body.password);

    await appendAdminLoginLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      username,
      status: authOk ? "success" : "failed",
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      geo: requestMeta.geo
    });

    if (!authOk) {
      return res.status(401).json({ error: "Credentiale gresite." });
    }

    const [responseData, loginData] = await Promise.all([
      readResponseRecords(),
      readAdminLoginLogs()
    ]);

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      records: responseData.records || [],
      rawText: responseData.rawText || "",
      loginAudit: loginData.records || []
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Nu s-au putut incarca raspunsurile."
    });
  }
};
