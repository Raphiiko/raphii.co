import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../src/content/docs/vrti/Changelog");

async function fetchReleases() {
  console.log("Fetching releases from GitHub...");
  const headers = {
    "User-Agent": "Raphiiko-Docs-Builder",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(
    "https://api.github.com/repos/Raphiiko/VRTI-Releases/releases",
    {
      headers,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch releases: ${response.status} ${response.statusText}`,
    );
  }
  return await response.json();
}

async function generateReleaseFiles() {
  try {
    // Ensure directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Clear existing files to remove stale releases
    const files = await fs.readdir(OUTPUT_DIR);
    for (const file of files) {
      if (file.endsWith(".md") || file.endsWith(".mdx")) {
        await fs.unlink(path.join(OUTPUT_DIR, file));
      }
    }

    const releases = await fetchReleases();

    if (!Array.isArray(releases)) {
      throw new Error("GitHub API response is not an array");
    }

    console.log(`Found ${releases.length} releases.`);

    // Group releases by minor version
    const groups = {};
    const versionRegex = /(?:vrti-)?v?(\d+)\.(\d+)\.(\d+)/i;

    for (const release of releases) {
      const match = versionRegex.exec(release.tag_name);
      if (match) {
        const [_, major, minor] = match;
        const key = `${major}.${minor}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(release);
      } else {
        // Fallback for non-standard tags, group them under 'other' or handle appropriately
        // For now, let's treat them as individual groups or skip?
        // Let's create a specific group for them using the tag itself if it doesn't match
        const key = "other";
        if (!groups[key]) groups[key] = [];
        groups[key].push(release);
      }
    }

    // Sort groups keys to ensure ordering (Newest versions first)
    // We assume major.minor format. 'other' goes last.
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "other") return 1;
      if (b === "other") return -1;
      const [majA, minA] = a.split(".").map(Number);
      const [majB, minB] = b.split(".").map(Number);
      if (majA !== majB) return majB - majA;
      return minB - minA;
    });

    for (const [index, key] of sortedKeys.entries()) {
      const groupReleases = groups[key];
      // Ensure releases within group are sorted newest first.
      // GitHub API usually returns newest first, but let's assume they are.

      const latestRelease = groupReleases[0];
      const { tag_name, name } = latestRelease;

      // Filename based on latest version
      const safeName = tag_name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${safeName}.mdx`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      // Sidebar label: Latest version (e.g. v0.2.6)
      const label = tag_name.replace(/^VRTI[- ]?/, "");

      // Page Title: Group (Minor) version (e.g. VRTI v0.2)
      const pageTitle = key === "other" ? "Other Releases" : `VRTI v${key}`;

      let fileBody = `---
title: "${pageTitle}"
description: Release notes for ${label}
sidebar:
  label: "${label}"
  order: ${index}
---
`;

      // Append all releases in this group
      // Iterate in reverse (oldest to newest)
      for (const release of groupReleases.slice().reverse()) {
        const releaseTitle = release.name || release.tag_name;
        // Strip VRTI prefix (hyphen or space) and optional 'v' if we want to standardize,
        // but user specifically asked to drop "VRTI" part, leaving "v0.2.5".
        const displayTitle = releaseTitle.replace(/^VRTI[- ]?/, "");

        fileBody += `
## ${displayTitle}

${release.body || "*No release notes provided.*"}

---
`;
      }

      await fs.writeFile(filePath, fileBody, "utf-8");
      console.log(
        `Generated ${fileName} (contains ${groupReleases.length} releases)`,
      );
    }

    console.log("Release notes generation complete.");
  } catch (error) {
    console.error("Error generating release notes:", error);
    process.exit(1);
  }
}

generateReleaseFiles();
