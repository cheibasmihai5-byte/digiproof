const API_VERSION = "2022-11-28";

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Lipseste variabila Vercel: ${name}`);
  }

  return value;
}

function getConfig() {
  return {
    owner: requiredEnv("GITHUB_OWNER"),
    repo: requiredEnv("GITHUB_REPO"),
    token: requiredEnv("GITHUB_TOKEN"),
    branch: process.env.GITHUB_BRANCH || "main",
    path: process.env.RESPONSES_FILE_PATH || "data/responses.txt"
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
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodePath(config.path)}?ref=${encodeURIComponent(config.branch)}`;
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
    config
  };
}

async function writeResponsesFile(text, sha, config) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodePath(config.path)}`;
  const body = {
    message: "Save DigiProf feedback response",
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

async function appendResponse(record) {
  const line = JSON.stringify(record);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const current = await readResponsesFile();
    const nextText = `${current.text}${current.text.endsWith("\n") || !current.text ? "" : "\n"}${line}\n`;

    try {
      await writeResponsesFile(nextText, current.sha, current.config);
      return;
    } catch (error) {
      if (error.status === 409 && attempt < 3) {
        continue;
      }

      throw error;
    }
  }
}

async function readResponseRecords() {
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
  readResponseRecords
};
