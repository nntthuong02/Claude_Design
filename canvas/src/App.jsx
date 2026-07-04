import React, { useEffect, useState, useCallback, useRef } from "react";

const VIEWPORTS = {
  Desktop: 1280,
  Tablet: 834,
  Mobile: 390,
};

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s trước`;
  if (s < 3600) return `${Math.floor(s / 60)}m trước`;
  if (s < 86400) return `${Math.floor(s / 3600)}h trước`;
  return `${Math.floor(s / 86400)}d trước`;
}

export default function App() {
  const [designs, setDesigns] = useState([]);
  const [outputDir, setOutputDir] = useState("designs");
  const [config, setConfig] = useState({ contextProjects: [] });
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(null); // {name}
  const [viewport, setViewport] = useState("Desktop");
  const [editPrompt, setEditPrompt] = useState("");
  const [editImages, setEditImages] = useState([]);
  const [editSending, setEditSending] = useState(false);
  const [editSent, setEditSent] = useState(null);
  const editFileRef = useRef(null);
  const [flashed, setFlashed] = useState({}); // name -> nonce
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState([]); // data URLs
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const fileRef = useRef(null);
  const bust = useRef(Date.now());

  const readFiles = useCallback((fileList, setter) => {
    Array.from(fileList || []).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => setter((imgs) => [...imgs, reader.result]);
      reader.readAsDataURL(file);
    });
  }, []);
  const addFiles = useCallback((fl) => readFiles(fl, setImages), [readFiles]);
  const addEditFiles = useCallback((fl) => readFiles(fl, setEditImages), [readFiles]);

  const sendEdit = useCallback(async () => {
    const p = editPrompt.trim();
    if ((!p && editImages.length === 0) || editSending || !active) return;
    setEditSending(true);
    try {
      await postPrompt({ prompt: p, images: editImages, targetFile: active.name });
      setEditSent(p || `${editImages.length} ảnh`);
      setEditPrompt("");
      setEditImages([]);
    } catch (e) {
      console.error(e);
    } finally {
      setEditSending(false);
    }
  }, [editPrompt, editImages, editSending, active, postPrompt]);

  const closeModal = useCallback(() => {
    setActive(null);
    setEditPrompt("");
    setEditImages([]);
    setEditSent(null);
  }, []);

  const postPrompt = useCallback(async ({ prompt: p, images: imgs = [], targetFile = null }) => {
    await fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: p, images: imgs, targetFile }),
    });
  }, []);

  const sendPrompt = useCallback(async () => {
    const p = prompt.trim();
    if ((!p && images.length === 0) || sending) return;
    setSending(true);
    try {
      await postPrompt({ prompt: p, images });
      setLastSent(p || `${images.length} ảnh`);
      setPrompt("");
      setImages([]);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }, [prompt, images, sending, postPrompt]);

  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        fetch("/api/designs").then((r) => r.json()),
        fetch("/api/config").then((r) => r.json()),
      ]);
      setDesigns(d.designs || []);
      setOutputDir(d.outputDir || "designs");
      setConfig(c || { contextProjects: [] });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    load();
    const es = new EventSource("/api/events");
    es.addEventListener("hello", () => setConnected(true));
    es.onerror = () => setConnected(false);
    es.addEventListener("change", (ev) => {
      const { file } = JSON.parse(ev.data);
      bust.current = Date.now();
      if (file) setFlashed((f) => ({ ...f, [file]: bust.current }));
      load();
    });
    es.addEventListener("config", () => load());
    return () => es.close();
  }, [load]);

  const src = (name) => `/designs/${encodeURIComponent(name)}?v=${flashed[name] || bust.current}`;

  return (
    <div className="app">
      <div className="topbar">
        <span className={`dot ${connected ? "" : "off"}`} />
        <h1>Local Design Canvas</h1>
        <span className="meta">{designs.length} thiết kế · {outputDir}/</span>
        <div className="spacer" />
        <button onClick={load}>↻ Làm mới</button>
      </div>

      <div className="prompt-wrap">
        <div className="prompt-bar">
          <button
            className="attach"
            title="Đính kèm ảnh"
            onClick={() => fileRef.current?.click()}
          >📎</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          <input
            className="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendPrompt()}
            onPaste={(e) => {
              const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
              if (imgs.length) { e.preventDefault(); addFiles(imgs); }
            }}
            placeholder="Mô tả UI, dán/đính kèm ảnh, hoặc dán path dự án... (Enter để gửi)"
          />
          <button onClick={sendPrompt} disabled={sending || (!prompt.trim() && images.length === 0)}>
            {sending ? "Đang gửi..." : "Thiết kế →"}
          </button>
        </div>
        {images.length > 0 && (
          <div className="thumbs">
            {images.map((src, i) => (
              <div className="thumb" key={i}>
                <img src={src} alt={`ảnh ${i + 1}`} />
                <button onClick={() => setImages((im) => im.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        )}
        {lastSent && (
          <div className="hint">Đã gửi: "{lastSent.slice(0, 60)}" — chờ Claude xử lý...</div>
        )}
      </div>

      <div className="context-bar">
        <span>Context dự án:</span>
        {(config.contextProjects || []).length === 0 && (
          <span style={{ color: "var(--muted)" }}>chưa cấu hình — sửa design.config.json</span>
        )}
        {(config.contextProjects || []).map((p) => (
          <span className="tag" key={p.name} title={p.path}>{p.name}</span>
        ))}
      </div>

      <div className="canvas">
        {designs.length === 0 && (
          <div className="empty">
            Chưa có thiết kế nào trong <code>{outputDir}/</code>.<br />
            Trong Claude Code, chạy <code>/design &lt;mô tả UI của bạn&gt;</code> để bắt đầu.
          </div>
        )}
        {designs.map((d) => (
          <div
            key={d.name}
            className={`card ${flashed[d.name] ? "flash" : ""}`}
            onAnimationEnd={() => setFlashed((f) => { const n = { ...f }; delete n[d.name]; return n; })}
          >
            <div className="frame-wrap" onClick={() => setActive(d)}>
              <iframe src={src(d.name)} title={d.name} scrolling="no" />
            </div>
            <div className="label">
              <span className="name">{d.name}</span>
              <span className="time">{timeAgo(d.mtime)}</span>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="modal" onClick={(e) => e.target.className === "modal" && closeModal()}>
          <div className="bar">
            <span className="name">{active.name}</span>
            <div className="spacer" />
            <select value={viewport} onChange={(e) => setViewport(e.target.value)}>
              {Object.keys(VIEWPORTS).map((v) => <option key={v}>{v}</option>)}
            </select>
            <button onClick={() => window.open(src(active.name), "_blank")}>Mở tab mới</button>
            <button onClick={closeModal}>✕ Đóng</button>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "auto", background: "#2a2d34" }}>
            <iframe
              src={src(active.name)}
              title={active.name}
              style={{ width: VIEWPORTS[viewport], maxWidth: "100%", height: "100%", background: "#fff", border: 0 }}
            />
          </div>
          <div className="edit-bar">
            <button className="attach" title="Đính kèm ảnh" onClick={() => editFileRef.current?.click()}>📎</button>
            <input ref={editFileRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => { addEditFiles(e.target.files); e.target.value = ""; }} />
            {editImages.length > 0 && (
              <div className="edit-thumbs">
                {editImages.map((s, i) => (
                  <div className="thumb" key={i}>
                    <img src={s} alt="" />
                    <button onClick={() => setEditImages((im) => im.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <input className="text" value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendEdit()}
              onPaste={(e) => {
                const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
                if (imgs.length) { e.preventDefault(); addEditFiles(imgs); }
              }}
              placeholder={`Chỉnh sửa "${active.name}"... (Enter để gửi tới Claude)`} />
            <button onClick={sendEdit} disabled={editSending || (!editPrompt.trim() && editImages.length === 0)}>
              {editSending ? "Đang gửi..." : "Sửa →"}
            </button>
            {editSent && <span className="hint">Đã gửi yêu cầu sửa — chờ Claude...</span>}
          </div>
        </div>
      )}
    </div>
  );
}
