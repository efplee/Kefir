const K = KEFIRS, D = DIAS, DAY = 864e5, T0 = Date.UTC(2026, 8, 21), MAXT = 31;
const $ = id => document.getElementById(id);
const dn = s => Math.round((Date.parse(s) - T0) / DAY);
const iso = t => new Date(T0 + t * DAY).toISOString().slice(0, 10);
const fmt = s => s.split("-").reverse().join("/");
const nf = (v, d = 1) => v.toFixed(d).replace(".", ",").replace("-", "−");
const WK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dates = Array.from({ length: MAXT + 1 }, (_, i) => iso(i));
const byD = Object.fromEntries(D.map(d => [d.data, d]));
const pts = k => D.filter(d => d[k.id] != null).map(d => ({ x: dn(d.data), y: d[k.id] }));
const home = () => [0, Math.max(...K.flatMap(pts).map(p => p.x)) + 1];
let tab = "l1", sel = [...D].reverse().find(d => K.some(k => d[k.id] != null)).data, geo, view = home();

function fit(p) {
  const n = p.length; if (n < 2) return null;
  const S = f => p.reduce((s, q) => s + f(q), 0), ly = q => Math.log(q.y);
  const sx = S(q => q.x), sy = S(ly), den = n * S(q => q.x * q.x) - sx * sx;
  if (!den) return null;
  const a = (n * S(q => q.x * ly(q)) - sx * sy) / den, b = (sy - a * sx) / n, m = sy / n;
  const st = S(q => (ly(q) - m) ** 2), sr = S(q => (ly(q) - a * q.x - b) ** 2);
  const N0 = Math.exp(b), r = Math.exp(a) - 1;
  return { N0, r, r2: st ? 1 - sr / st : 1, at: t => N0 * (1 + r) ** t };
}

function chart(list) {
  const W = 700, H = 380, L = 52, R = 16, T = 16, B = 44, t = dn(sel), [x0, x1] = view;
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - R);
  const ys = [];
  list.forEach(k => { pts(k).forEach(p => p.x >= x0 && p.x <= x1 && ys.push(p.y)); const f = fit(pts(k)); if (f) ys.push(f.at(x0), f.at(x1)); });
  if (!ys.length) ys.push(0, 100);
  const y0 = Math.floor((Math.min(...ys) - 5) / 5) * 5, y1 = Math.ceil((Math.max(...ys) + 5) / 5) * 5;
  const Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  geo = { W, L, R, x0, x1 };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico do peso dos grãos por dia"><clipPath id="cp"><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/></clipPath>`;
  for (let i = 0; i <= 4; i++) {
    const v = y0 + i * (y1 - y0) / 4;
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#dfe8ec"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${+v.toFixed(1)}</text>`;
  }
  const step = Math.max(1, Math.ceil((x1 - x0) / 10));
  for (let x = Math.ceil(x0); x <= x1; x += step) s += `<text x="${X(x)}" y="${H - 22}" text-anchor="middle">${fmt(iso(x)).slice(0, 5)}</text>`;
  s += `<text x="${(L + W) / 2}" y="${H - 4}" text-anchor="middle">dia (t)</text><text x="12" y="${H / 2}" transform="rotate(-90 12 ${H / 2})" text-anchor="middle">peso dos grãos (g)</text>`;
  s += `<g clip-path="url(#cp)"><line x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${H - B}" stroke="#12303b" stroke-dasharray="3 4"/>`;
  list.forEach(k => {
    const p = pts(k), f = fit(p); if (!p.length) return;
    if (f) { const a = p[0].x, b = p[p.length - 1].x;
      const ln = (u, v, c) => { const q = []; for (let x = u; x <= v + 1e-9; x += .25) q.push(X(x) + "," + Y(f.at(x))); return `<polyline fill="none" points="${q.join(" ")}" stroke="${c}" stroke-width="2.5" stroke-dasharray="7 4"/>`; };
      s += ln(a, b, k.cor) + ln(b, MAXT, k.prev); }
    s += `<polyline fill="none" stroke="${k.cor}" stroke-opacity=".35" stroke-width="1.5" points="${p.map(q => X(q.x) + "," + Y(q.y)).join(" ")}"/>`;
    s += p.map(q => `<circle cx="${X(q.x)}" cy="${Y(q.y)}" r="${q.x == t ? 8 : 4.5}" fill="${k.cor}"${q.x == t ? ' stroke="#12303b" stroke-width="2.5"' : ""}/>`).join("");
  });
  return s + "</g></svg>";
}

const legenda = list => `<div class="leg">${list.map(k => `<span><i style="background:${k.cor}"></i>${k.nome} (${k.cn})</span>`).join("")}<span><i class="pt"></i>ponto medido</span>${list.map(k => `<span><u style="border-color:${k.prev}"></u>previsão: ${k.nome}</span>`).join("")}</div>`;
const ZOOM = `<div class="zoom"><button data-z="in">＋</button><button data-z="out">－</button><button data-z="home">Dados atuais</button><button data-z="all">Ver tudo (até 22/10)</button></div>`;

function zoom(f, ax) {
  let [a, b] = view; const w = Math.min(MAXT, Math.max(3, (b - a) * f));
  ax = Math.min(b, Math.max(a, ax)); const r = (ax - a) / (b - a);
  a = ax - r * w; b = a + w;
  if (a < 0) { b -= a; a = 0; } if (b > MAXT) { a -= b - MAXT; b = MAXT; }
  view = [Math.max(0, a), b]; draw();
}

function draw() {
  const list = tab == "all" ? K : K.filter(k => k.id == tab);
  $("gsvg").innerHTML = chart(list);
  $("gleg").innerHTML = legenda(list) + ZOOM;
  const th = $("thumb"); th.style.left = view[0] / MAXT * 100 + "%"; th.style.width = (view[1] - view[0]) / MAXT * 100 + "%";
  const svg = $("gsvg").firstChild, g = geo;
  const xAt = e => { const r = svg.getBoundingClientRect(); return g.x0 + ((e.clientX - r.left) / r.width * g.W - g.L) / (g.W - g.L - g.R) * (g.x1 - g.x0); };
  svg.addEventListener("pointerdown", e => { const r = svg.getBoundingClientRect();
    drag = { m: "pan", x: e.clientX, v: [...view], pw: r.width * (g.W - g.L - g.R) / g.W, span: g.x1 - g.x0, pick: xAt(e) }; });
  svg.addEventListener("wheel", e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, xAt(e)); }, { passive: false });
}

function render() {
  const list = tab == "all" ? K : K.filter(k => k.id == tab), t = dn(sel), d = byD[sel];
  $("abas").innerHTML = [...K, { id: "all", nome: "Os 3 juntos", cor: "#12303b" }]
    .map(k => `<button data-t="${k.id}" class="${k.id == tab ? "on" : ""}" style="--c:${k.cor}">${k.nome}</button>`).join("");
  $("data").value = sel;
  draw();
  $("funcao").innerHTML = "<h2>Função de crescimento</h2><p><b>Fórmula geral:</b> N(t) = N₀ · (1 + r)<sup>t</sup></p>" + list.map(k => {
    const f = fit(pts(k));
    return `<p style="--c:${k.cor}"><b>${k.nome}:</b> ` + (f ? `<br>N(t) = ${nf(f.N0)} · (1 ${f.r < 0 ? "−" : "+"} ${nf(Math.abs(f.r), 3)})<sup>t</sup><br><small>N₀ = ${nf(f.N0)} g · r = ${nf(f.r * 100, 1)}% ao dia · R² = ${nf(f.r2, 2)}</small>` : "dados insuficientes") + "</p>";
  }).join("") + "<small>N = peso dos grãos (g) · N₀ = peso em t = 0 (21/09) · r = variação por dia (negativo = diminuiu) · t = dias desde 21/09</small>";
  let h = `<h2>${WK[new Date(sel).getUTCDay()]}, ${fmt(sel)} (t = ${t})</h2>` + list.map(k => {
    const v = d && d[k.id], f = fit(pts(k));
    return `<p style="--c:${k.cor}"><b>${k.nome}:</b> ${v != null ? v + " g medidos" : "sem medição"}${f ? " · pela função: " + nf(f.at(t)) + " g" : ""}</p>`;
  }).join("");
  h += d ? `<h3>Troca</h3><p>${d.troca || "—"}</p><h3>Observação do dia</h3><p>${d.obs || "Nenhuma observação neste dia."}</p>`
         : "<p>Ainda não há registro para este dia.</p>";
  $("dia").innerHTML = h;
}

$("data").innerHTML = dates.map(s => `<option value="${s}">${WK[new Date(s).getUTCDay()]} ${fmt(s)}${byD[s] ? " ●" : ""}</option>`).join("");
$("data").onchange = e => { sel = e.target.value; render(); };
$("abas").onclick = e => { if (e.target.dataset.t) { tab = e.target.dataset.t; render(); } };
$("grafico").onclick = e => {
  const z = e.target.dataset.z; if (!z) return;
  const c = (view[0] + view[1]) / 2;
  if (z == "in") zoom(1 / 1.3, c); else if (z == "out") zoom(1.3, c);
  else { view = z == "home" ? home() : [0, MAXT]; draw(); }
};
let drag = null;
$("grafico").innerHTML = `<div id="gsvg"></div><div id="barra"><div id="thumb"><b class="h" data-m="l"></b><b class="h" data-m="r"></b></div></div><div id="gleg"></div>`;
$("barra").addEventListener("pointerdown", e => {
  const r = $("barra").getBoundingClientRect(), w = view[1] - view[0];
  if (e.target.id == "barra") { const c = (e.clientX - r.left) / r.width * MAXT, a = Math.min(MAXT - w, Math.max(0, c - w / 2)); view = [a, a + w]; draw(); return; }
  drag = { m: e.target.dataset.m || "move", x: e.clientX, v: [...view], pw: r.width, span: MAXT };
  e.preventDefault();
});
window.addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, [a0, b0] = drag.v, w = b0 - a0, dd = dx / drag.pw * drag.span;
  if (Math.abs(dx) > 4) drag.moved = true;
  if (drag.m == "move") { const a = Math.min(MAXT - w, Math.max(0, a0 + dd)); view = [a, a + w]; }
  else if (drag.m == "pan") { if (!drag.moved) return; const a = Math.min(MAXT - w, Math.max(0, a0 - dd)); view = [a, a + w]; }
  else if (drag.m == "l") view = [Math.min(b0 - 3, Math.max(0, a0 + dd)), b0];
  else if (drag.m == "r") view = [a0, Math.max(a0 + 3, Math.min(MAXT, b0 + dd))];
  draw();
});
window.addEventListener("pointerup", () => {
  if (!drag) return; const d = drag; drag = null;
  if (d.m == "pan" && !d.moved) { sel = iso(Math.min(MAXT, Math.max(0, Math.round(d.pick)))); render(); }
});
window.addEventListener("pointercancel", () => { drag = null; });
render();
