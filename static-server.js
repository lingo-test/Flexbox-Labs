/**
 * 零依赖静态文件服务器：托管 `next build`（output: "export") 生成的 dist/ 产物。
 *
 * 特性：
 * - 监听 0.0.0.0，端口取环境变量 PORT（默认 3001）
 * - 前缀容错：网关无论是否剥离 /_sandbox/<id>/preview 之类的路径前缀，
 *   都会逐级剥离路径段直到命中 dist/ 下的真实文件
 * - 干净 URL：/grid -> grid.html / grid/index.html
 * - HTML 不缓存（保证资源引用始终最新），/_next/ 静态资源长缓存
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
   ".html": "text/html; charset=utf-8",
   ".js": "application/javascript; charset=utf-8",
   ".css": "text/css; charset=utf-8",
   ".json": "application/json; charset=utf-8",
   ".txt": "text/plain; charset=utf-8",
   ".map": "application/json; charset=utf-8",
   ".svg": "image/svg+xml",
   ".png": "image/png",
   ".jpg": "image/jpeg",
   ".jpeg": "image/jpeg",
   ".gif": "image/gif",
   ".webp": "image/webp",
   ".ico": "image/x-icon",
   ".woff": "font/woff",
   ".woff2": "font/woff2",
   ".ttf": "font/ttf",
   ".webmanifest": "application/manifest+json",
};

function safeDecode(value) {
   try {
      return decodeURIComponent(value);
   } catch {
      return value;
   }
}

/** 在 dist 内解析相对路径：依次尝试精确文件、+.html、+/index.html，并防止目录穿越 */
function resolveFile(rel) {
   const candidates = [rel, `${rel}.html`, path.posix.join(rel, "index.html")];
   for (const candidate of candidates) {
      const full = path.normalize(path.join(ROOT, candidate));
      if (full !== ROOT && !full.startsWith(ROOT + path.sep)) continue;
      try {
         if (fs.statSync(full).isFile()) return full;
      } catch {
         // 不存在则继续尝试下一个候选
      }
   }
   return null;
}

/** 逐级剥离前缀路径段，兼容带任意路径前缀的反向代理 */
function resolveRequest(urlPath) {
   const rel = safeDecode(urlPath).replace(/^\/+/, "");
   const segments = rel.split("/");
   for (let i = 0; i < segments.length; i += 1) {
      const hit = resolveFile(segments.slice(i).join("/"));
      if (hit) return hit;
   }
   return null;
}

function sendFile(res, filePath, status = 200) {
   const ext = path.extname(filePath).toLowerCase();
   const cacheControl = filePath.includes(`${path.sep}_next${path.sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache";
   res.writeHead(status, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": cacheControl,
   });
   if (res.req.method === "HEAD") {
      res.end();
      return;
   }
   fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
   const urlPath = (req.url || "/").split("?")[0];

   if (urlPath.startsWith("/_next/webpack-hmr")) {
      // 静态托管不需要 HMR，直接结束避免代理层挂起
      res.writeHead(204);
      res.end();
      return;
   }

   const filePath = resolveRequest(urlPath);
   if (filePath) {
      sendFile(res, filePath);
      return;
   }

   const notFound = resolveFile("404");
   if (notFound) {
      sendFile(res, notFound, 404);
   } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
   }
});

server.listen(PORT, HOST, () => {
   console.log(`static-server listening on http://${HOST}:${PORT} (root: ${ROOT})`);
});
