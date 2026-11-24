import { ErroDeEnvio, solicitarVaga } from './api';
import {
  type Campo,
  type Erros,
  mascararWhatsapp,
  normalizarEmail,
  normalizarNome,
  sugerirEmail,
  validar,
  validarEmail,
  validarNome,
  validarWhatsapp,
} from './validation';

const form = document.querySelector<HTMLFormElement>('#inscricao')!;
const botao = form.querySelector<HTMLButtonElement>('.botao')!;
const botaoTexto = botao.querySelector<HTMLSpanElement>('.botao__texto')!;
const avisoErro = document.querySelector<HTMLParagraphElement>('#aviso-erro')!;
const confirmacao = document.querySelector<HTMLDivElement>('#confirmacao')!;
const confirmacaoEmail = document.querySelector<HTMLParagraphElement>('#confirmacao-email')!;
const sugestao = document.querySelector<HTMLParagraphElement>('#email-sugestao')!;
const sugestaoBotao = sugestao.querySelector<HTMLButtonElement>('button')!;

const CAMPOS: Campo[] = ['nome', 'whatsapp', 'email'];
const inputs = Object.fromEntries(
  CAMPOS.map((c) => [c, form.querySelector<HTMLInputElement>(`#${c}`)!]),
) as Record<Campo, HTMLInputElement>;

const validadores: Record<Campo, (v: string) => string | undefined> = {
  nome: validarNome,
  whatsapp: validarWhatsapp,
  email: validarEmail,
};

const TEXTO_BOTAO = botaoTexto.textContent ?? '';
const tocado = new Set<Campo>();
let enviando = false;

function mostrarErro(campo: Campo, mensagem?: string) {
  const input = inputs[campo];
  const alvo = document.getElementById(`${campo}-erro`)!;
  alvo.textContent = mensagem ?? '';
  if (mensagem) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function mostrarErros(erros: Erros) {
  for (const c of CAMPOS) mostrarErro(c, erros[c]);
  const primeiro = CAMPOS.find((c) => erros[c]);
  if (primeiro) inputs[primeiro].focus();
}

function dados(): Record<Campo, string> {
  return {
    nome: inputs.nome.value,
    whatsapp: inputs.whatsapp.value,
    email: inputs.email.value,
  };
}

function atualizarSugestao() {
  const s = sugerirEmail(inputs.email.value);
  sugestao.hidden = !s;
  if (s) sugestaoBotao.textContent = s;
}

// Máscara do WhatsApp: formata enquanto digita e aceita números colados com +55.
inputs.whatsapp.addEventListener('input', () => {
  const bruto = inputs.whatsapp.value;
  // Deixa a pessoa terminar de digitar o "+55" antes de aplicar a máscara.
  if (/^\s*\+\d{0,2}$/.test(bruto)) return;
  inputs.whatsapp.value = mascararWhatsapp(bruto);
});

for (const campo of CAMPOS) {
  const input = inputs[campo];
  input.addEventListener('blur', () => {
    if (campo === 'nome') input.value = normalizarNome(input.value);
    if (campo === 'email') {
      input.value = normalizarEmail(input.value);
      atualizarSugestao();
    }
    if (input.value.trim() === '' && !tocado.has(campo)) return;
    tocado.add(campo);
    mostrarErro(campo, validadores[campo](input.value));
  });
  input.addEventListener('input', () => {
    avisoErro.hidden = true;
    // Depois do primeiro erro, revalida a cada tecla para o aviso sumir assim que corrigido.
    if (input.getAttribute('aria-invalid') === 'true') {
      mostrarErro(campo, validadores[campo](input.value));
    }
  });
}

sugestaoBotao.addEventListener('click', () => {
  inputs.email.value = sugestaoBotao.textContent ?? inputs.email.value;
  sugestao.hidden = true;
  mostrarErro('email', validarEmail(inputs.email.value));
  inputs.email.focus();
});

function definirEnviando(ativo: boolean) {
  enviando = ativo;
  botao.setAttribute('aria-busy', String(ativo));
  botao.disabled = ativo;
  botaoTexto.textContent = ativo ? 'Enviando…' : TEXTO_BOTAO;
  for (const c of CAMPOS) inputs[c].readOnly = ativo;
}

function mostrarConfirmacao(email: string, status: 'created' | 'duplicate') {
  form.hidden = true;
  confirmacao.hidden = false;
  confirmacaoEmail.replaceChildren();
  if (status === 'duplicate') {
    confirmacaoEmail.append('Este e-mail já estava inscrito: ', strong(email), '. Mantivemos sua inscrição.');
  } else {
    confirmacaoEmail.append('E-mail informado: ', strong(email));
  }
  confirmacao.focus();
  confirmacao.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function strong(texto: string) {
  const el = document.createElement('strong');
  el.textContent = texto;
  return el;
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (enviando) return;
  avisoErro.hidden = true;

  inputs.nome.value = normalizarNome(inputs.nome.value);
  inputs.email.value = normalizarEmail(inputs.email.value);
  inputs.whatsapp.value = mascararWhatsapp(inputs.whatsapp.value);
  CAMPOS.forEach((c) => tocado.add(c));

  const erros = validar(dados());
  if (Object.keys(erros).length > 0) {
    mostrarErros(erros);
    return;
  }
  mostrarErros({});

  definirEnviando(true);
  try {
    const resultado = await solicitarVaga(dados());
    if (resultado.ok) {
      // Só confirma depois que o servidor respondeu que o registro está salvo.
      mostrarConfirmacao(inputs.email.value, resultado.status);
      return;
    }
    mostrarErros(resultado.errors ?? {});
  } catch (e) {
    console.error('[inscricao]', e instanceof ErroDeEnvio ? e.message : e);
    avisoErro.textContent =
      'Não conseguimos registrar sua inscrição agora. Verifique sua conexão e tente novamente.';
    avisoErro.hidden = false;
  } finally {
    definirEnviando(false);
  }
});
