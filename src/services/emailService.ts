import nodemailer, { type Transporter } from 'nodemailer';

import { env, temSmtpConfigurado } from '../config/env';

export interface EnvioResultado {
  /** Link do Ethereal para abrir a mensagem no navegador (so em dev). */
  previewUrl?: string;
  /** true quando a mensagem apenas foi registrada no console, sem sair. */
  apenasLog: boolean;
}

/**
 * Envio de e-mails transacionais.
 *
 * Tres modos, escolhidos automaticamente:
 *   1. SMTP_HOST definido  -> usa o servidor real informado no .env;
 *   2. desenvolvimento     -> cria uma conta descartavel no Ethereal Email e
 *                             devolve um link para ver a mensagem no navegador;
 *   3. Ethereal indisponivel (sem rede, por exemplo) -> cai no transporte
 *      `jsonTransport`, que nao envia nada e deixa o link no console. Sem esse
 *      degrade, um ambiente offline quebraria o fluxo de recuperacao inteiro.
 *
 * Em producao, subir sem SMTP configurado e erro: falha alto em vez de fingir
 * que o e-mail saiu.
 */
class EmailService {
  /** O transporte e criado uma vez e reaproveitado entre as requisicoes. */
  private transportePromise: Promise<Transporter> | null = null;
  private usandoJsonTransport = false;

  private async obterTransporte(): Promise<Transporter> {
    this.transportePromise ??= this.criarTransporte();
    return this.transportePromise;
  }

  private async criarTransporte(): Promise<Transporter> {
    if (temSmtpConfigurado) {
      return nodemailer.createTransport({
        host: env.email.host,
        port: env.email.porta,
        secure: env.email.seguro,
        auth: env.email.usuario ? { user: env.email.usuario, pass: env.email.senha } : undefined,
      });
    }

    if (env.isProducao) {
      throw new Error('SMTP_HOST nao configurado: a API nao consegue enviar e-mails em producao.');
    }

    try {
      // Conta de testes criada na hora - nada precisa ser cadastrado antes.
      const conta = await nodemailer.createTestAccount();
      console.log(`[email] usando Ethereal Email (usuario de teste: ${conta.user})`);

      return nodemailer.createTransport({
        host: conta.smtp.host,
        port: conta.smtp.port,
        secure: conta.smtp.secure,
        auth: { user: conta.user, pass: conta.pass },
      });
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      console.warn(`[email] Ethereal indisponivel (${motivo}). As mensagens irao apenas para o console.`);

      this.usandoJsonTransport = true;
      return nodemailer.createTransport({ jsonTransport: true });
    }
  }

  /** Monta e dispara o e-mail de redefinicao de senha. */
  async enviarRecuperacaoSenha(destino: string, nome: string, resetToken: string): Promise<EnvioResultado> {
    const link = `${env.appUrl}/redefinir-senha?token=${encodeURIComponent(resetToken)}`;
    const validade = `${env.resetTokenTtlMinutes} minutos`;
    const transporte = await this.obterTransporte();

    const info = await transporte.sendMail({
      from: env.email.remetente,
      to: destino,
      subject: 'Redefinicao de senha - Hygia Software',
      text: montarTexto(nome, link, validade),
      html: montarHtml(nome, link, validade),
    });

    if (this.usandoJsonTransport) {
      console.log(`[email] (nao enviado) link de redefinicao para ${destino}: ${link}`);
      return { apenasLog: true };
    }

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`[email] previa da mensagem: ${previewUrl}`);

    return { apenasLog: false, ...(previewUrl ? { previewUrl } : {}) };
  }
}

function montarTexto(nome: string, link: string, validade: string): string {
  return [
    `Ola, ${nome}.`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no Hygia Software.',
    `Abra o endereco abaixo para escolher uma nova senha (o link vale por ${validade}):`,
    '',
    link,
    '',
    'Se nao foi voce quem pediu, ignore esta mensagem: sua senha atual continua valendo.',
  ].join('\n');
}

function montarHtml(nome: string, link: string, validade: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2430; line-height: 1.6;">
      <h2 style="color: #8a6a1f; margin-bottom: 8px;">Redefinicao de senha</h2>
      <p>Ola, <strong>${escaparHtml(nome)}</strong>.</p>
      <p>Recebemos um pedido para redefinir a senha da sua conta no Hygia Software.</p>
      <p style="margin: 24px 0;">
        <a href="${link}"
           style="background: #c9a227; color: #2b1f05; font-weight: bold; text-decoration: none;
                  padding: 12px 26px; border-radius: 8px; display: inline-block;">
          Escolher nova senha
        </a>
      </p>
      <p style="font-size: 14px; color: #5b6172;">Este link vale por ${validade}.</p>
      <p style="font-size: 14px; color: #5b6172;">
        Se nao foi voce quem pediu, ignore esta mensagem: sua senha atual continua valendo.
      </p>
    </div>
  `;
}

/** O nome vem do cadastro: escapamos antes de interpolar no HTML. */
function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const emailService = new EmailService();
export type { EmailService };
