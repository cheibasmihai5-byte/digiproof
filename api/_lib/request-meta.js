function readHeader(req, name) {
  const key = name.toLowerCase();
  const value = req.headers[key] ?? req.headers[name];

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value || "").trim();
}

function parseFirstIp(value) {
  if (!value) {
    return "";
  }

  return value.split(",")[0].trim();
}

function pickClientIp(req) {
  return (
    parseFirstIp(readHeader(req, "x-forwarded-for")) ||
    readHeader(req, "x-real-ip") ||
    readHeader(req, "x-vercel-forwarded-for") ||
    "Necunoscut"
  );
}

function buildGeo(req) {
  const country = readHeader(req, "x-vercel-ip-country");
  const region = readHeader(req, "x-vercel-ip-country-region");
  const city = readHeader(req, "x-vercel-ip-city");
  const postalCode = readHeader(req, "x-vercel-ip-postal-code");

  return {
    country: country || "",
    region: region || "",
    city: city || "",
    postalCode: postalCode || ""
  };
}

function buildRequestMeta(req) {
  return {
    ip: pickClientIp(req),
    userAgent: readHeader(req, "user-agent") || "Necunoscut",
    geo: buildGeo(req)
  };
}

module.exports = {
  buildRequestMeta
};
