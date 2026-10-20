import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
export function createServer(
  root = fileURLToPath(new URL("./", import.meta.url))
) {
  return http.createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        return res.end();
      }
      let pathname;
      try {
        pathname = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname
        );
      } catch {
        res.writeHead(400);
        return res.end();
      }
      if (pathname === "/" || pathname === "/biziva") {
        res.writeHead(302, { Location: "/biziva/" });
        return res.end();
      }
      if (
        !pathname.startsWith("/biziva/") ||
        pathname.includes("\\") ||
        pathname.includes("\0")
      ) {
        res.writeHead(404);
        return res.end();
      }
      let rel = pathname.slice("/biziva/".length) || "index.html";
      if (
        rel.split("/").includes("..") ||
        ![
          "index.html",
          "app.mjs",
          "logic.mjs",
          "brand.css",
          "brand.svg"
        ].includes(rel)
      ) {
        res.writeHead(404);
        return res.end();
      }
      const b = await readFile(path.join(root, rel));
      const mime = {
        ".html": "text/html; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml"
      }[path.extname(rel)];
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
      });
      res.end(req.method === "HEAD" ? undefined : b);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 8891);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error("PORT inválida");
  createServer().listen(port, "127.0.0.1", () =>
    console.log("Biziva local: http://127.0.0.1:" + port + "/biziva/")
  );
}
