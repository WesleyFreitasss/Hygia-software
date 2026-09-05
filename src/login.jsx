import { useState } from 'react';

import './login.css';

/** Base da API. Em outro ambiente basta definir VITE_API_URL no .env. */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Chaves do localStorage - exportadas para o resto do CRM reaproveitar. */
export const TOKEN_STORAGE_KEY = 'hygia:token';
export const USUARIO_STORAGE_KEY = 'hygia:usuario';

const ESTADO_INICIAL = { email: '', senha: '' };

/** Brasao servido estaticamente pelo Vite a partir de public/. */
const LOGO_PADRAO = '/logo-hygia.png';

/**
 * Tela de login do Hygia Software.
 *
 * @param {object}   props
 * @param {string}  [props.logoSrc]        Caminho da logo. Padrao: /logo-hygia.png (pasta public/).
 * @param {Function} [props.onSucesso]     Recebe ({ usuario, token }) apos autenticar - use para navegar.
 * @param {Function} [props.onIrParaCadastro]        Navegacao para a tela de cadastro (a construir).
 * @param {Function} [props.onIrParaRecuperarSenha]  Navegacao para a recuperacao de senha (a construir).
 */
export default function Login({
  logoSrc = LOGO_PADRAO,
  onSucesso,
  onIrParaCadastro,
  onIrParaRecuperarSenha,
}) {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const aoDigitar = (evento) => {
    const { name, value } = evento.target;
    setForm((anterior) => ({ ...anterior, [name]: value }));
    // Some com o erro assim que o usuario corrige algo.
    if (erro) setErro(null);
  };

  const aoEnviar = async (evento) => {
    evento.preventDefault();
    if (enviando) return;

    setErro(null);
    setSucesso(null);
    setEnviando(true);

    try {
      const resposta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), senha: form.senha }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro({
          mensagem: dados?.erro ?? 'Não foi possível entrar. Tente novamente.',
          // O backend devolve `detalhes` com o motivo por campo nos erros 400.
          detalhes: dados?.detalhes ?? null,
        });
        return;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, dados.token);
      localStorage.setItem(USUARIO_STORAGE_KEY, JSON.stringify(dados.usuario));

      setSucesso(`Bem-vindo(a), ${dados.usuario?.nome ?? ''}!`.trim());
      setForm(ESTADO_INICIAL);
      onSucesso?.(dados);
    } catch {
      // Cai aqui quando a API esta fora do ar ou o CORS bloqueou a chamada.
      setErro({
        mensagem: 'Não foi possível falar com o servidor. Verifique se a API está rodando.',
        detalhes: null,
      });
    } finally {
      setEnviando(false);
    }
  };

  const temErroDeCampo = (campo) => Boolean(erro?.detalhes?.[campo]);

  return (
    <div className="login-tela">
      <main className="login-cartao">
        <h1 className="login-titulo">LOGIN</h1>

        <div className="login-logo">
          <img className="login-logo-img" src={logoSrc} alt="Hygia" width="1229" height="864" />
        </div>

        <form className="login-form" onSubmit={aoEnviar} noValidate>
          <label className="login-rotulo-oculto" htmlFor="login-email">
            E-mail
          </label>
          <input
            id="login-email"
            className="login-campo"
            name="email"
            type="email"
            placeholder="E-mail"
            autoComplete="email"
            value={form.email}
            onChange={aoDigitar}
            disabled={enviando}
            aria-invalid={temErroDeCampo('email')}
            required
          />

          <label className="login-rotulo-oculto" htmlFor="login-senha">
            Senha
          </label>
          <input
            id="login-senha"
            className="login-campo"
            name="senha"
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            value={form.senha}
            onChange={aoDigitar}
            disabled={enviando}
            aria-invalid={temErroDeCampo('senha')}
            required
          />

          <button type="button" className="login-esqueci" onClick={onIrParaRecuperarSenha}>
            Esqueci minha senha
          </button>

          <button type="submit" className="login-botao" disabled={enviando}>
            {enviando ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        {erro && (
          <div className="login-mensagem login-mensagem--erro" role="alert">
            {erro.mensagem}
            {erro.detalhes && (
              <ul className="login-mensagem-detalhes">
                {Object.entries(erro.detalhes).map(([campo, motivo]) => (
                  <li key={campo}>{motivo}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {sucesso && (
          <p className="login-mensagem login-mensagem--sucesso" role="status">
            {sucesso}
          </p>
        )}

        <p className="login-rodape">
          Ainda não tem conta?
          <button type="button" className="login-rodape-link" onClick={onIrParaCadastro}>
            Crie sua conta agora!
          </button>
        </p>
      </main>
    </div>
  );
}
