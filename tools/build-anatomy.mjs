// Builds assets/anatomy.glb from BodyParts3D (DBCLS) using HTTP range requests, so only the
// selected parts are downloaded (not the 143 MB archive). No dependencies.
// Usage: node tools/build-anatomy.mjs [cacheDir]      (cache keeps raw OBJs between runs)
// Data: BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan (see ATTRIBUTION.md).
import { inflateRawSync } from "node:zlib";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST";
const ZIP = `${BASE}/isa_BP3D_4.0_obj_99.zip`;
const cache = process.argv[2] ?? join(fileURLToPath(new URL(".", import.meta.url)), ".cache");
const out = fileURLToPath(new URL("../assets/", import.meta.url));
mkdirSync(cache, { recursive: true }); mkdirSync(out, { recursive: true });

const get = async (url, range) => {
  for (let t = 0; t < 4; t++) {
    const r = await fetch(url, range ? { headers: { Range: `bytes=${range[0]}-${range[1]}` } } : {});
    if (r.ok || r.status === 206) return Buffer.from(await r.arrayBuffer());
    await new Promise((s) => setTimeout(s, 800 * (t + 1)));
  }
  throw new Error("fetch failed " + url);
};
const cached = async (name, fn) => { const f = join(cache, name); if (existsSync(f)) return readFileSync(f); const b = await fn(); writeFileSync(f, b); return b; };

/* ---- part lists: concept id / name / element file id ---- */
const table = async (f) => (await cached(f, () => get(`${BASE}/${f}`))).toString().split("\n").slice(1).filter(Boolean).map((l) => l.split("\t"));
const partof = await table("partof_element_parts.txt"), isa = await table("isa_element_parts.txt");

/* ---- layer selection (by FMA concept name) ---- */
const MUSCLES = /^(left|right) (pectoralis major|deltoid|biceps brachii|triceps brachii|rectus abdominis|trapezius|latissimus dorsi|gluteus maximus|rectus femoris|vastus lateralis|vastus medialis|biceps femoris|semitendinosus|gastrocnemius|soleus|tibialis anterior|sartorius|external oblique|serratus anterior|sternocleidomastoid|gracilis|adductor longus|brachioradialis|brachialis|infraspinatus)$/;
const BONE = /(^| )(bone|vertebra|sternum|rib|sacrum|coccyx|cranium|mandible|clavicle|scapula|humerus|radius|ulna|femur|tibia|fibula|patella|phalanx|calcaneus|talus|manubrium|sphenoid|hyoid)\b|vertebra$|rib$|phalanx$/i;
const layers = {
  skin: { rows: partof.filter((r) => r[1] === "skin"), cell: 0.006 },
  skeleton: { rows: partof.filter((r) => BONE.test(r[1]) && !/(cartilage|ligament|artery|vein|nerve|muscle|vessel|process|body of|head of|neck of|surface|marrow|tuberosity|border)/i.test(r[1])), cell: 0.004 },
  muscles: { rows: isa.filter((r) => MUSCLES.test(r[1])), cell: 0.005 },
  lungs: { rows: partof.filter((r) => /^(left|right) lung$/.test(r[1])), cell: 0.005 },
  kidneys: { rows: partof.filter((r) => /^(left|right) kidney$/.test(r[1])), cell: 0.004 },
  heart: { rows: partof.filter((r) => /^heart$/.test(r[1])), cell: 0.005 },
  liver: { rows: partof.filter((r) => /^liver$/.test(r[1])), cell: 0.006 },
};
const anchorNames = { skull: /^cranium$/, rKnee: /^right patella$/, lKnee: /^left patella$/, rKid: /^right kidney$/, lKid: /^left kidney$/, rLung: /^right lung$/, lLung: /^left lung$/, heart: /^heart$/,
  rHand: /^right third metacarpal bone$/, lHand: /^left third metacarpal bone$/, rWrist: /^right lunate bone$/, lWrist: /^left lunate bone$/, rShoulder: /^right humerus$/, lShoulder: /^left humerus$/,
  rThigh: /^right rectus femoris$/, lThigh: /^left rectus femoris$/, mandible: /^mandible$/, rEye: /^right eyeball$/, lEye: /^left eyeball$/, rParotid: /^right parotid gland$/ };
const anchorRows = {};
for (const [k, re] of Object.entries(anchorNames)) anchorRows[k] = [...partof, ...isa].filter((r) => re.test(r[1])).slice(0, 12);

/* ---- zip central directory via range reads ---- */
const tail = await cached("zip-tail.bin", () => get(ZIP, [142_903_898 - 400_000, 142_903_897]));
const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
const nEnt = tail.readUInt16LE(eocd + 10), cdSize = tail.readUInt32LE(eocd + 12), cdOff = tail.readUInt32LE(eocd + 16);
const cd = tail.subarray(eocd - cdSize, eocd);
const entries = new Map();
for (let p = 0, i = 0; i < nEnt && p + 46 <= cd.length; i++) {
  const comp = cd.readUInt32LE(p + 20), size = cd.readUInt32LE(p + 24), nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32), off = cd.readUInt32LE(p + 42);
  entries.set(cd.toString("latin1", p + 46, p + 46 + nl).split("/").pop().replace(".obj", ""), { comp, size, off, method: cd.readUInt16LE(p + 10) });
  p += 46 + nl + el + cl;
}
console.log("zip entries:", entries.size, "of", nEnt, "| central dir", cdSize, "bytes at", cdOff);

const obj = async (id) => {
  const e = entries.get(id); if (!e) return null;
  const raw = await cached(`${id}.obj`, async () => {
    const h = await get(ZIP, [e.off, e.off + 29 + 400]); // local header: 30 + name + extra
    const start = e.off + 30 + h.readUInt16LE(26) + h.readUInt16LE(28);
    const body = await get(ZIP, [start, start + e.comp - 1]);
    return e.method === 8 ? inflateRawSync(body) : body;
  });
  return raw.toString();
};
const parseObj = (txt) => { const v = [], f = []; for (const l of txt.split("\n")) { if (l[0] === "v" && l[1] === " ") v.push(l.slice(2).trim().split(/\s+/).map(Number)); else if (l[0] === "f") { const ix = l.slice(2).trim().split(/\s+/).map((s) => parseInt(s) - 1); for (let i = 1; i + 1 < ix.length; i++) f.push([ix[0], ix[i], ix[i + 1]]); } } return { v, f }; };

/* ---- fetch with a small worker pool ---- */
const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); };
const need = new Set([...Object.values(layers).flatMap((l) => l.rows.map((r) => r[2])), ...Object.values(anchorRows).flatMap((a) => a.map((r) => r[2]))]);
const ids = [...need].filter((id) => entries.has(id));
console.log("parts to fetch:", ids.length, "compressed MB:", (ids.reduce((s, id) => s + entries.get(id).comp, 0) / 1e6).toFixed(1));
const meshes = new Map(); let done = 0;
await pool(ids, 10, async (id) => { const t = await obj(id); if (t) meshes.set(id, parseObj(t)); if (++done % 100 === 0) console.log(done, "/", ids.length); });

/* ---- orientation: BodyParts3D is mm; find the up axis from the skin bbox ---- */
const skinParts = layers.skin.rows.map((r) => meshes.get(r[2])).filter(Boolean);
const bb = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
for (const m of skinParts) for (const p of m.v) for (let a = 0; a < 3; a++) { bb.min[a] = Math.min(bb.min[a], p[a]); bb.max[a] = Math.max(bb.max[a], p[a]); }
const ext = bb.max.map((x, a) => x - bb.min[a]);
const up = ext.indexOf(Math.max(...ext));
console.log("skin bbox extent mm", ext.map(Math.round), "up axis", "xyz"[up]);
// BodyParts3D: x = subject's left->right? we map to three.js (x right, y up, z toward viewer) and verify visually.
const lateral = [0, 1, 2].filter((a) => a !== up);
const depthAxis = ext[lateral[0]] < ext[lateral[1]] ? lateral[0] : lateral[1];
const sideAxis = lateral.find((a) => a !== depthAxis);
const cx = (bb.min[sideAxis] + bb.max[sideAxis]) / 2, cz = (bb.min[depthAxis] + bb.max[depthAxis]) / 2, y0 = bb.min[up];
const S = 1 / 1000, flip = JSON.parse(process.env.FLIP ?? '{"x":1,"z":-1}');
const tx = (p) => [(p[sideAxis] - cx) * S * flip.x, (p[up] - y0) * S, (p[depthAxis] - cz) * S * flip.z];

/* ---- decimate by vertex clustering, then write glb ---- */
function decimate(parts, cell) {
  const map = new Map(), pos = [], idx = [];
  const key = (p) => `${Math.round(p[0] / cell)},${Math.round(p[1] / cell)},${Math.round(p[2] / cell)}`;
  for (const m of parts) {
    const remap = new Array(m.v.length);
    m.v.forEach((p, i) => { const q = tx(p), k = key(q); let e = map.get(k); if (!e) { e = { i: pos.length / 3, s: [0, 0, 0], n: 0 }; map.set(k, e); pos.push(0, 0, 0); } e.s[0] += q[0]; e.s[1] += q[1]; e.s[2] += q[2]; e.n++; remap[i] = e; });
    for (const [a, b, c] of m.f) { const A = remap[a], B = remap[b], C = remap[c]; if (A !== B && B !== C && A !== C) idx.push(A.i, B.i, C.i); }
  }
  for (const e of map.values()) { pos[e.i * 3] = e.s[0] / e.n; pos[e.i * 3 + 1] = e.s[1] / e.n; pos[e.i * 3 + 2] = e.s[2] / e.n; }
  return { pos, idx };
}
function normals(pos, idx) {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const u = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]], w = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
    const x = u[1] * w[2] - u[2] * w[1], y = u[2] * w[0] - u[0] * w[2], z = u[0] * w[1] - u[1] * w[0];
    for (const k of [a, b, c]) { n[k] += x; n[k + 1] += y; n[k + 2] += z; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}
const gltf = { asset: { version: "2.0", generator: "ana-calculator/tools/build-anatomy.mjs" }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [] };
const chunks = []; let byteLen = 0;
const addView = (buf, target, stride) => { const pad = (4 - (byteLen % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); byteLen += pad; } gltf.bufferViews.push({ buffer: 0, byteOffset: byteLen, byteLength: buf.length, target, ...(stride ? { byteStride: stride } : {}) }); chunks.push(buf); byteLen += buf.length; return gltf.bufferViews.length - 1; };
const addAcc = (view, type, count, comp, extra = {}) => (gltf.accessors.push({ bufferView: view, componentType: comp, count, type, ...extra }), gltf.accessors.length - 1);
gltf.extensionsUsed = ["KHR_mesh_quantization"]; gltf.extensionsRequired = ["KHR_mesh_quantization"];
const stats = {};
for (const [name, L] of Object.entries(layers)) {
  const parts = L.rows.map((r) => meshes.get(r[2])).filter(Boolean);
  if (!parts.length) { console.warn("empty layer", name); continue; }
  const { pos, idx } = decimate(parts, L.cell), nrm = normals(pos, idx), nv = pos.length / 3;
  if (nv > 65535) throw new Error(`${name}: ${nv} vertices; raise the cell size (16-bit indices)`);
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], pos[i + a]); mx[a] = Math.max(mx[a], pos[i + a]); }
  const ctr = mn.map((v, a) => (v + mx[a]) / 2), half = mn.map((v, a) => (mx[a] - v) / 2 || 1e-6);
  const P = new Int16Array(nv * 4), Nn = new Int8Array(nv * 4), ix = new Uint16Array(idx);
  for (let i = 0; i < nv; i++) for (let a = 0; a < 3; a++) { P[i * 4 + a] = Math.round(((pos[i * 3 + a] - ctr[a]) / half[a]) * 32767); Nn[i * 4 + a] = Math.round(nrm[i * 3 + a] * 127); }
  const A = addAcc(addView(Buffer.from(P.buffer), 34962, 8), "VEC3", nv, 5122, { normalized: true, min: [-32767, -32767, -32767], max: [32767, 32767, 32767] });
  const N = addAcc(addView(Buffer.from(Nn.buffer), 34962, 4), "VEC3", nv, 5120, { normalized: true });
  const I = addAcc(addView(Buffer.from(ix.buffer), 34963), "SCALAR", ix.length, 5123);
  gltf.meshes.push({ name, primitives: [{ attributes: { POSITION: A, NORMAL: N }, indices: I }] });
  gltf.nodes.push({ name, mesh: gltf.meshes.length - 1, translation: ctr, scale: half }); gltf.scenes[0].nodes.push(gltf.nodes.length - 1);
  stats[name] = { parts: parts.length, verts: nv, tris: ix.length / 3 };
}
// anchors (centroid of named parts, metres, same frame) go in scene extras
const anchors = {};
for (const [k, rows] of Object.entries(anchorRows)) {
  const pts = rows.map((r) => meshes.get(r[2])).filter(Boolean).flatMap((m) => m.v.map(tx)); if (!pts.length) continue;
  anchors[k] = [0, 1, 2].map((a) => +(pts.reduce((s, q) => s + q[a], 0) / pts.length).toFixed(4));
}
gltf.scenes[0].extras = { anchors, source: "BodyParts3D, DBCLS, CC BY-SA 2.1 Japan" };
const bin = Buffer.concat(chunks); const binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
gltf.buffers.push({ byteLength: binPad.length });
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
const glb = Buffer.concat([head, jh, js, bh, binPad]);
writeFileSync(join(out, "anatomy.glb"), glb);
console.log(stats, "anchors:", Object.keys(anchors).join(","), "\nanatomy.glb", (glb.length / 1e6).toFixed(2), "MB");
