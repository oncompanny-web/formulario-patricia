# Inscrição — 50 vagas gratuitas do M.P.P. | Método Patrícia Petraroli

Página pública de inscrição (site estático Vite + TypeScript) com persistência no Supabase.

```
index.html                  página (apresentação + formulário)
src/main.ts                 comportamento do formulário (máscara, validação, envio, confirmação)
src/validation.ts           regras de validação/normalização (+ testes em validation.test.ts)
src/api.ts                  chamada à função solicitar_vaga no Supabase
src/styles.css              visual (paleta da Patrícia, Cormorant Garamond + DM Sans)
public/assets/              simbolo-bege.png (sobre vinho) e simbolo-vermelho-02.png (sobre claro)
supabase/migrations/        tabela inscricoes + função solicitar_vaga
scripts/exportar-emails.sh  exporta e-mails (um por linha) para a Kiwify
```

## Como funciona

1. A pessoa preenche nome completo, WhatsApp com DDD e e-mail.
2. O navegador valida e normaliza (máscara `(11) 91234-5678`, aceita número colado com `+55`,
   e-mail sem espaços e em minúsculas, sugestão para erros como `gmail.con`).
3. O site chama `public.solicitar_vaga(p_nome, p_whatsapp, p_email)`, que **valida de novo no
   servidor**, normaliza e grava. O WhatsApp é salvo como `+55DDNNNNNNNNN`.
4. A confirmação só aparece quando o banco responde que o registro está salvo. Se o e-mail já
   estava inscrito, a inscrição original é mantida (uma inscrição por e-mail) e a página avisa.

### Segurança

- A tabela `inscricoes` tem RLS ativo, sem políticas, e sem privilégios para `anon`/`authenticated`:
  pela chave pública **ninguém consegue ler, alterar ou apagar** inscrições.
- A chave pública só consegue executar `solicitar_vaga`.
- A equipe acessa os dados pelo painel do Supabase (login da equipe) ou com a chave secreta,
  que **nunca** deve ir para o site.

## Configuração para publicar

1. **Crie um projeto** em https://supabase.com (região sugerida: São Paulo).
2. **Aplique a migração** — escolha uma opção:
   - Painel: *SQL Editor* → cole o conteúdo de
     `supabase/migrations/20261124120000_inscricoes.sql` → *Run*.
   - CLI: `supabase link --project-ref SEU_REF` e depois `supabase db push`.
3. **Variáveis de ambiente** do build (copie `.env.example` para `.env` ou configure na hospedagem):

   | Variável | Onde encontrar |
   |---|---|
   | `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → *Publishable key* (`sb_publishable_…`) ou a *anon key* legada |

4. **Build e hospedagem**: `npm ci && npm run build` gera `dist/`. Qualquer hospedagem estática
   serve (Vercel, Netlify, Cloudflare Pages, Hostinger…): comando `npm run build`, pasta `dist`,
   e as duas variáveis acima configuradas no painel da hospedagem.

> Observação: o arquivo `.env.local` deste repositório aponta para o Supabase **local** de teste.
> Ele tem prioridade sobre `.env`; apague-o (ou sobrescreva as variáveis) antes do build de produção.

## Desenvolvimento local

```bash
npm install
supabase start            # sobe o Supabase local (portas 554xx, ver supabase/config.toml) e aplica a migração
# crie .env.local com a API URL e a Publishable key que o comando acima imprime
npm run dev               # http://localhost:5173
npm test                  # testes das regras de validação
npm run build             # checagem de tipos + build de produção
```

## Seleção e exportação para a Kiwify

### Ver e exportar tudo (CSV)
Painel do Supabase → *Table Editor* → tabela `inscricoes` → botão **Export → Export table as CSV**.

### Marcar as 50 selecionadas
No *Table Editor*, mude a coluna `selecionada` para `true` nas pessoas escolhidas — ou, no
*SQL Editor*:

```sql
update public.inscricoes set selecionada = true
where email in ('pessoa1@exemplo.com', 'pessoa2@exemplo.com' /* … */);

select count(*) from public.inscricoes where selecionada;  -- deve dar 50
```

### Só a coluna de e-mail, um por linha

**Opção A — painel (sem instalar nada):** no *SQL Editor* rode

```sql
select email from public.inscricoes where selecionada order by created_at;
```

Clique em **Export → Download CSV**. O arquivo tem uma linha de cabeçalho `email`; apague essa
primeira linha (ou use `tail -n +2 arquivo.csv > emails-kiwify.txt` no Terminal).
Se preferir copiar e colar, a coluna de resultado também pode ser selecionada e copiada direto.

**Opção B — Terminal (já sai sem cabeçalho):**

```bash
SUPABASE_URL=https://SEU-PROJETO.supabase.co \
SUPABASE_SECRET_KEY=sb_secret_... \
./scripts/exportar-emails.sh > emails-kiwify.txt
# TODAS=1 ./scripts/exportar-emails.sh  → exporta todos os inscritos, não só os selecionados
```

A chave secreta fica em Project Settings → API Keys → *Secret keys*. Não compartilhe nem
coloque essa chave no site.

Depois, importe a lista `emails-kiwify.txt` nos alunos do curso na Área de Membros da Kiwify
(confira no painel da Kiwify o formato aceito na importação). A Kiwify envia o acesso por e-mail.

## Produção atual

- **Página:** https://oncompanny-web.github.io/formulario-patricia/ (GitHub Pages, repositório
  `oncompanny-web/formulario-patricia`). Cada push em `main` publica de novo via
  `.github/workflows/deploy.yml`.
- **Banco:** projeto Supabase **NATAN** (`lmglzcqmcenpzhfyvoor`), tabela `public.inscricoes` e
  função `public.solicitar_vaga`. Não foi criado projeto separado porque a organização tinha
  faturas em atraso; o restante do projeto NATAN não foi alterado.
- **Variáveis do build** ficam em GitHub → Settings → Secrets and variables → Actions →
  *Variables*: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ambas públicas por natureza).
  Nenhuma chave secreta está no site nem no Git.

Para migrar depois para um projeto exclusivo: crie o projeto, rode a migração nele, troque as
duas variáveis no GitHub e rode o workflow de novo (Actions → Publicar no GitHub Pages → Run workflow).

## Cartão-presente com QR

`cartao/gerar-cartao.mjs` gera o cartão de 55 × 85 mm e o QR, e confere a leitura dos QRs.

```bash
cd cartao && npm install && npm run gerar     # URL=https://... npm run gerar para outro endereço
```

Arquivos em `cartao/saida/`:

| Arquivo | Uso |
|---|---|
| `cartao-presente-55x85mm.pdf` | impressão em tamanho final (55 × 85 mm) |
| `cartao-presente-55x85mm-sangria-3mm.pdf` | 61 × 91 mm, para gráficas que pedem 3 mm de sangria |
| `cartao-presente-600dpi.png` | cartão em alta resolução (1300 × 2006 px, 600 dpi) |
| `qr-formulario-patricia.png` / `.svg` | QR separado, preto sobre branco (correção de erro Q) |
