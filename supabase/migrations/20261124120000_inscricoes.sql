-- Inscrições para as 50 vagas gratuitas do M.P.P. | Método Patrícia Petraroli
--
-- Segurança:
--   * A tabela fica com RLS ativo e SEM políticas, e sem privilégios para
--     anon/authenticated: ninguém lê, altera ou apaga pelo site/API pública.
--   * O site só consegue chamar a função public.solicitar_vaga(), que valida,
--     normaliza e grava (security definer).
--   * A equipe consulta/exporta pelo painel do Supabase (Table Editor / SQL
--     Editor) ou com a chave secreta (service_role), que ignora RLS.

create table public.inscricoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  whatsapp    text not null,
  email       text not null,
  selecionada boolean not null default false,
  created_at  timestamptz not null default now(),

  constraint inscricoes_email_key unique (email),
  constraint inscricoes_nome_check
    check (char_length(nome) between 3 and 120),
  constraint inscricoes_whatsapp_check
    check (whatsapp ~ '^\+55[1-9]{2}(9[0-9]{8}|[2-9][0-9]{7})$'),
  constraint inscricoes_email_check
    check (
      email = lower(btrim(email))
      and char_length(email) <= 254
      and email ~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
    )
);

comment on table public.inscricoes is
  'Inscrições das 50 vagas gratuitas do M.P.P. Marque selecionada = true nas pessoas liberadas na Kiwify.';
comment on column public.inscricoes.whatsapp is 'Formato +55DDNNNNNNNNN';
comment on column public.inscricoes.email is 'Minúsculo e sem espaços; uma inscrição por e-mail';
comment on column public.inscricoes.selecionada is 'Marcar true para as pessoas escolhidas (exportação para a Kiwify)';

create index inscricoes_created_at_idx on public.inscricoes (created_at);

alter table public.inscricoes enable row level security;
revoke all on table public.inscricoes from public, anon, authenticated;


-- Valida, normaliza e grava uma inscrição.
-- Retorno:
--   {"ok": true,  "status": "created"}    nova inscrição gravada
--   {"ok": true,  "status": "duplicate"}  e-mail já inscrito (mantém a original)
--   {"ok": false, "errors": {"campo": "mensagem"}}
create or replace function public.solicitar_vaga(
  p_nome     text,
  p_whatsapp text,
  p_email    text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome   text;
  v_digits text;
  v_email  text;
  v_id     uuid;
  v_errors jsonb := '{}'::jsonb;
begin
  -- Nome: sem espaços sobrando, pelo menos nome e sobrenome, sem números.
  v_nome := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  if v_nome = '' then
    v_errors := v_errors || jsonb_build_object('nome', 'Informe seu nome completo.');
  elsif char_length(v_nome) > 120 then
    v_errors := v_errors || jsonb_build_object('nome', 'Use no máximo 120 caracteres.');
  elsif v_nome !~ '^\S+( \S+)+$' or char_length(v_nome) < 3 then
    v_errors := v_errors || jsonb_build_object('nome', 'Informe nome e sobrenome.');
  elsif v_nome ~ '[0-9@<>{}\[\]\\/|_=+*#$%^&~`"]' then
    v_errors := v_errors || jsonb_build_object('nome', 'Use apenas letras no nome.');
  end if;

  -- WhatsApp: aceita máscara, espaços, +55 e zero antes do DDD.
  v_digits := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_digits := ltrim(v_digits, '0');
  if char_length(v_digits) in (12, 13) and left(v_digits, 2) = '55' then
    v_digits := substr(v_digits, 3);
  end if;
  if v_digits = '' then
    v_errors := v_errors || jsonb_build_object('whatsapp', 'Informe seu WhatsApp com DDD.');
  elsif v_digits !~ '^[1-9]{2}(9[0-9]{8}|[2-9][0-9]{7})$' then
    v_errors := v_errors || jsonb_build_object('whatsapp', 'Confira o número: DDD + número, ex. (11) 91234-5678.');
  end if;

  -- E-mail: normalizado (sem espaços, minúsculo).
  v_email := lower(regexp_replace(coalesce(p_email, ''), '\s', '', 'g'));
  if v_email = '' then
    v_errors := v_errors || jsonb_build_object('email', 'Informe seu e-mail.');
  elsif char_length(v_email) > 254
     or v_email !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then
    v_errors := v_errors || jsonb_build_object('email', 'Confira o e-mail: ex. nome@gmail.com.');
  end if;

  if v_errors <> '{}'::jsonb then
    return jsonb_build_object('ok', false, 'errors', v_errors);
  end if;

  insert into public.inscricoes (nome, whatsapp, email)
  values (v_nome, '+55' || v_digits, v_email)
  on conflict (email) do nothing
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'status', case when v_id is null then 'duplicate' else 'created' end
  );
end;
$$;

comment on function public.solicitar_vaga(text, text, text) is
  'Endpoint público do formulário: valida, normaliza e grava a inscrição.';

revoke all on function public.solicitar_vaga(text, text, text) from public, anon, authenticated;
grant execute on function public.solicitar_vaga(text, text, text) to anon, authenticated;
