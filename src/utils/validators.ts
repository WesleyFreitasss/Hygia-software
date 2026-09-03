import { HttpError } from './httpError';
import { isNivelAcesso, type CreateUserInput, type NivelAcesso } from '../types/user';

/** Regex pragmatica de e-mail: barra o obviamente invalido sem rejeitar casos legitimos. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SENHA_MIN = 8;
export const SENHA_MAX = 72; // limite do bcrypt: bytes alem de 72 sao ignorados

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
  else if (!EMAIL_REGEX.test(email)) erros.email = 'E-mail invalido.';
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

  const email = validarEmail(dados.email, erros);
  // No login nao aplicamos regra de forca: senha antiga curta ainda deve conseguir entrar.
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
