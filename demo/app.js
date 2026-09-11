const FIXTURES = {
  "scandal-a": "../fixtures/scandal-a.json",
  "scandal-b": "../fixtures/scandal-b.json",
  clean: "../fixtures/clean.json",
};

const select = document.getElementById("fixtureSelect");
const timeline = document.getElementById("timeline");
const meta = document.getElementById("meta");
const replay = document.getElementById("replay");

async function loadFixture(id) {
  const res = await fetch(FIXTURES[id]);
  if (!res.ok) throw new Error(`Failed to load ${id}`);
  return res.json();
}

function render(data) {
  meta.innerHTML = `<strong>${data.repo}</strong> · ${data.branch}<br/><span style="color:#8b9bb0">${data.label}. ${data.disclaimer}</span>`;
  timeline.innerHTML = "";
  data.events.forEach((ev, i) => {
    const li = document.createElement("li");
    li.className = ev.status === "wiped" ? "wiped" : "alive";
    li.style.animationDelay = `${i * 0.18}s`;
    li.innerHTML = `
      <div class="dot">${ev.status === "wiped" ? "✕" : "●"}</div>
      <div class="msg">${escapeHtml(ev.message)}</div>
      <div class="row">
        <span>${escapeHtml(ev.short)}</span>
        <span>${escapeHtml(ev.author)}</span>
        <span>${escapeHtml(ev.timestamp)}</span>
        <span>${ev.status === "wiped" ? "WIPED" : "ALIVE"}</span>
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
