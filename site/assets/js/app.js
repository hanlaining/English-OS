const BASE = document.documentElement.dataset.base || ".";
const CITATION = `作品：《English OS》
原著作者：Han Laining（韩来凝）
项目地址：https://github.com/hanlaining/English-OS
在线阅读：https://hanlaining.github.io/English-OS/
UI 与技术实现协作：OpenAI Codex
许可：CC BY-NC-ND 4.0
说明：本文为非商业原文转发，未对原文进行修改。`;

const chapters = [
  { id: 0, slug: "chapter-0", title: "Introduction", cn: "绪论", status: "published", file: "chapter-0.md" },
  { id: 1, slug: "chapter-1", title: "Kernel", cn: "英语思维内核", status: "published", file: "chapter-1.md" },
  { id: 2, slug: "chapter-2", title: "Framework Engine", cn: "表达框架引擎", status: "planned" },
  { id: 3, slug: "chapter-3", title: "Grammar Engine", cn: "语法引擎", status: "planned" },
  { id: 4, slug: "chapter-4", title: "Chunk Library", cn: "语块库", status: "planned" },
  { id: 5, slug: "chapter-5", title: "Native Thinking", cn: "母语思维系统", status: "planned" },
  { id: 6, slug: "chapter-6", title: "Speaking Engine", cn: "口语生成引擎", status: "planned" }
];

function storageGet(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = theme === "dark" ? "☾" : "☼";
    button.setAttribute("aria-label", theme === "dark" ? "切换到浅色模式" : "切换到深色模式");
  });
}

function initTheme() {
  const saved = storageGet("englishOS.theme");
  const initial = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initial);
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    storageSet("englishOS.theme", next);
    applyTheme(next);
  }));
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

async function copyCitation() {
  try {
    await navigator.clipboard.writeText(CITATION);
  } catch {
    const area = document.createElement("textarea");
    area.value = CITATION;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  showToast("标准出处已复制");
}

function initCommon() {
  initTheme();
  document.querySelectorAll("[data-copy-citation]").forEach((button) => button.addEventListener("click", copyCitation));
  const citation = document.querySelector("[data-citation]");
  if (citation) citation.textContent = CITATION;
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function inlineMarkdown(value) {
  return escapeHTML(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function slugify(text, index) {
  const clean = text.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "");
  return clean || `section-${index}`;
}

function renderMarkdown(source) {
  const clean = source.replace(/^---\s*[\s\S]*?\s*---\s*/, "").replace(/\r/g, "");
  const lines = clean.split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let quote = [];
  let code = [];
  let inCode = false;
  let headingIndex = 0;

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inlineMarkdown(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph(); flushList(); flushQuote();
      if (inCode) { html.push(`<pre><code>${escapeHTML(code.join("\n"))}</code></pre>`); code = []; }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(line); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList(); flushQuote();
      headingIndex += 1;
      const level = heading[1].length;
      const id = slugify(heading[2], headingIndex);
      html.push(`<h${level} id="${id}" data-outline-title="${escapeHTML(heading[2])}">${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushParagraph(); flushList(); flushQuote(); html.push("<hr>"); continue;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph(); flushQuote(); list.push(item[1]); continue;
    }
    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) {
      flushParagraph(); flushList(); quote.push(quoted[1]); continue;
    }
    if (!line.trim()) {
      flushParagraph(); flushList(); flushQuote(); continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushQuote();
  return html.join("\n");
}

function chapterHref(chapter) {
  return `${BASE}/chapters/${chapter.slug}.html`;
}

function chapterShell(chapter) {
  const previous = chapters[chapter.id - 1];
  const next = chapters[chapter.id + 1];
  const tree = chapters.map((item) => `
    <div class="tree-group${item.id === chapter.id ? " open" : ""}" data-tree-chapter="${item.id}">
      <button class="tree-root" type="button" aria-expanded="${item.id === chapter.id}"><span class="tree-toggle">${item.id === chapter.id ? "−" : "+"}</span><b>${String(item.id).padStart(2, "0")}</b><strong>${item.title}</strong></button>
      <div class="tree-children"><a class="${item.id === chapter.id ? "active" : ""}" href="${chapterHref(item)}">${item.cn}${item.status === "planned" ? " · 规划中" : " · 完整正文"}</a></div>
    </div>`).join("");
  const navLink = (item, direction) => item ? `<a href="${chapterHref(item)}">${direction === "previous" ? "<span>←</span>" : ""}<div><small>${direction.toUpperCase()}</small><b>Chapter ${item.id} · ${item.title}</b></div>${direction === "next" ? "<span>→</span>" : ""}</a>` : "<span></span>";
  const content = chapter.status === "planned" ? `<section class="planned"><div><div class="planned-mark">PLANNED</div><h2>本章正在规划中</h2><p>本页仅标示章节结构与创作状态。正式正文将由 Han Laining（韩来凝）完成，网站不会代为补写。</p></div></section>` : "";
  return `
    <a class="skip-link" href="#main">跳到正文</a><div class="orbit" aria-hidden="true"></div>
    <header class="topbar"><a class="brand" href="${BASE}/index.html"><span>English</span><i>OS</i></a><div class="edition">A PERSONAL LANGUAGE SYSTEM</div><nav class="top-actions"><a class="top-link" href="${BASE}/about.html">原著与协作</a><a class="top-link" href="${BASE}/copyright.html">版权说明</a><div class="reading-progress"><span>READING</span><b data-reading-percent>0%</b></div><button class="circle-button" data-theme-toggle aria-label="切换主题">☼</button><button class="menu-button" data-open-tree aria-label="打开知识树"><span class="menu-lines"></span></button></nav></header>
    <div class="reader-layout">
      <aside class="tree-panel" aria-label="全书知识树"><div class="panel-kicker">KNOWLEDGE TREE</div><h2>英语思维系统</h2><nav class="tree">${tree}</nav></aside>
      <div class="drawer-backdrop" data-close-tree></div>
      <main class="reader" id="main">
        <div class="mobile-chapterbar"><button type="button" data-open-tree aria-label="打开知识树">☷</button><span>CHAPTER ${String(chapter.id).padStart(2, "0")}</span><b data-reading-percent>0%</b></div>
        <header class="chapter-hero"><p class="eyebrow">Chapter ${String(chapter.id).padStart(2, "0")} · ${chapter.status === "planned" ? "Planned" : "English OS v1.0"}</p><h1>${chapter.title}<em>${chapter.cn}</em></h1><p class="chapter-meta"><span>原著作者：Han Laining（韩来凝）</span><span>${chapter.status === "planned" ? "状态：规划中" : "版本：v0.1 · 2026-08"}</span></p></header>
        <article class="markdown-body" data-chapter="${chapter.id}">${content}</article>
        <div class="chapter-tools"><span class="reading-progress">全书完成进度 <b data-global-progress>0%</b></span><button class="complete-button" type="button" data-complete aria-pressed="false">标记为已完成</button></div>
        <nav class="chapter-nav" aria-label="章节导航">${navLink(previous, "previous")}${navLink(next, "next")}</nav>
        <footer class="attribution">《English OS》学习体系与正文由 Han Laining（韩来凝）原创并维护。网站 UI 与技术实现由作者在 OpenAI Codex 协作下完成。<a href="${BASE}/copyright.html">版权、转载与引用说明</a>。</footer>
      </main>
      <aside class="chapter-rail"><div class="rail-label">IN THIS CHAPTER</div><nav class="rail-nav" data-rail-nav></nav><div class="rail-progress">READING PROGRESS<b data-reading-percent>0%</b></div></aside>
    </div>
    <nav class="mobile-bottom" aria-label="章节导航">${previous ? `<a href="${chapterHref(previous)}"><b>←</b><span>上一章</span></a>` : "<span></span>"}<button type="button" data-open-tree><b>☷</b><span>知识树</span></button>${next ? `<a href="${chapterHref(next)}"><span>下一章</span><b>→</b></a>` : "<span></span>"}</nav>`;
}

function hydrateChapterShell() {
  const shell = document.querySelector("[data-page-chapter]");
  if (!shell) return;
  const chapter = chapters[Number(shell.dataset.pageChapter)];
  if (chapter) shell.innerHTML = chapterShell(chapter);
}

function initTree(currentId) {
  document.querySelectorAll(".tree-root").forEach((button) => button.addEventListener("click", () => {
    const group = button.closest(".tree-group");
    const open = group.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
    button.querySelector(".tree-toggle").textContent = open ? "−" : "+";
  }));
  document.querySelectorAll("[data-open-tree]").forEach((button) => button.addEventListener("click", () => document.body.classList.add("drawer-open")));
  document.querySelectorAll("[data-close-tree], .tree-children a").forEach((element) => element.addEventListener("click", () => document.body.classList.remove("drawer-open")));
  const group = document.querySelector(`[data-tree-chapter="${currentId}"]`);
  if (group) {
    group.classList.add("open");
    const root = group.querySelector(".tree-root");
    root?.setAttribute("aria-expanded", "true");
    const toggle = group.querySelector(".tree-toggle");
    if (toggle) toggle.textContent = "−";
  }
}

function updateGlobalProgress() {
  const completed = chapters.filter((chapter) => storageGet(`englishOS.complete.${chapter.id}`) === "true").length;
  const progress = Math.round((completed / chapters.length) * 100);
  document.querySelectorAll("[data-global-progress]").forEach((element) => element.textContent = `${progress}%`);
}

function initReadingProgress(chapterId) {
  const key = `englishOS.scroll.${chapterId}`;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    const saved = Number(storageGet(key, "0"));
    if (saved > 0) requestAnimationFrame(() => scrollTo(0, saved));
  };
  restore();
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const percent = max > 0 ? Math.min(100, Math.round((scrollY / max) * 100)) : 100;
      storageSet(key, String(Math.round(scrollY)));
      storageSet("englishOS.lastChapter", String(chapterId));
      document.querySelectorAll("[data-reading-percent]").forEach((element) => element.textContent = `${percent}%`);
      ticking = false;
    });
  }, { passive: true });
}

function initCompletion(chapterId) {
  const button = document.querySelector("[data-complete]");
  if (!button) return;
  const sync = () => {
    const done = storageGet(`englishOS.complete.${chapterId}`) === "true";
    button.classList.toggle("done", done);
    button.textContent = done ? "✓ 已完成本章" : "标记为已完成";
    button.setAttribute("aria-pressed", String(done));
  };
  sync();
  button.addEventListener("click", () => {
    const done = storageGet(`englishOS.complete.${chapterId}`) !== "true";
    storageSet(`englishOS.complete.${chapterId}`, String(done));
    sync(); updateGlobalProgress();
  });
}

function buildRail() {
  const rail = document.querySelector("[data-rail-nav]");
  if (!rail) return;
  const headings = [...document.querySelectorAll(".markdown-body h1")];
  rail.innerHTML = headings.map((heading, index) => `<a href="#${heading.id}"><span>${String(index + 1).padStart(2, "0")}</span><span>${heading.dataset.outlineTitle}</span></a>`).join("");
  const links = [...rail.querySelectorAll("a")];
  const sync = () => {
    let active = 0;
    headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top < 190) active = index; });
    links.forEach((link, index) => link.classList.toggle("active", index === active));
  };
  addEventListener("scroll", sync, { passive: true });
  sync();
}

async function initChapter() {
  const root = document.querySelector("[data-chapter]");
  if (!root) return;
  const id = Number(root.dataset.chapter);
  const chapter = chapters[id];
  initTree(id);
  initCompletion(id);
  updateGlobalProgress();
  if (chapter.status === "published") {
    try {
      const response = await fetch(`${BASE}/content/${chapter.file}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      root.innerHTML = renderMarkdown(await response.text());
      buildRail();
      initReadingProgress(id);
    } catch (error) {
      root.innerHTML = `<div class="notice"><strong>正文加载失败。</strong><p>请通过本地网站地址打开，而不是直接双击 HTML 文件。</p></div>`;
      console.error("English OS content error:", error);
    }
  } else {
    initReadingProgress(id);
  }
}

function initHome() {
  const recent = document.querySelector("[data-recent-reading]");
  if (recent) {
    const id = Number(storageGet("englishOS.lastChapter", "0"));
    const chapter = chapters[id] || chapters[0];
    recent.href = chapterHref(chapter);
    recent.textContent = id ? `继续阅读 Chapter ${id}` : "从头开始阅读";
  }
  updateGlobalProgress();
}

hydrateChapterShell();
initCommon();
initHome();
initChapter();
