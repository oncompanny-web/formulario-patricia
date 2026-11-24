#!/usr/bin/env bash
# Exporta os e-mails para importar na Kiwify: um e-mail por linha, sem cabeçalho.
#
#   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
#   SUPABASE_SECRET_KEY=sb_secret_... \
#   ./scripts/exportar-emails.sh > emails-kiwify.txt
#
# Por padrão exporta só as inscrições com selecionada = true.
# Use TODAS=1 para exportar todos os e-mails inscritos.
# A chave secreta (service_role) dá acesso total: nunca a coloque no site.
set -euo pipefail
: "${SUPABASE_URL:?defina SUPABASE_URL}"
: "${SUPABASE_SECRET_KEY:?defina SUPABASE_SECRET_KEY}"

filtro="&selecionada=is.true"
[[ "${TODAS:-0}" == "1" ]] && filtro=""

curl -fsS "${SUPABASE_URL%/}/rest/v1/inscricoes?select=email&order=created_at${filtro}" \
  -H "apikey: ${SUPABASE_SECRET_KEY}" \
  -H "Accept: text/csv" | awk 'NR > 1'
