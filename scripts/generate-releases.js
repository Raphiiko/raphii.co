import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../src/content/docs/vrti/Changelog");
const execFileAsync = promisify(execFile);

const CHANGELOG_REPO_OWNER = "Raphiiko";
const CHANGELOG_REPO_NAME = "VRTI";
const CHANGELOG_REPO_REF = process.env.VRTI_CHANGELOG_REF || "main";
const CHANGELOG_REPO_PATH = process.env.VRTI_CHANGELOG_PATH || "CHANGELOG.md";
const CHANGELOG_FILE = process.env.VRTI_CHANGELOG_FILE;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

function createUnavailableError(message) {
  const error = new Error(message);
  error.code = "CHANGELOG_SOURCE_UNAVAILABLE";
  return error;
}

function compareVersions(a, b) {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] !== bParts[i]) {
      return aParts[i] - bParts[i];
    }
  }

  return 0;
}

function extractVersion(line) {
  if (!line.startsWith("## ")) {
    return null;
  }

  const match = line.match(/\b(\d+\.\d+\.\d+)\b/);
  return match ? match[1] : null;
}

function parseChangelog(markdown) {
  const sections = [];
  let currentSection = null;

  for (const line of markdown.split(/\r?\n/)) {
    const version = extractVersion(line);
    if (version) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        version,
        lines: [],
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    throw new Error("No version sections were found in CHANGELOG.md");
  }

  return sections.map((section) => ({
    version: section.version,
    body: section.lines.join("\n").trim() || "*No release notes provided.*",
  }));
}

function buildReleaseFiles(sections) {
  const groups = new Map();

  for (const section of sections) {
    const [major, minor] = section.version.split(".");
    const key = `${major}.${minor}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(section);
  }

  const sortedGroupKeys = [...groups.keys()].sort((a, b) => {
    const [aMajor, aMinor] = a.split(".").map(Number);
    const [bMajor, bMinor] = b.split(".").map(Number);

    if (aMajor !== bMajor) {
      return bMajor - aMajor;
    }

    return bMinor - aMinor;
  });

  return sortedGroupKeys.map((key, index) => {
    const groupSections = groups
      .get(key)
      .slice()
      .sort((a, b) => compareVersions(a.version, b.version));
    const latestVersion = groupSections[groupSections.length - 1].version;
    const fileName = `VRTI-v${latestVersion}.mdx`;

    let body = `---
title: "VRTI v${key}"
description: Release notes for v${latestVersion}
sidebar:
  label: "v${latestVersion}"
  order: ${index}
---
`;

    for (const section of groupSections) {
      body += `
## v${section.version}

${section.body}

---
`;
    }

    return {
      fileName,
      body,
    };
  });
}

async function hasExistingReleaseFiles() {
  try {
    const files = await fs.readdir(OUTPUT_DIR);
    return files.some((file) => file.endsWith(".md") || file.endsWith(".mdx"));
  } catch {
    return false;
  }
}

async function readLocalChangelog(filePath) {
  const resolvedPath = path.resolve(filePath);
  console.log(`Reading changelog from ${resolvedPath}...`);
  return fs.readFile(resolvedPath, "utf-8");
}

async function fetchGitHubChangelog() {
  try {
    console.log(
      `Fetching ${CHANGELOG_REPO_PATH} from ${CHANGELOG_REPO_OWNER}/${CHANGELOG_REPO_NAME}@${CHANGELOG_REPO_REF} via GitHub CLI...`,
    );

    const { stdout } = await execFileAsync(
      "gh",
      [
        "api",
        `repos/${CHANGELOG_REPO_OWNER}/${CHANGELOG_REPO_NAME}/contents/${CHANGELOG_REPO_PATH}?ref=${CHANGELOG_REPO_REF}`,
        "-H",
        "Accept: application/vnd.github.raw+json",
      ],
      { maxBuffer: 10 * 1024 * 1024 },
    );

    if (stdout.trim().length > 0) {
      return stdout;
    }
  } catch (error) {
    console.warn(`GitHub CLI fetch failed: ${error.message}`);
  }

  console.log(
    `Fetching ${CHANGELOG_REPO_PATH} from ${CHANGELOG_REPO_OWNER}/${CHANGELOG_REPO_NAME}@${CHANGELOG_REPO_REF} via GitHub API token fallback...`,
  );

  const headers = {
    Accept: "application/vnd.github.raw+json",
    "User-Agent": "Raphiiko-Docs-Builder",
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${CHANGELOG_REPO_OWNER}/${CHANGELOG_REPO_NAME}/contents/${CHANGELOG_REPO_PATH}?ref=${CHANGELOG_REPO_REF}`,
    { headers },
  );

  if (!response.ok) {
    throw createUnavailableError(
      `Failed to fetch changelog: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

async function loadChangelog() {
  if (CHANGELOG_FILE) {
    return readLocalChangelog(CHANGELOG_FILE);
  }

  return fetchGitHubChangelog();
}

async function writeReleaseFiles(files) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const existingFiles = await fs.readdir(OUTPUT_DIR);
  const nextFiles = new Set(files.map((file) => file.fileName));

  for (const file of files) {
    await fs.writeFile(path.join(OUTPUT_DIR, file.fileName), file.body, "utf-8");
    console.log(`Generated ${file.fileName}`);
  }

  for (const file of existingFiles) {
    if ((file.endsWith(".md") || file.endsWith(".mdx")) && !nextFiles.has(file)) {
      await fs.unlink(path.join(OUTPUT_DIR, file));
      console.log(`Removed stale ${file}`);
    }
  }
}

async function generateReleaseFiles() {
  try {
    const changelog = await loadChangelog();
    const sections = parseChangelog(changelog);
    const files = buildReleaseFiles(sections);

    await writeReleaseFiles(files);
    console.log(`Generated ${files.length} patch note files.`);
  } catch (error) {
    if (
      error.code === "CHANGELOG_SOURCE_UNAVAILABLE" &&
      (await hasExistingReleaseFiles())
    ) {
      console.warn(
        `Skipping patch notes generation: ${error.message}. Existing generated files were left unchanged.`,
      );
      return;
    }

    console.error("Error generating release files:", error);
    process.exit(1);
  }
}

generateReleaseFiles();
