const FIXTURES = {
  "scandal-a": "./fixtures/scandal-a.json",
  "scandal-b": "./fixtures/scandal-b.json",
  clean: "./fixtures/clean.json",
};

const select = document.getElementById("fixtureSelect");
const timeline = document.getElementById("timeline");
const rail = document.getElementById("rail");
const meta = document.getElementById("meta");
const replay = document.getElementById("replay");

async function loadFixture(id) {
  const res = await fetch(FIXTURES[id]);
  if (!res.ok) throw new Error(`Failed to load ${id}`);
  return res.json();
}

function shortMsg(msg) {
  return msg.length > 42 ? `${msg.slice(0, 40)}…` : msg;
}

function render(data) {
  const wiped = data.events.filter((e) => e.status === "wiped").length;
  meta.innerHTML = `<strong>${escapeHtml(data.repo)}</strong> · ${escapeHtml(data.branch)}
    · <span style="color:${wiped ? "#ff4d4d" : "#3dd68c"}">${wiped ? `${wiped} wiped` : "clean"}</span>
    <br/><span style="color:#8b9bb0">${escapeHtml(data.label)}. ${escapeHtml(data.disclaimer)}</span>`;

  rail.innerHTML = "";
  data.events.forEach((ev, i) => {
    const node = document.createElement("div");
    node.className = `node ${ev.status === "wiped" ? "wiped" : "alive"}`;
    node.style.animationDelay = `${i * 0.22}s`;
    node.innerHTML = `
      <div class="mark">${ev.status === "wiped" ? "✕" : "●"}</div>
      <div class="cap">${ev.status === "wiped" ? "WIPED" : "alive"}<br/>${escapeHtml(shortMsg(ev.message))}</div>
    `;
    rail.appendChild(node);
  });

  timeline.innerHTML = "";
  data.events.forEach((ev, i) => {
    const li = document.createElement("li");
    li.className = ev.status === "wiped" ? "wiped" : "alive";
    li.style.animationDelay = `${0.15 + i * 0.2}s`;
    const badge = ev.status === "wiped"
      ? `<span class="badge wiped">WIPED</span>`
      : `<span class="badge alive">ALIVE</span>`;
    li.innerHTML = `
      <div class="dot">${ev.status === "wiped" ? "✕" : "●"}</div>
      <div class="msg">${badge}${escapeHtml(ev.message)}</div>
      <div class="row">
        <span>${escapeHtml(ev.short)}</span>
        <span>${escapeHtml(ev.author)}</span>
        <span>${escapeHtml(ev.timestamp)}</span>
      </div>
      ${ev.note ? `<div class="note">${escapeHtml(ev.note)}</div>` : ""}
    `;
    timeline.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function boot() {
  const data = await loadFixture(select.value);
  render(data);
}

select.addEventListener("change", boot);
replay.addEventListener("click", boot);
boot().catch((err) => {
  meta.textContent = String(err);
});
