import { HttpError } from './httpError';
import { isNivelAcesso, type CreateUserInput, type NivelAcesso } from '../types/user';

/*
 * Validacao de e-mail.
 *
 * A regex cobre a forma `local@dominio.tld` seguindo o que o RFC 5322 permite
 * na pratica. Ela barra casos que a versao anterior (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)
 * deixava passar:
 *   - ponto no inicio, no fim ou duplicado na parte local (.ana@x.com, a..b@x.com)
 *   - hifen no inicio ou no fim de um rotulo do dominio   (ana@-x.com, ana@x-.com)
 *   - dominio sem TLD                                     (ana@localhost)
 *   - TLD numerico ou de uma letra so                     (ana@x.123, ana@x.c)
 *
 * Os limites de tamanho vem do RFC 5321 e ficam fora da regex, porque contagem
 * de caracteres nao se expressa bem nesse formato.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;

/** Limites do RFC 5321: 254 no endereco inteiro, 64 na parte antes do @. */
const EMAIL_MAX = 254;
const EMAIL_LOCAL_MAX = 64;

export const SENHA_MIN = 8;
export const SENHA_MAX = 72; // limite do bcrypt: bytes alem de 72 sao ignorados

/** Aplica regex e limites de tamanho. Recebe o e-mail ja aparado. */
export function emailValido(email: string): boolean {
  if (email.length > EMAIL_MAX) return false;

  const arroba = email.lastIndexOf('@');
  if (arroba < 0 || arroba > EMAIL_LOCAL_MAX) return false;

  return EMAIL_REGEX.test(email);
}

/** Erros de validacao acumulados por campo. */
type Erros = Record<string, string>;

function corpoObjeto(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('Corpo da requisicao deve ser um objeto JSON.');
  }
  return body as Record<string, unknown>;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function lancarSeHouverErros(erros: Erros): void {
  if (Object.keys(erros).length > 0) {
    throw HttpError.badRequest('Dados invalidos.', erros);
  }
}

/** Normaliza e-mail para comparacao/persistencia (case-insensitive). */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validarEmail(valor: unknown, erros: Erros): string {
  const email = texto(valor);
  if (!email) erros.email = 'E-mail e obrigatorio.';
  else if (!emailValido(email)) erros.email = 'Informe um e-mail valido (ex.: nome@empresa.com.br).';
  return normalizarEmail(email);
}

function validarSenha(valor: unknown, erros: Erros, campo = 'senha'): string {
  const senha = typeof valor === 'string' ? valor : '';
  if (!senha) erros[campo] = 'Senha e obrigatoria.';
  else if (senha.length < SENHA_MIN) erros[campo] = `Senha deve ter no minimo ${SENHA_MIN} caracteres.`;
  else if (senha.length > SENHA_MAX) erros[campo] = `Senha deve ter no maximo ${SENHA_MAX} caracteres.`;
  return senha;
}

export function validarCadastro(body: unknown): CreateUserInput {
  const dados = corpoObjeto(body);
  const erros: Erros = {};

  const nome = texto(dados.nome);
  if (!nome) erros.nome = 'Nome e obrigatorio.';
  else if (nome.length < 2) erros.nome = 'Nome deve ter no minimo 2 caracteres.';
  else if (nome.length > 120) erros.nome = 'Nome deve ter no maximo 120 caracteres.';

  const email = validarEmail(dados.email, erros);
  const senha = validarSenha(dados.senha, erros);

  let nivelAcesso: NivelAcesso | undefined;
  if (dados.nivelAcesso !== undefined) {
    if (!isNivelAcesso(dados.nivelAcesso)) {
      erros.nivelAcesso = 'Nivel de acesso deve ser "admin" ou "vendedor".';
    } else {
      nivelAcesso = dados.nivelAcesso;
    }
  }

  lancarSeHouverErros(erros);
  return nivelAcesso ? { nome, email, senha, nivelAcesso } : { nome, email, senha };
}

export interface LoginInput {
  email: string;
  senha: string;
}

export function validarLogin(body: unknown): LoginInput {
  const dados = corpoObjeto(body);
  const erros: Erros = {};

  // O formato do e-mail e cobrado tambem no login: barra lixo antes de tocar
  // no banco e no bcrypt.
  const email = validarEmail(dados.email, erros);

  // Ja a regra de forca da senha nao se aplica aqui: uma senha antiga e curta
  // ainda precisa conseguir entrar.
  const senha = typeof dados.senha === 'string' ? dados.senha : '';
  if (!senha) erros.senha = 'Senha e obrigatoria.';

  lancarSeHouverErros(erros);
  return { email, senha };
}

export function validarForgotPassword(body: unknown): { email: string } {
  const dados = corpoObjeto(body);
  const erros: Erros = {};
  const email = validarEmail(dados.email, erros);
  lancarSeHouverErros(erros);
  return { email };
}

export interface ResetPasswordInput {
  token: string;
  novaSenha: string;
}

export function validarResetPassword(body: unknown): ResetPasswordInput {
  const dados = corpoObjeto(body);
  const erros: Erros = {};

  const token = texto(dados.token);
  if (!token) erros.token = 'Token de recuperacao e obrigatorio.';

  const novaSenha = validarSenha(dados.novaSenha, erros, 'novaSenha');

  lancarSeHouverErros(erros);
  return { token, novaSenha };
}
