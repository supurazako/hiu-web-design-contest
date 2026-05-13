import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";

const distDir = new URL("../dist/", import.meta.url);
const astroDir = new URL("./_astro/", distDir);

const textExtensions = new Set([".css", ".html", ".js", ".mjs"]);

const rewriteHtml = (source) =>
  source
    .replaceAll('href="/_astro/', 'href="./_astro/')
    .replaceAll('src="/_astro/', 'src="./_astro/')
    .replaceAll('component-url="/_astro/', 'component-url="./_astro/')
    .replaceAll('renderer-url="/_astro/', 'renderer-url="./_astro/')
    .replaceAll('before-hydration-url="/_astro/', 'before-hydration-url="./_astro/');

const rewriteAssetChunk = (source) =>
  source
    .replaceAll("url(/_astro/", "url(./")
    .replaceAll('"/_astro/', '"./')
    .replaceAll("'/_astro/", "'./")
    .replaceAll("`/_astro/", "`./");

const rewriteFile = async (fileUrl, rewriter) => {
  const source = await readFile(fileUrl, "utf8");
  const rewritten = rewriter(source);
  if (rewritten !== source) {
    await writeFile(fileUrl, rewritten);
  }
};

const rewriteAstroDir = async (dirUrl) => {
  const entries = await readdir(dirUrl, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryUrl = new URL(entry.name, dirUrl);

      if (entry.isDirectory()) {
        await rewriteAstroDir(new URL(`${entry.name}/`, dirUrl));
        return;
      }

      if (!entry.isFile() || !textExtensions.has(extname(entry.name))) return;
      await rewriteFile(entryUrl, rewriteAssetChunk);
    }),
  );
};

await rewriteFile(new URL("./index.html", distDir), rewriteHtml);
await rewriteAstroDir(astroDir);
