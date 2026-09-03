import type { Request, Response } from 'express';

import { authService, type AuthService } from '../services/authService';
import { HttpError } from '../utils/httpError';
import {
  validarCadastro,
  validarForgotPassword,
  validarLogin,
  validarResetPassword,
} from '../utils/validators';

/**
 * Camada fina: valida a entrada, chama o service e escreve a resposta.
 * Nenhuma regra de negocio mora aqui.
 *
 * Erros lancados (inclusive de promises rejeitadas) sobem para o errorHandler -
 * o Express 5 encaminha rejeicoes de handlers async automaticamente.
 */
export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const dados = validarCadastro(req.body);
    const resultado = await this.service.register(dados);

    res.status(201).json({
      mensagem: 'Conta criada com sucesso.',
      ...resultado,
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const credenciais = validarLogin(req.body);
    const resultado = await this.service.login(credenciais);

    res.status(200).json({
      mensagem: 'Login realizado com sucesso.',
      ...resultado,
    });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = validarForgotPassword(req.body);
    const resultado = await this.service.forgotPassword(email);

    // Resposta identica exista ou nao a conta: nao revelamos quem esta cadastrado.
    res.status(200).json({
      mensagem: 'Se existir uma conta com este e-mail, enviaremos as instrucoes de recuperacao.',
      ...resultado,
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const dados = validarResetPassword(req.body);
    await this.service.resetPassword(dados);

    res.status(200).json({ mensagem: 'Senha redefinida com sucesso. Faca login novamente.' });
  };

  /** GET /auth/me - confere se o token ainda vale e devolve o usuario logado. */
  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.usuario) throw HttpError.unauthorized();

    const usuario = await this.service.buscarPorId(req.usuario.sub);
    if (!usuario) throw HttpError.unauthorized('Sessao invalida.');

    res.status(200).json({ usuario });
  };
}

export const authController = new AuthController();
