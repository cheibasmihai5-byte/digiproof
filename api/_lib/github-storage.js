const API_VERSION = "2022-11-28";

function sanitizeValue(raw, options = {}) {
  const text = String(raw || "").trim();
  const unquoted = text.replace(/^['"]|['"]$/g, "");

  if (options.stripTrailingComma) {
    return unquoted.replace(/,+$/g, "");
  }

  return unquoted;
}

function requiredEnv(name, options = {}) {
  const value = sanitizeValue(process.env[name], options);

  if (!value) {
    throw new Error(`Lipseste variabila Vercel: ${name}`);
  }

  return value;
}

function getConfig() {
  return {
    owner: requiredEnv("GITHUB_OWNER", { stripTrailingComma: true }),
    repo: requiredEnv("GITHUB_REPO", { stripTrailingComma: true }),
    token: requiredEnv("GITHUB_TOKEN"),
    branch: sanitizeValue(process.env.GITHUB_BRANCH || "main", { stripTrailingComma: true })
  };
}

function getPaths() {
  return {
    responses: sanitizeValue(process.env.RESPONSES_FILE_PATH || "data/responses.txt"),
    adminLogins: sanitizeValue(process.env.ADMIN_LOG_FILE_PATH || "data/admin-logins.txt")
  };
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function getHeaders(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "User-Agent": "digiprof-feedback-form",
    "X-GitHub-Api-Version": API_VERSION
  };
}

function buildGitHubError(status, data, config) {
  const message = (data && data.message) ? data.message : "";

  if (status === 401) {
    return new Error("Tokenul GitHub este invalid. Verifica GITHUB_TOKEN.");
  }

  if (status === 403) {
    return new Error("Acces refuzat de GitHub. Verifica permisiunile tokenului (Contents: Read and write).");
  }

  if (status === 404) {
    return new Error(
      `GitHub nu gaseste repository-ul sau nu ai acces. Verifica GITHUB_OWNER=${config.owner}, GITHUB_REPO=${config.repo}, GITHUB_BRANCH=${config.branch} si GITHUB_TOKEN.`
    );
  }

  return new Error(message || "Eroare la comunicarea cu GitHub.");
}

async function readResponsesFile() {
  const config = getConfig();
  const paths = getPaths();
  const filePath = paths.responses;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodePath(filePath)}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, {
    headers: getHeaders(config.token)
  });

  if (response.status === 404) {
    return {
      text: "",
      sha: null,
      config
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Nu s-a putut citi fisierul TXT din GitHub.");
  }

  return {
    text: Buffer.from(data.content || "", "base64").toString("utf8"),
    sha: data.sha,
    config,
    filePath
  };
}

async function readTextFile(filePath) {
  const config = getConfig();
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodePath(filePath)}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, {
    headers: getHeaders(config.token)
  });

  if (response.status === 404) {
    return {
      text: "",
      sha: null,
      config,
      filePath
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = buildGitHubError(response.status, data, config);
    error.status = response.status;
    throw error;
  }

  return {
    text: Buffer.from(data.content || "", "base64").toString("utf8"),
    sha: data.sha,
    config,
    filePath
  };
}

async function writeTextFile(text, sha, config, filePath, commitMessage) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodePath(filePath)}`;
  const body = {
    message: commitMessage,
    content: Buffer.from(text, "utf8").toString("base64"),
    branch: config.branch
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...getHeaders(config.token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = buildGitHubError(response.status, data, config);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function appendJsonLine(filePath, record, commitMessage) {
  const line = JSON.stringify(record);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const current = await readTextFile(filePath);
    const nextText = `${current.text}${current.text.endsWith("\n") || !current.text ? "" : "\n"}${line}\n`;

    try {
      await writeTextFile(nextText, current.sha, current.config, filePath, commitMessage);
      return;
    } catch (error) {
      if (error.status === 409 && attempt < 3) {
        continue;
      }

      throw error;
    }
  }
}

function parseJsonLines(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

async function readJsonLineRecords(filePath) {
  const current = await readTextFile(filePath);
  const records = parseJsonLines(current.text).reverse();

  return {
    records,
    rawText: current.text
  };
}

async function appendResponse(record) {
  const paths = getPaths();
  await appendJsonLine(paths.responses, record, "Save DigiProf feedback response");
}

async function appendAdminLoginLog(record) {
  const paths = getPaths();
  await appendJsonLine(paths.adminLogins, record, "Save DigiProf admin login event");
}

async function readResponseRecords() {
  const paths = getPaths();
  return readJsonLineRecords(paths.responses);
}

async function readAdminLoginLogs() {
  const paths = getPaths();
  return readJsonLineRecords(paths.adminLogins);
}

async function readRawFile(filePath) {
  return readTextFile(filePath);
}

async function readLegacyResponsesFile() {
  const current = await readResponsesFile();
  const records = current.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();

  return {
    records,
    rawText: current.text
  };
}

module.exports = {
  appendResponse,
  readResponseRecords,
  appendAdminLoginLog,
  readAdminLoginLogs,
  readRawFile,
  getPaths,
  readLegacyResponsesFile
};
