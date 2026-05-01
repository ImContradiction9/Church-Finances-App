const express = require('express')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'troque-esta-chave-secreta-em-producao'

// ── Database ──────────────────────────────────────────────────────────────
const db = new Database(process.env.DB_PATH || 'igreja.db')
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    descr TEXT NOT NULL,
    val REAL NOT NULL,
    cat TEXT DEFAULT '',
    dat TEXT NOT NULL,
    obs TEXT DEFAULT '',
    setor TEXT DEFAULT 'Geral',
    status TEXT DEFAULT 'pago',
    datPag TEXT,
    valPag REAL,
    grupoId INTEGER,
    parcela TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// Default config if empty
const defCats = {
  entrada: ['Dízimos','Ofertas','Doações','Eventos','Aluguel recebido','Outros'],
  saida: ['Aluguel','Água/Luz/Internet','Manutenção','Salários','Missões','Material','Outros']
}
const cfgCount = db.prepare('SELECT COUNT(*) as n FROM config').get().n
if (cfgCount === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO config (key,value) VALUES (?,?)')
  ins.run('cats', JSON.stringify(defCats))
  ins.run('setores', JSON.stringify(['Geral']))
  ins.run('meta', JSON.stringify({entrada: 0, saida: 0}))
}

// ── Middleware ────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

function auth(req, res, next) {
  const h = req.headers.authorization
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({error: 'Não autenticado'})
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({error: 'Sessão expirada'})
  }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Acesso restrito a administradores'})
  next()
}

// ── Auth routes ───────────────────────────────────────────────────────────
// Check if system has any users (first-run setup)
app.get('/auth/status', (req, res) => {
  const n = db.prepare('SELECT COUNT(*) as n FROM users').get().n
  res.json({setup: n === 0})
})

// First user setup (no auth needed) or admin creates user
app.post('/auth/register', (req, res) => {
  const { username, name, password, role = 'user' } = req.body
  if (!username || !name || !password) return res.status(400).json({error: 'Preencha todos os campos'})
  const n = db.prepare('SELECT COUNT(*) as n FROM users').get().n

  if (n > 0) {
    // Subsequent users require admin token
    const h = req.headers.authorization
    if (!h) return res.status(401).json({error: 'Apenas admins podem criar usuários'})
    try {
      const u = jwt.verify(h.slice(7), JWT_SECRET)
      if (u.role !== 'admin') return res.status(403).json({error: 'Apenas admins podem criar usuários'})
    } catch {
      return res.status(401).json({error: 'Token inválido'})
    }
  }

  try {
    const hash = bcrypt.hashSync(password, 10)
    const assignedRole = n === 0 ? 'admin' : role
    db.prepare('INSERT INTO users (username,name,password,role) VALUES (?,?,?,?)').run(username, name, hash, assignedRole)
    res.json({ok: true, firstAdmin: n === 0})
  } catch {
    res.status(400).json({error: 'Nome de usuário já existe'})
  }
})

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({error: 'Usuário ou senha incorretos'})
  }
  const token = jwt.sign({id: user.id, username: user.username, name: user.name, role: user.role}, JWT_SECRET, {expiresIn: '30d'})
  res.json({token, username: user.username, name: user.name, role: user.role})
})

app.post('/auth/change-password', auth, (req, res) => {
  const { current, newPass } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!bcrypt.compareSync(current, user.password)) return res.status(400).json({error: 'Senha atual incorreta'})
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPass, 10), req.user.id)
  res.json({ok: true})
})

// ── Transaction routes ────────────────────────────────────────────────────
app.get('/api/txs', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all()
  res.json(rows.map(r => ({
    id: r.id, tipo: r.tipo, desc: r.descr, val: r.val, cat: r.cat,
    dat: r.dat, obs: r.obs, setor: r.setor, status: r.status,
    datPag: r.datPag, valPag: r.valPag, grupoId: r.grupoId, parcela: r.parcela
  })))
})

app.post('/api/txs', auth, (req, res) => {
  const t = req.body
  if (Array.isArray(t)) {
    // Bulk insert (installments)
    const ins = db.prepare('INSERT INTO transactions (tipo,descr,val,cat,dat,obs,setor,status,datPag,valPag,grupoId,parcela,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    const insertMany = db.transaction(arr => arr.map(x =>
      ins.run(x.tipo, x.desc, x.val, x.cat||'', x.dat, x.obs||'', x.setor||'Geral', x.status||'pendente', x.datPag||null, x.valPag||null, x.grupoId||null, x.parcela||null, req.user.id)
    ))
    const results = insertMany(t)
    res.json(results.map((r, i) => ({...t[i], id: r.lastInsertRowid})))
  } else {
    const r = db.prepare('INSERT INTO transactions (tipo,descr,val,cat,dat,obs,setor,status,datPag,valPag,grupoId,parcela,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(t.tipo, t.desc, t.val, t.cat||'', t.dat, t.obs||'', t.setor||'Geral', t.status||'pago', t.datPag||null, t.valPag||null, t.grupoId||null, t.parcela||null, req.user.id)
    res.json({...t, id: r.lastInsertRowid})
  }
})

app.put('/api/txs/:id', auth, (req, res) => {
  const t = req.body
  db.prepare('UPDATE transactions SET tipo=?,descr=?,val=?,cat=?,dat=?,obs=?,setor=?,status=?,datPag=?,valPag=?,parcela=? WHERE id=?')
    .run(t.tipo, t.desc, t.val, t.cat||'', t.dat, t.obs||'', t.setor||'Geral', t.status, t.datPag||null, t.valPag||null, t.parcela||null, req.params.id)
  res.json({ok: true})
})

app.delete('/api/txs/:id', auth, (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id)
  res.json({ok: true})
})

app.delete('/api/txs/grupo/:grupoId', auth, (req, res) => {
  db.prepare('DELETE FROM transactions WHERE grupoId = ?').run(req.params.grupoId)
  res.json({ok: true})
})

// Bulk baixa
app.post('/api/txs/baixa', auth, (req, res) => {
  const { ids, datPag } = req.body
  const upd = db.prepare('UPDATE transactions SET status=?,datPag=?,valPag=val WHERE id=? AND status=?')
  const run = db.transaction(arr => arr.forEach(id => upd.run('pago', datPag, id, 'pendente')))
  run(ids)
  res.json({ok: true})
})

// ── Config routes ─────────────────────────────────────────────────────────
app.get('/api/config', auth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM config').all()
  const cfg = {}
  rows.forEach(r => { try { cfg[r.key] = JSON.parse(r.value) } catch { cfg[r.key] = r.value } })
  res.json(cfg)
})

app.put('/api/config', auth, (req, res) => {
  const upd = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
  db.transaction(() => Object.entries(req.body).forEach(([k, v]) => upd.run(k, JSON.stringify(v))))()
  res.json({ok: true})
})

// ── User management ───────────────────────────────────────────────────────
app.get('/api/users', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id,username,name,role,created_at FROM users').all())
})

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({error: 'Não pode excluir a si mesmo'})
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ok: true})
})

app.put('/api/users/:id/role', auth, adminOnly, (req, res) => {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, req.params.id)
  res.json({ok: true})
})

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✝  Financeiro da Igreja`)
  console.log(`   Rodando em: http://localhost:${PORT}`)
  console.log(`   Banco de dados: ${process.env.DB_PATH || 'igreja.db'}\n`)
})
