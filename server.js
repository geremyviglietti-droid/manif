// Carte collaborative éphémère. Aucune base de données, aucun log, aucun compte.
// Tout est en mémoire : un redémarrage efface tout, et chaque point expire après 48 h.
const express = require('express');
const crypto = require('crypto');

const TTL = 48 * 3600 * 1000;
const TYPES = ['rdv', 'nasse', 'secours', 'danger', 'info'];
const MAX_POSTS = 10, WINDOW = 10 * 60 * 1000; // 10 ajouts / 10 min / appareil
const HIDE_AT = 3;                              // masqué après 3 votes "faux" nets

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '2kb' }));
app.use((req, res, next) => {
  res.set({ 'Referrer-Policy': 'origin', 'Cache-Control': 'no-store' });
  next();
});
app.use(express.static(__dirname + '/public', { setHeaders: r => r.set('Cache-Control', 'no-store') }));

const salt = crypto.randomBytes(16).toString('hex'); // change à chaque démarrage
const who = req => crypto.createHash('sha256').update(salt + req.ip).digest('hex').slice(0, 16);

const points = new Map(); // id -> point
const posts = new Map();  // who -> [timestamps]

function allowed(id) {
  const now = Date.now();
  const list = (posts.get(id) || []).filter(t => now - t < WINDOW);
  if (list.length >= MAX_POSTS) return false;
  list.push(now); posts.set(id, list);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, p] of points) if (p.expires <= now) points.delete(id);
  for (const [k, l] of posts) if (!l.some(t => now - t < WINDOW)) posts.delete(k);
}, 60 * 1000);

app.get('/api/points', (req, res) => {
  const now = Date.now();
  const out = [];
  for (const p of points.values()) {
    if (p.expires <= now || p.no - p.ok >= HIDE_AT) continue;
    out.push({ id: p.id, lat: p.lat, lng: p.lng, type: p.type, text: p.text,
               created: p.created, expires: p.expires, ok: p.ok, no: p.no });
  }
  res.json(out);
});

app.post('/api/points', (req, res) => {
  const { lat, lng, type, text } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ error: 'position' });
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'type' });
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!allowed(who(req))) return res.status(429).json({ error: 'trop de signalements' });
  const now = Date.now();
  const p = { id: crypto.randomUUID(), lat: +lat.toFixed(5), lng: +lng.toFixed(5), type, text: clean,
              created: now, expires: now + TTL, ok: 0, no: 0, voters: new Set() };
  points.set(p.id, p);
  res.status(201).json({ id: p.id });
});

app.post('/api/points/:id/vote', (req, res) => {
  const p = points.get(req.params.id);
  const v = req.body && req.body.v;
  if (!p || !['ok', 'no'].includes(v)) return res.status(400).json({ error: 'vote' });
  const me = who(req);
  if (p.voters.has(me)) return res.status(409).json({ error: 'déjà voté' });
  p.voters.add(me); p[v]++;
  res.json({ ok: p.ok, no: p.no });
});

app.listen(process.env.PORT || 3000, () => console.log('Carte prête (aucun log des visites).'));
