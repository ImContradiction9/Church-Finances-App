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
    sectors TEXT DEFAULT NULL,
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

// Migrate existing users table — add sectors column if missing
try {
  db.prepare('SELECT sectors FROM users LIMIT 1').get()
} catch {
  db.exec('ALTER TABLE users ADD COLUMN sectors TEXT DEFAULT NULL')
  console.log('Migration: added sectors column to users')
}

// ── Seed data (migrated from previous app) ──────────────────────────────
const SEED = {"txs":[{"tipo":"saida","desc":"Combustivel todo campo","val":1900.0,"cat":"Transporte/Combustivel","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"CEADEB","val":1951.0,"cat":"Fundo Convencional","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Danilo","val":740.0,"cat":"Salários","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Não identificado","val":21.0,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Lagedo","status":"pago","datPag":"2025-04-30","valPag":21.0,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":53.25,"cat":"Ofertas","dat":"2025-04-30","obs":"","setor":"Lagedo","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Gastos","val":25.8,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Lage Nova","status":"pago","datPag":"2025-04-30","valPag":25.8,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":42.45,"cat":"Ofertas","dat":"2025-04-30","obs":"","setor":"Lage Nova","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Microfone","val":104.0,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Capoeiras","status":"pago","datPag":"2025-04-30","valPag":104.0,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":51.85,"cat":"Ofertas","dat":"2025-04-30","obs":"","setor":"Capoeiras","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":214.5,"cat":"Dízimos","dat":"2025-04-30","obs":"","setor":"Capoeiras","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Não identificado","val":35.0,"cat":"Outros","dat":"2025-04-30","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-04-30","valPag":35.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza","val":100.0,"cat":"Filantropia","dat":"2025-04-30","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-04-30","valPag":100.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"agua","val":45.0,"cat":"Água","dat":"2025-04-30","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-04-30","valPag":45.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza","val":95.45,"cat":"Material de Limpeza","dat":"2025-04-30","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-04-30","valPag":95.45,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Ofertas","val":90.0,"cat":"Ofertas","dat":"2025-04-30","obs":"","setor":"Sangrador","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":1337.25,"cat":"Dízimos","dat":"2025-04-30","obs":"","setor":"Sangrador","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Falta","val":0.37,"cat":"Faltas","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-04-30","valPag":0.37,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Casa Pastoral","val":350.0,"cat":"Aluguel","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-04-30","valPag":350.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Lagoa das Moças","val":100.0,"cat":"Aluguel","dat":"2025-04-30","obs":"","setor":"Lagoa das Moças","status":"pago","datPag":"2025-04-30","valPag":100.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Combustivel","val":120.0,"cat":"Transporte/Combustivel","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-04-30","valPag":120.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Coelba","val":268.38,"cat":"Luz","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-04-30","valPag":268.38,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":454.25,"cat":"Ofertas","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":2134.5,"cat":"Dízimos","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Sobra","val":99.99,"cat":"Ofertas","dat":"2025-04-30","obs":"","setor":"Junco","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Cordas Baixo","val":90.0,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":90.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Pregador","val":200.0,"cat":"Eventos","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":200.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Caravana","val":150.0,"cat":"Transporte/Combustivel","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":150.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Agua","val":10.5,"cat":"Água","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":10.5,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Servião","val":100.0,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":100.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Material","val":124.7,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":124.7,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Compras","val":92.2,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":92.2,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"combustivel","val":383.5,"cat":"Transporte/Combustivel","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":383.5,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Manutenço","val":169.0,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":169.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza","val":100.0,"cat":"Filantropia","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":100.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Casa Pastoral","val":199.57,"cat":"Aluguel","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":199.57,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Luz","val":73.07,"cat":"Luz","dat":"2025-04-30","obs":"","setor":"Junco","status":"pago","datPag":"2025-04-30","valPag":73.07,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Ofertas Abril","val":393.45,"cat":"Ofertas","dat":"2025-04-30","obs":"","setor":"Junco","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":2742.4,"cat":"Dízimos","dat":"2025-04-30","obs":"","setor":"Junco","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Construço","val":2000.0,"cat":"Construção","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-04-30","valPag":2000.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Agua","val":142.0,"cat":"Água","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-04-30","valPag":142.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Luz","val":300.0,"cat":"Luz","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-04-30","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Copos e pilhas","val":154.0,"cat":"Manutenção","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-04-30","valPag":154.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Aluguel, agua e luz","val":200.0,"cat":"Aluguel","dat":"2025-04-30","obs":"","setor":"Taquari","status":"pago","datPag":"2025-04-30","valPag":200.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Aluguel","val":200.0,"cat":"Aluguel","dat":"2025-04-30","obs":"","setor":"Limpos","status":"pago","datPag":"2025-04-30","valPag":200.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza","val":300.0,"cat":"Filantropia","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-04-30","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Viagem lagedo","val":250.0,"cat":"Transporte/Combustivel","dat":"2025-04-30","obs":"","setor":"Lagedo","status":"pago","datPag":"2025-04-30","valPag":250.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Danilo","val":750.0,"cat":"Salários","dat":"2025-04-30","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-04-30","valPag":750.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Musico Rodrigo","val":300.0,"cat":"Filantropia","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-04-30","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":617.9,"cat":"Dízimos","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":4957.0,"cat":"Dízimos","dat":"2025-04-30","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":14.6,"cat":"Ofertas","dat":"2025-03-31","obs":"","setor":"Capoeiras","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":166.0,"cat":"Dízimos","dat":"2025-03-31","obs":"","setor":"Capoeiras","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Danilo","val":750.0,"cat":"Salários","dat":"2025-03-31","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-03-31","valPag":750.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Som","val":139.0,"cat":"Manutenção","dat":"2025-03-31","obs":"","setor":"Taquari","status":"pago","datPag":"2025-03-31","valPag":139.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Aluguel","val":117.0,"cat":"Aluguel","dat":"2025-03-31","obs":"","setor":"Taquari","status":"pago","datPag":"2025-03-31","valPag":117.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"luz","val":105.0,"cat":"Luz","dat":"2025-03-31","obs":"","setor":"Jiboia","status":"pago","datPag":"2025-03-31","valPag":105.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Construço","val":2000.0,"cat":"Construção","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-03-31","valPag":2000.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Agua e luz","val":55.0,"cat":"Luz","dat":"2025-03-31","obs":"","setor":"Taquari","status":"pago","datPag":"2025-03-31","valPag":55.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Aluguel","val":200.0,"cat":"Aluguel","dat":"2025-03-31","obs":"","setor":"Limpos","status":"pago","datPag":"2025-03-31","valPag":200.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Festa das crianãas","val":121.0,"cat":"Eventos","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-03-31","valPag":121.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Ceia","val":26.0,"cat":"Santa Ceia","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-03-31","valPag":26.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Material construãoo cleristom","val":1500.0,"cat":"Construção","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-03-31","valPag":1500.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza","val":300.0,"cat":"Filantropia","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-03-31","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Musico Rodrigo","val":300.0,"cat":"Filantropia","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-03-31","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Ofertas marão","val":761.9,"cat":"Ofertas","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo Marão","val":10052.0,"cat":"Dízimos","dat":"2025-03-31","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Salatiel","val":400.0,"cat":"Salários","dat":"2025-12-31","obs":"","setor":"Junco","status":"pago","datPag":"2025-12-31","valPag":400.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Despesas não identificadas","val":148.0,"cat":"Outros","dat":"2025-12-31","obs":"","setor":"Capoeiras","status":"pago","datPag":"2025-12-31","valPag":148.0,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":37.0,"cat":"Ofertas","dat":"2025-12-31","obs":"","setor":"Capoeiras","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":458.0,"cat":"Dízimos","dat":"2025-12-31","obs":"","setor":"Capoeiras","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Mercado e despesas não identificadas","val":407.9,"cat":"Outros","dat":"2025-12-31","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-12-31","valPag":407.9,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Luz","val":37.95,"cat":"Luz","dat":"2025-12-31","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-12-31","valPag":37.95,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Agua","val":45.0,"cat":"Água","dat":"2025-12-31","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-12-31","valPag":45.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza","val":100.0,"cat":"Filantropia","dat":"2025-12-31","obs":"","setor":"Sangrador","status":"pago","datPag":"2025-12-31","valPag":100.0,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta Dezembro","val":58.0,"cat":"Ofertas","dat":"2025-12-31","obs":"","setor":"Sangrador","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo Dezembro","val":679.0,"cat":"Dízimos","dat":"2025-12-31","obs":"","setor":"Sangrador","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Faltas","val":133.62,"cat":"Faltas","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":133.62,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Falta","val":1.0,"cat":"Faltas","dat":"2025-12-31","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-12-31","valPag":1.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Danilo","val":1500.0,"cat":"Salários","dat":"2025-12-31","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-12-31","valPag":1500.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Aluguel","val":100.0,"cat":"Aluguel","dat":"2025-12-31","obs":"","setor":"Varsela","status":"pago","datPag":"2025-12-31","valPag":100.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Aluguel","val":350.0,"cat":"Aluguel","dat":"2025-12-31","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-12-31","valPag":350.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Porta","val":80.0,"cat":"Construção","dat":"2025-12-31","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-12-31","valPag":80.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Casa, Igreja e Versela","val":192.45,"cat":"Luz","dat":"2025-12-31","obs":"","setor":"Bela Vista","status":"pago","datPag":"2025-12-31","valPag":192.45,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":269.0,"cat":"Ofertas","dat":"2025-12-31","obs":"","setor":"Bela Vista","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":2787.0,"cat":"Dízimos","dat":"2025-12-31","obs":"","setor":"Bela Vista","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Motorista","val":300.0,"cat":"Eventos","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Hotel","val":650.0,"cat":"Eventos","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":650.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Divulgaãoo festa","val":150.0,"cat":"Marketing","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":150.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Copos Descartaveis","val":100.0,"cat":"Manutenção","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":100.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Almoão Paulo","val":120.0,"cat":"Outros","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":120.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza","val":74.0,"cat":"Filantropia","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":74.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Agua Mineral","val":36.0,"cat":"Água","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":36.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Tapete","val":50.0,"cat":"Manutenção","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":50.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Produtos de limpeza","val":30.0,"cat":"Material de Limpeza","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":30.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Contador","val":300.0,"cat":"Contabilidade","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Limpeza da Igreja","val":300.0,"cat":"Filantropia","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":300.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Pães","val":13.78,"cat":"Santa Ceia","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":13.78,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Aluguel","val":150.0,"cat":"Aluguel","dat":"2025-12-31","obs":"","setor":"Taquari","status":"pago","datPag":"2025-12-31","valPag":150.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Luz","val":178.0,"cat":"Luz","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":178.0,"grupoId":null,"parcela":null},{"tipo":"saida","desc":"Cleberson Servento","val":600.0,"cat":"Construção","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pago","datPag":"2025-12-31","valPag":600.0,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Oferta","val":1086.4,"cat":"Ofertas","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null},{"tipo":"entrada","desc":"Dizimo","val":3055.0,"cat":"Dízimos","dat":"2025-12-31","obs":"","setor":"Romulo Campos","status":"pendente","datPag":null,"valPag":null,"grupoId":null,"parcela":null}],"cats":{"entrada":["Dízimos","Ofertas","Doações","Eventos","Outros","Campanhas"],"saida":["Aluguel","Manutenção","Salários","Material","Outros","Água","Luz","Internet","Telefone","Filantropia","Construção","Santa Ceia","Contabilidade","Material de Limpeza","Marketing","Eventos","Faltas","Transporte/Combustivel","Fundo Convencional"]},"setores":["Geral","Romulo Campos","Junco","Bela Vista","Lagedo","Lage Nova","Capoeiras","Sangrador","Lagoa das Moças","Taquari","Limpos","Jiboia","Varsela"],"meta":{"entrada":0,"saida":0}}

// Default config + seed
const cfgCount = db.prepare('SELECT COUNT(*) as n FROM config').get().n
if (cfgCount === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO config (key,value) VALUES (?,?)')
  ins.run('cats',    JSON.stringify(SEED.cats))
  ins.run('setores', JSON.stringify(SEED.setores))
  ins.run('meta',    JSON.stringify(SEED.meta || {entrada:0,saida:0}))
}

// Seed transactions if database is empty
const txCount = db.prepare('SELECT COUNT(*) as n FROM transactions').get().n
if (txCount === 0 && SEED.txs && SEED.txs.length > 0) {
  console.log(`Carregando ${SEED.txs.length} transações do seed...`)
  const ins = db.prepare(`INSERT INTO transactions
    (tipo,descr,val,cat,dat,obs,setor,status,datPag,valPag,grupoId,parcela,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`)
  const insertAll = db.transaction(txs => txs.forEach(t =>
    ins.run(t.tipo,t.desc,t.val,t.cat||'',t.dat,t.obs||'',t.setor||'Geral',
            t.status,t.datPag||null,t.valPag||null,t.grupoId||null,t.parcela||null)
  ))
  insertAll(SEED.txs)
  console.log(`Seed concluído: ${SEED.txs.length} transações carregadas.`)
}

// ── Helpers ───────────────────────────────────────────────────────────────
// Returns array of allowed sectors for a user, or null = all sectors
function getUserSectors(userId, role) {
  if (role === 'admin') return null // admins see everything
  const u = db.prepare('SELECT sectors FROM users WHERE id = ?').get(userId)
  if (!u || !u.sectors) return null // no restriction = all sectors
  try {
    const s = JSON.parse(u.sectors)
    return Array.isArray(s) && s.length > 0 ? s : null
  } catch { return null }
}

function canAccessSetor(userId, role, setor) {
  const allowed = getUserSectors(userId, role)
  return allowed === null || allowed.includes(setor)
}

function mapTx(r) {
  return {
    id: r.id, tipo: r.tipo, desc: r.descr, val: r.val, cat: r.cat,
    dat: r.dat, obs: r.obs, setor: r.setor, status: r.status,
    datPag: r.datPag, valPag: r.valPag, grupoId: r.grupoId, parcela: r.parcela
  }
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
app.get('/auth/status', (req, res) => {
  const n = db.prepare('SELECT COUNT(*) as n FROM users').get().n
  res.json({setup: n === 0})
})

app.post('/auth/register', (req, res) => {
  const { username, name, password, role = 'user', sectors = null } = req.body
  if (!username || !name || !password) return res.status(400).json({error: 'Preencha todos os campos'})
  const n = db.prepare('SELECT COUNT(*) as n FROM users').get().n

  if (n > 0) {
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
    // Admins always have null (all) sectors
    const assignedSectors = assignedRole === 'admin' ? null : (sectors && sectors.length > 0 ? JSON.stringify(sectors) : null)
    db.prepare('INSERT INTO users (username,name,password,role,sectors) VALUES (?,?,?,?,?)')
      .run(username, name, hash, assignedRole, assignedSectors)
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
  // Parse user sectors for the response
  let sectors = null
  if (user.role !== 'admin' && user.sectors) {
    try { sectors = JSON.parse(user.sectors) } catch {}
  }
  const token = jwt.sign({id: user.id, username: user.username, name: user.name, role: user.role}, JWT_SECRET, {expiresIn: '30d'})
  res.json({token, username: user.username, name: user.name, role: user.role, sectors})
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
  const allowed = getUserSectors(req.user.id, req.user.role)
  let rows
  if (allowed) {
    const ph = allowed.map(() => '?').join(',')
    rows = db.prepare(`SELECT * FROM transactions WHERE setor IN (${ph}) ORDER BY created_at DESC`).all(...allowed)
  } else {
    rows = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all()
  }
  res.json(rows.map(mapTx))
})

app.post('/api/txs', auth, (req, res) => {
  const t = req.body
  if (Array.isArray(t)) {
    // Validate sector access for all items
    const badSetor = t.find(x => !canAccessSetor(req.user.id, req.user.role, x.setor || 'Geral'))
    if (badSetor) return res.status(403).json({error: `Sem acesso ao setor "${badSetor.setor}"`})

    const ins = db.prepare('INSERT INTO transactions (tipo,descr,val,cat,dat,obs,setor,status,datPag,valPag,grupoId,parcela,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    const insertMany = db.transaction(arr => arr.map(x =>
      ins.run(x.tipo, x.desc, x.val, x.cat||'', x.dat, x.obs||'', x.setor||'Geral', x.status||'pendente', x.datPag||null, x.valPag||null, x.grupoId||null, x.parcela||null, req.user.id)
    ))
    const results = insertMany(t)
    res.json(results.map((r, i) => ({...t[i], id: r.lastInsertRowid})))
  } else {
    if (!canAccessSetor(req.user.id, req.user.role, t.setor || 'Geral')) {
      return res.status(403).json({error: `Sem acesso ao setor "${t.setor}"`})
    }
    const r = db.prepare('INSERT INTO transactions (tipo,descr,val,cat,dat,obs,setor,status,datPag,valPag,grupoId,parcela,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(t.tipo, t.desc, t.val, t.cat||'', t.dat, t.obs||'', t.setor||'Geral', t.status||'pago', t.datPag||null, t.valPag||null, t.grupoId||null, t.parcela||null, req.user.id)
    res.json({...t, id: r.lastInsertRowid})
  }
})

app.put('/api/txs/:id', auth, (req, res) => {
  const t = req.body
  if (!canAccessSetor(req.user.id, req.user.role, t.setor || 'Geral')) {
    return res.status(403).json({error: `Sem acesso ao setor "${t.setor}"`})
  }
  db.prepare('UPDATE transactions SET tipo=?,descr=?,val=?,cat=?,dat=?,obs=?,setor=?,status=?,datPag=?,valPag=?,parcela=? WHERE id=?')
    .run(t.tipo, t.desc, t.val, t.cat||'', t.dat, t.obs||'', t.setor||'Geral', t.status, t.datPag||null, t.valPag||null, t.parcela||null, req.params.id)
  res.json({ok: true})
})

app.delete('/api/txs/:id', auth, (req, res) => {
  const tx = db.prepare('SELECT setor FROM transactions WHERE id = ?').get(req.params.id)
  if (tx && !canAccessSetor(req.user.id, req.user.role, tx.setor)) {
    return res.status(403).json({error: 'Sem acesso a este setor'})
  }
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id)
  res.json({ok: true})
})

app.delete('/api/txs/grupo/:grupoId', auth, (req, res) => {
  db.prepare('DELETE FROM transactions WHERE grupoId = ?').run(req.params.grupoId)
  res.json({ok: true})
})

app.post('/api/txs/baixa', auth, (req, res) => {
  const { ids, datPag } = req.body
  const upd = db.prepare('UPDATE transactions SET status=?,datPag=?,valPag=val WHERE id=? AND status=?')
  db.transaction(arr => arr.forEach(id => upd.run('pago', datPag, id, 'pendente')))(ids)
  res.json({ok: true})
})

// ── Config routes ─────────────────────────────────────────────────────────
app.get('/api/config', auth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM config').all()
  const cfg = {}
  rows.forEach(r => { try { cfg[r.key] = JSON.parse(r.value) } catch { cfg[r.key] = r.value } })
  // For non-admin users with sector restrictions, filter setores
  const allowed = getUserSectors(req.user.id, req.user.role)
  if (allowed && cfg.setores) {
    cfg.setores = cfg.setores.filter(s => allowed.includes(s))
  }
  res.json(cfg)
})

app.put('/api/config', auth, (req, res) => {
  const upd = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
  db.transaction(() => Object.entries(req.body).forEach(([k, v]) => upd.run(k, JSON.stringify(v))))()
  res.json({ok: true})
})

// ── User management ───────────────────────────────────────────────────────
app.get('/api/users', auth, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id,username,name,role,sectors,created_at FROM users').all()
  res.json(users.map(u => ({
    ...u,
    sectors: u.sectors ? JSON.parse(u.sectors) : null
  })))
})

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({error: 'Não pode excluir a si mesmo'})
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ok: true})
})

app.put('/api/users/:id/role', auth, adminOnly, (req, res) => {
  const newRole = req.body.role
  // Admins have no sector restriction
  const newSectors = newRole === 'admin' ? null : undefined
  if (newSectors === null) {
    db.prepare('UPDATE users SET role=?, sectors=NULL WHERE id=?').run(newRole, req.params.id)
  } else {
    db.prepare('UPDATE users SET role=? WHERE id=?').run(newRole, req.params.id)
  }
  res.json({ok: true})
})

// Update user sectors (admin only)
app.put('/api/users/:id/sectors', auth, adminOnly, (req, res) => {
  const { sectors } = req.body // array or null
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({error: 'Usuário não encontrado'})
  if (user.role === 'admin') return res.status(400).json({error: 'Administradores têm acesso a todos os setores'})
  const val = sectors && sectors.length > 0 ? JSON.stringify(sectors) : null
  db.prepare('UPDATE users SET sectors=? WHERE id=?').run(val, req.params.id)
  res.json({ok: true})
})

// ── Start ─────────────────────────────────────────────────────────────────
// Railway requires binding to 0.0.0.0, not just localhost
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✝  Financeiro da Igreja`)
  console.log(`   Rodando em: http://0.0.0.0:${PORT}`)
  console.log(`   Banco de dados: ${process.env.DB_PATH || 'igreja.db'}\n`)
}).on('error', err => {
  console.error('Erro ao iniciar servidor:', err)
  process.exit(1)
})
