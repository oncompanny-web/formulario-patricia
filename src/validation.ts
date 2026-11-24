// Regras de validação do formulário. As mesmas regras são reaplicadas no
// servidor pela função public.solicitar_vaga (supabase/migrations).

export type Campo = 'nome' | 'whatsapp' | 'email';
export type Erros = Partial<Record<Campo, string>>;

const EMAIL_RE = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const NOME_INVALIDO_RE = /[0-9@<>{}[\]\\/|_=+*#$%^&~`"]/;
const WHATSAPP_RE = /^[1-9]{2}(9[0-9]{8}|[2-9][0-9]{7})$/;

export function normalizarNome(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarEmail(valor: string): string {
  return valor.replace(/\s/g, '').toLowerCase();
}

/**
 * Extrai DDD + número (10 ou 11 dígitos) de qualquer formato digitado ou
 * colado: "(11) 91234-5678", "+55 11 91234-5678", "5511912345678", "011...".
 */
export function digitosWhatsapp(valor: string): string {
  let d = valor.replace(/\D/g, '').replace(/^0+/, '');
  const temPais = valor.trim().startsWith('+') || d.length > 11;
  if (temPais && d.startsWith('55') && d.length > 2) d = d.slice(2);
  return d.slice(0, 11);
}

/** Máscara de exibição: (11) 91234-5678 ou (11) 1234-5678. */
export function mascararWhatsapp(valor: string): string {
  const d = digitosWhatsapp(valor);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function validarNome(valor: string): string | undefined {
  const nome = normalizarNome(valor);
  if (!nome) return 'Informe seu nome completo.';
  if (nome.length > 120) return 'Use no máximo 120 caracteres.';
  if (nome.length < 3 || !nome.includes(' ')) return 'Informe nome e sobrenome.';
  if (NOME_INVALIDO_RE.test(nome)) return 'Use apenas letras no nome.';
  return undefined;
}

export function validarWhatsapp(valor: string): string | undefined {
  const d = digitosWhatsapp(valor);
  if (!d) return 'Informe seu WhatsApp com DDD.';
  if (!WHATSAPP_RE.test(d)) return 'Confira o número: DDD + número, ex. (11) 91234-5678.';
  return undefined;
}

export function validarEmail(valor: string): string | undefined {
  const email = normalizarEmail(valor);
  if (!email) return 'Informe seu e-mail.';
  if (email.length > 254 || !EMAIL_RE.test(email)) return 'Confira o e-mail: ex. nome@gmail.com.';
  return undefined;
}

export function validar(dados: Record<Campo, string>): Erros {
  const erros: Erros = {};
  const n = validarNome(dados.nome);
  const w = validarWhatsapp(dados.whatsapp);
  const e = validarEmail(dados.email);
  if (n) erros.nome = n;
  if (w) erros.whatsapp = w;
  if (e) erros.email = e;
  return erros;
}

// Erros de digitação comuns em provedores — sugestão, nunca bloqueio.
const DOMINIOS: Record<string, string> = {
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmail.com.br': 'gmail.com', 'gmai.com': 'gmail.com', 'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'hotmail.con': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlook.con': 'outlook.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.com.b': 'yahoo.com.br',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com',
};

export function sugerirEmail(valor: string): string | undefined {
  const email = normalizarEmail(valor);
  const at = email.lastIndexOf('@');
  if (at < 1) return undefined;
  const correto = DOMINIOS[email.slice(at + 1)];
  return correto ? `${email.slice(0, at)}@${correto}` : undefined;
}
