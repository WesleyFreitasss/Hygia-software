/**
 * Erro de dominio com status HTTP associado.
 * Services lancam HttpError; o errorHandler traduz para a resposta JSON.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, detalhes?: unknown): HttpError {
    return new HttpError(400, message, detalhes);
  }

  static unauthorized(message = 'Credenciais invalidas.'): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Acesso negado.'): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = 'Recurso nao encontrado.'): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, message);
  }
}
