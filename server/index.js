import express from "express";
import cors from "cors";
import chokidar from "chokidar";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "design.config.json");
const PORT = process.env.PORT || 4321;

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[server] Không đọc được design.config.json:", err.message);
    return { outputDir: "designs", contextProjects: [] };
  }
}

let config = loadConfig();
const outputDir = () => path.resolve(ROOT, config.outputDir || "designs");

// Đảm bảo thư mục output tồn tại
fs.mkdirSync(outputDir(), { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

// Thư mục lưu ảnh đính kèm
const ATTACH_DIR = path.join(ROOT, "prompts", "attachments");
fs.mkdirSync(ATTACH_DIR, { recursive: true });

// Danh sách các thiết kế (.html) trong outputDir
app.get("/api/designs", (req, res) => {
  const dir = outputDir();
  let files = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => {
        const stat = fs.statSync(path.join(dir, f));
        return { name: f, mtime: stat.mtimeMs, size: stat.size };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch (err) {
    console.error("[server] readdir lỗi:", err.message);
  }
  res.json({ outputDir: config.outputDir, designs: files });
});

// Phục vụ nội dung file design để iframe render
app.get("/designs/:name", (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(outputDir(), name);
  if (!filePath.startsWith(outputDir())) return res.status(400).end();
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(fs.readFileSync(filePath, "utf8"));
});

// Trả về config context (để UI hiển thị đang link tới dự án nào)
app.get("/api/config", (req, res) => {
  config = loadConfig();
  res.json(config);
});

// Hàng đợi prompt: browser gửi prompt -> ghi vào inbox.jsonl -> watcher của Claude xử lý
const INBOX = path.join(ROOT, "prompts", "inbox.jsonl");
fs.mkdirSync(path.dirname(INBOX), { recursive: true });
if (!fs.existsSync(INBOX)) fs.writeFileSync(INBOX, "");

// Chat: hội thoại 2 chiều giữa người dùng (canvas) và Claude
const CHAT = path.join(ROOT, "prompts", "chat.jsonl");
if (!fs.existsSync(CHAT)) fs.writeFileSync(CHAT, "");

function appendChat(msg) {
  const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ts: Date.now(), ...msg };
  fs.appendFileSync(CHAT, JSON.stringify(entry) + "\n");
  broadcast("chat", entry);
  return entry;
}

app.post("/api/prompt", (req, res) => {
  const prompt = (req.body && req.body.prompt ? String(req.body.prompt) : "").trim();
  const images = Array.isArray(req.body?.images) ? req.body.images : [];
  const targetFile = req.body?.targetFile ? path.basename(String(req.body.targetFile)) : null;
  if (!prompt && images.length === 0)
    return res.status(400).json({ error: "prompt rỗng" });

  const id = Date.now().toString(36);
  const savedImages = [];
  images.forEach((dataUrl, i) => {
    const m = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(dataUrl || "");
    if (!m) return;
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const fname = `${id}-${i}.${ext}`;
    fs.writeFileSync(path.join(ATTACH_DIR, fname), Buffer.from(m[2], "base64"));
    savedImages.push(path.join("prompts", "attachments", fname));
  });

  const entry = { id, ts: Date.now(), status: "pending", prompt, images: savedImages, targetFile };
  fs.appendFileSync(INBOX, JSON.stringify(entry) + "\n");
  appendChat({ role: "user", text: prompt, images: savedImages, targetFile });
  broadcast("prompt", { id: entry.id });
  console.log(`[inbox] + ${targetFile ? `[sửa ${targetFile}] ` : ""}${prompt.slice(0, 50)} ${savedImages.length ? `[+${savedImages.length} ảnh]` : ""}`);
  res.json({ ok: true, id: entry.id, images: savedImages });
});

// Claude POST câu trả lời / câu hỏi lại về đây -> hiện trên canvas
app.post("/api/reply", (req, res) => {
  const text = (req.body?.text ? String(req.body.text) : "").trim();
  const kind = req.body?.kind === "question" ? "question" : "message"; // "question" cần người dùng trả lời
  if (!text) return res.status(400).json({ error: "text rỗng" });
  const entry = appendChat({ role: "assistant", text, kind });
  console.log(`[reply] (${kind}) ${text.slice(0, 60)}`);
  res.json({ ok: true, id: entry.id });
});

app.get("/api/chat", (req, res) => {
  let items = [];
  try {
    items = fs.readFileSync(CHAT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {}
  res.json({ chat: items.slice(-100) });
});

app.get("/api/prompts", (req, res) => {
  let items = [];
  try {
    items = fs
      .readFileSync(INBOX, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {}
  res.json({ prompts: items.slice(-20).reverse() });
});

// SSE: đẩy sự kiện reload khi file thay đổi
const clients = new Set();
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write("event: hello\ndata: connected\n\n");
  clients.add(res);
  req.on("close", () => clients.delete(res));
});

function broadcast(event, payload) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) c.write(msg);
}

// Theo dõi thay đổi trong outputDir + config
const watcher = chokidar.watch([outputDir(), CONFIG_PATH, path.join(ROOT, "prompts")], {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
});
watcher.on("all", (evt, changed) => {
  if (changed === CONFIG_PATH) {
    config = loadConfig();
    broadcast("config", { changed });
  } else if (changed.includes(`${path.sep}prompts${path.sep}`)) {
    broadcast("promptStatus", {});
  } else {
    broadcast("change", { event: evt, file: path.basename(changed) });
  }
  console.log(`[watch] ${evt} ${path.basename(changed)}`);
});

app.listen(PORT, () => {
  console.log(`[server] Canvas API chạy tại http://localhost:${PORT}`);
  console.log(`[server] outputDir = ${outputDir()}`);
});
