const FIXTURES = {
  "scandal-a": "./fixtures/scandal-a.json",
  "scandal-b": "./fixtures/scandal-b.json",
  clean: "./fixtures/clean.json",
  "fork-witness-a": "./fixtures/fork-witness-a.json",
  "fork-witness-clean": "./fixtures/fork-witness-clean.json",
};

const select = document.getElementById("fixtureSelect");
const timeline = document.getElementById("timeline");
const rail = document.getElementById("rail");
const meta = document.getElementById("meta");
const replay = document.getElementById("replay");
const dualWrap = document.getElementById("dualWrap");
const dualCaption = document.getElementById("dualCaption");
const upstreamRail = document.getElementById("upstreamRail");
const forkRail = document.getElementById("forkRail");
const fwNote = document.getElementById("fwNote");
const singleRailWrap = document.getElementById("singleRailWrap");

async function loadFixture(id) {
  const res = await fetch(FIXTURES[id]);
  if (!res.ok) throw new Error(`Failed to load ${id}`);
  return res.json();
}

function shortMsg(msg) {
  return msg.length > 42 ? `${msg.slice(0, 40)}…` : msg;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markFor(status) {
  if (status === "wiped") return "✕";
  if (status === "absent") return "·";
  return "●";
}

function labelFor(status) {
  if (status === "wiped") return "WIPED";
  if (status === "absent") return "—";
  return "alive";
}

function classFor(status) {
  if (status === "wiped") return "wiped";
  if (status === "absent") return "absent";
  return "alive";
}

function renderSingle(data) {
  if (singleRailWrap) singleRailWrap.hidden = false;
  if (dualWrap) dualWrap.hidden = true;
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

function fillSideRail(el, events, sideKey) {
  el.innerHTML = "";
  events.forEach((ev, i) => {
    const status = ev[sideKey] || ev.status || "alive";
    const node = document.createElement("div");
    node.className = `node ${classFor(status)}`;
    node.style.animationDelay = `${i * 0.22}s`;
    const shared =
      (ev.upstreamStatus === "wiped" && ev.forkStatus === "alive") ||
      (ev.upstreamStatus === "alive" && ev.forkStatus === "wiped");
    node.innerHTML = `
      <div class="mark">${markFor(status)}</div>
      <div class="cap">${labelFor(status)}<br/>${escapeHtml(shortMsg(ev.message))}${
        shared ? `<br/><span class="shared-sha">${escapeHtml(ev.short)}</span>` : ""
      }</div>
    `;
    el.appendChild(node);
  });
}

function renderForkWitness(data) {
  if (singleRailWrap) singleRailWrap.hidden = true;
  if (dualWrap) dualWrap.hidden = false;
  const up = data.upstream || { repo: data.repo, branch: data.branch };
  const fk = data.fork || {};
  const asymmetric = data.events.filter(
    (e) => e.upstreamStatus === "wiped" && e.forkStatus === "alive"
  ).length;

  meta.innerHTML = `<strong>Upstream</strong> ${escapeHtml(up.repo)} · ${escapeHtml(up.branch || "main")}
    &nbsp;|&nbsp; <strong>Fork</strong> ${escapeHtml(fk.repo || "?")} · ${escapeHtml(fk.branch || "main")}
    · <span style="color:${asymmetric ? "#ff4d4d" : "#3dd68c"}">${
      asymmetric ? `${asymmetric} shared tip ✕/●` : "sides match"
    }</span>
    <br/><span style="color:#8b9bb0">${escapeHtml(data.label)}. ${escapeHtml(data.disclaimer)}</span>`;

  if (dualCaption) {
    dualCaption.textContent =
      data.caption || "Upstream force-pushed. Fork still has the tip.";
  }

  fillSideRail(upstreamRail, data.events, "upstreamStatus");
  fillSideRail(forkRail, data.events, "forkStatus");

  timeline.innerHTML = "";
  data.events.forEach((ev, i) => {
    const upS = ev.upstreamStatus || ev.status;
    const fkS = ev.forkStatus || ev.status;
    const li = document.createElement("li");
    li.className = upS === "wiped" && fkS === "alive" ? "wiped dual-hit" : classFor(upS);
    li.style.animationDelay = `${0.15 + i * 0.2}s`;
    const upBadge =
      upS === "wiped"
        ? `<span class="badge wiped">UP ✕</span>`
        : upS === "absent"
          ? `<span class="badge absent">UP —</span>`
          : `<span class="badge alive">UP ●</span>`;
    const fkBadge =
      fkS === "wiped"
        ? `<span class="badge wiped">FORK ✕</span>`
        : fkS === "absent"
          ? `<span class="badge absent">FORK —</span>`
          : `<span class="badge alive">FORK ●</span>`;
    li.innerHTML = `
      <div class="dot">${upS === "wiped" && fkS === "alive" ? "✕●" : markFor(upS)}</div>
      <div class="msg">${upBadge}${fkBadge}${escapeHtml(ev.message)}</div>
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

function render(data) {
  if (data.mode === "fork-witness") renderForkWitness(data);
  else renderSingle(data);
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
