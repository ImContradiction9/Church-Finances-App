# Financeiro da Igreja — Guia de Deploy

## O que você precisa

- Uma conta gratuita em Railway.app, Render.com ou qualquer VPS com Node.js 18+
- O arquivo compactado deste projeto

---

## Opção 1 — Railway.app (recomendado, grátis)

1. Acesse https://railway.app e crie uma conta
2. Clique em "New Project" → "Deploy from GitHub"
   - Ou use "Deploy from local" se não quiser usar GitHub
3. Faça upload da pasta do projeto
4. Na seção "Variables", adicione:
   - `JWT_SECRET` = uma senha longa aleatória (ex: `igrejaFinanceiro2024xK9mP3qZ`)
   - `PORT` = `3000` (Railway define automaticamente, mas confirme)
5. O Railway detecta o `package.json` e instala tudo automaticamente
6. Após deploy, você recebe uma URL tipo `https://seu-projeto.up.railway.app`

---

## Opção 2 — Render.com (grátis)

1. Acesse https://render.com e crie uma conta
2. Clique em "New Web Service"
3. Conecte ao repositório GitHub com o projeto
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Em "Environment Variables", adicione `JWT_SECRET`
6. Clique em "Deploy"

---

## Opção 3 — VPS próprio (DigitalOcean, Hostinger, etc.)

```bash
# No servidor, com Node.js 18+ instalado:
git clone <seu-repo> /app/igreja
cd /app/igreja
npm install

# Criar arquivo .env
cp .env.example .env
nano .env   # edite JWT_SECRET com uma chave segura

# Instalar PM2 para manter o servidor rodando
npm install -g pm2
pm2 start server.js --name igreja
pm2 startup   # para iniciar automaticamente no boot
pm2 save

# O app estará em http://seu-ip:3000
# Use Nginx como proxy reverso para usar a porta 80/443 com HTTPS
```

---

## Primeiro acesso

1. Abra a URL do seu site
2. Na tela de login, clique em "Criar conta"
3. **O primeiro usuário criado é automaticamente Administrador**
4. Faça login e comece a usar

---

## Backup do banco de dados

O banco de dados fica no arquivo `igreja.db` na raiz do projeto.
Para fazer backup, basta copiar este arquivo.

No Railway/Render, o banco é perdido a cada deploy se você não usar
um volume persistente. Configure um volume em `/app` para preservar o banco.

---

## Adicionar mais usuários

1. Faça login como administrador
2. Vá em **Configurações**
3. Role até **Usuários**
4. Clique em **+ Adicionar usuário**

---

## Variáveis de ambiente necessárias

| Variável    | Descrição                          | Obrigatória |
|-------------|-------------------------------------|-------------|
| JWT_SECRET  | Chave secreta para tokens de login  | Sim         |
| PORT        | Porta do servidor (padrão: 3000)    | Não         |
| DB_PATH     | Caminho do banco SQLite             | Não         |
