import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';

/** Base da API. Em outro ambiente basta definir VITE_API_URL no .env. */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Chaves do localStorage - exportadas para o resto do CRM reaproveitar. */
export const TOKEN_STORAGE_KEY = 'hygia:token';
export const USUARIO_STORAGE_KEY = 'hygia:usuario';

const ESTADO_INICIAL = { email: '', senha: '', lembrarMe: false };

/** Brasao servido estaticamente pelo Vite a partir de public/. */
const LOGO_PADRAO = '/logo-hygia.png';

/*
 * Classes reaproveitadas dentro desta tela.
 *
 * Quando o mesmo conjunto de utilitarias aparece em mais de um elemento, vale
 * dar um nome a ele em vez de repetir a lista inteira. Assim que estes padroes
 * aparecerem em OUTRAS telas do CRM, eles saem daqui e viram componentes
 * (Botao, CampoTexto, Alerta) - ver o card de limpeza no Trello.
 */
const CLASSES_CAMPO =
  'w-full h-12 rounded-lg border border-gold-muted/30 bg-ink-deep pl-11 pr-4 text-[15px] ' +
  'text-cream placeholder:text-cream-soft/50 transition-colors duration-200 ' +
  'hover:border-gold-muted/50 ' +
  'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/15 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-invalid:border-danger/70';

const CLASSES_ROTULO = 'mb-1.5 block text-[13px] font-medium text-cream-soft';

const CLASSES_LINK =
  'rounded text-[13px] text-gold-muted underline decoration-gold-muted/40 underline-offset-2 ' +
  'transition-colors duration-200 hover:text-gold-light hover:decoration-gold-light ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light';

const CLASSES_ICONE =
  'pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gold-muted/70';

/**
 * Tela de login do Hygia Software.
 *
 * @param {object}   props
 * @param {string}  [props.logoSrc]        Caminho da logo. Padrao: /logo-hygia.png (pasta public/).
 * @param {Function} [props.onSucesso]     Recebe ({ usuario, token }) apos autenticar - use para navegar.
 * @param {Function} [props.onIrParaCadastro]        Navegacao para a solicitacao de acesso (a construir).
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
    const { name, value, type, checked } = evento.target;
    setForm((anterior) => ({ ...anterior, [name]: type === 'checkbox' ? checked : value }));
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
        body: JSON.stringify({
          email: form.email.trim(),
          senha: form.senha,
          // A API usa este campo para emitir um token de 30 dias em vez de 2 horas.
          lembrarMe: form.lembrarMe,
        }),
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
    <div className="flex min-h-full items-center justify-center bg-ink bg-[radial-gradient(ellipse_58%_42%_at_50%_22%,#1f1f22_0%,transparent_70%)] px-5 py-10 font-sans">
      <main className="flex w-full max-w-[420px] flex-col items-center">
        <img
          src={logoSrc}
          alt="Hygia"
          width="512"
          height="512"
          className="mb-7 w-[clamp(150px,42vw,200px)] drop-shadow-[0_0_28px_rgba(212,175,55,0.18)]"
        />

        {/*
          O cartao do formulario.
          `bg-neutral-900/60` deixa o fundo translucido e `backdrop-blur-md`
          desfoca o que esta atras - e a combinacao dos dois que da o efeito de
          vidro. A borda dourada a 20% de opacidade apenas insinua o contorno,
          em vez de desenhar uma moldura.
        */}
        <section className="w-full rounded-2xl border border-gold-muted/20 bg-neutral-900/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-md">
          <h1 className="mb-6 text-center text-sm font-semibold tracking-wider text-gold-muted uppercase">
            Acessar o sistema
          </h1>

          <form onSubmit={aoEnviar} noValidate>
            <div className="mb-4">
              <label className={CLASSES_ROTULO} htmlFor="login-email">
                E-mail
              </label>
              {/* `relative` ancora o icone, que e posicionado em absoluto. */}
              <div className="relative">
                <Mail className={CLASSES_ICONE} aria-hidden="true" />
                <input
                  id="login-email"
                  className={CLASSES_CAMPO}
                  name="email"
                  type="email"
                  placeholder="corretor@empresa.com.br"
                  autoComplete="email"
                  value={form.email}
                  onChange={aoDigitar}
                  disabled={enviando}
                  aria-invalid={temErroDeCampo('email')}
                  required
                />
              </div>
            </div>

            <div className="mb-2">
              <label className={CLASSES_ROTULO} htmlFor="login-senha">
                Senha
              </label>
              <div className="relative">
                <Lock className={CLASSES_ICONE} aria-hidden="true" />
                <input
                  id="login-senha"
                  className={CLASSES_CAMPO}
                  name="senha"
                  type="password"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  value={form.senha}
                  onChange={aoDigitar}
                  disabled={enviando}
                  aria-invalid={temErroDeCampo('senha')}
                  required
                />
              </div>
            </div>

            <div className="mb-4 flex justify-end">
              <button type="button" className={CLASSES_LINK} onClick={onIrParaRecuperarSenha}>
                Esqueceu a senha?
              </button>
            </div>

            <label className="mb-6 flex cursor-pointer items-center gap-2.5 text-[13px] text-cream-soft select-none">
              {/* `accent-gold` pinta o preenchimento nativo do checkbox com a cor da marca. */}
              <input
                type="checkbox"
                name="lembrarMe"
                checked={form.lembrarMe}
                onChange={aoDigitar}
                disabled={enviando}
                className="size-4 cursor-pointer rounded accent-gold"
              />
              Manter-me conectado
            </label>

            {/*
              O botao metalico.
              Cor chapada nao passa a ideia de metal: e o gradiente que faz o
              efeito, indo do ouro cheio ao brilho e caindo para o ouro escuro.
              O `inset` na sombra desenha a linha de luz na aresta superior,
              como acontece numa superficie polida.
            */}
            <button
              type="submit"
              disabled={enviando}
              className="h-12 w-full rounded-lg border border-gold-light/60 bg-linear-to-r from-gold via-gold-light to-gold-dark text-[15px] font-bold tracking-wider text-neutral-950 uppercase shadow-[0_4px_16px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(255,255,255,0.45)] transition duration-200 hover:brightness-110 hover:shadow-[0_6px_22px_rgba(212,175,55,0.3),inset_0_1px_0_rgba(255,255,255,0.55)] active:translate-y-px disabled:cursor-progress disabled:brightness-90 disabled:grayscale-[0.35]"
            >
              {enviando ? 'Acessando...' : 'Acessar'}
            </button>
          </form>

          {erro && (
            <div
              className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-danger"
              role="alert"
            >
              {erro.mensagem}
              {erro.detalhes && (
                <ul className="mt-1.5 list-none space-y-0.5">
                  {Object.entries(erro.detalhes).map(([campo, motivo]) => (
                    <li key={campo}>{motivo}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {sucesso && (
            <p
              className="mt-4 rounded-lg border border-gold-muted/35 bg-gold/10 px-3.5 py-2.5 text-[13px] text-gold-light"
              role="status"
            >
              {sucesso}
            </p>
          )}

          <p className="mt-6 text-center text-[13px] text-cream-soft">
            Ainda não tem conta?{' '}
            <button type="button" className={CLASSES_LINK} onClick={onIrParaCadastro}>
              Solicite acesso
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
