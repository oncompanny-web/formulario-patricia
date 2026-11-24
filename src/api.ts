import type { Erros } from './validation';

export type Resultado =
  | { ok: true; status: 'created' | 'duplicate' }
  | { ok: false; errors: Erros };

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export class ErroDeEnvio extends Error {}

/** Grava a inscrição via função public.solicitar_vaga (validação no servidor). */
export async function solicitarVaga(dados: {
  nome: string;
  whatsapp: string;
  email: string;
}): Promise<Resultado> {
  if (!URL_BASE || !CHAVE) {
    throw new ErroDeEnvio('Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).');
  }

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 15000);
  try {
    const resp = await fetch(`${URL_BASE.replace(/\/$/, '')}/rest/v1/rpc/solicitar_vaga`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CHAVE },
      body: JSON.stringify({
        p_nome: dados.nome,
        p_whatsapp: dados.whatsapp,
        p_email: dados.email,
      }),
      signal: controle.signal,
    });
    if (!resp.ok) throw new ErroDeEnvio(`HTTP ${resp.status}`);
    const json = (await resp.json()) as Resultado;
    if (typeof json !== 'object' || json === null || typeof json.ok !== 'boolean') {
      throw new ErroDeEnvio('Resposta inesperada do servidor');
    }
    return json;
  } catch (e) {
    if (e instanceof ErroDeEnvio) throw e;
    throw new ErroDeEnvio(e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }
}
