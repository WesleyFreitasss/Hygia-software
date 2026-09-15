# ADR 0004 — "Manter-me conectado": sessão de 30 dias

- **Data:** 09/09/2026
- **Situação:** Aceita
- **Etapa do projeto:** preparação do CRM Beta
- **Depende de:** revogação por `tokenVersion` (ver README, seção *Decisões de segurança*)

## Contexto

A tela de login recebeu o checkbox **"Manter-me conectado"**, previsto na
referência visual aprovada pelo Product Manager.

O token de sessão valia 2 horas fixas. Para o CRM isso é curto demais no uso
real: a corretora abre o sistema pela manhã, atende clientes durante o dia e
volta à tela várias vezes. Ser deslogada a cada duas horas transforma a
ferramenta em um incômodo — e a reação previsível do usuário a esse incômodo é
anotar a senha em um papel ao lado do computador, o que piora a segurança em vez
de melhorar.

A decisão precisava responder: o checkbox é apenas visual, ou muda a sessão de
verdade?

## Decisão

O checkbox **muda a sessão de verdade**. Marcado, o token passa a valer **30
dias**; desmarcado, segue valendo 2 horas.

O campo trafega como `lembrarMe` (booleano) no corpo do `POST /auth/login`. A
validade é decidida **no servidor** e assinada dentro do próprio token — o
cliente não consegue esticar a própria sessão mexendo na requisição.

```
POST /auth/login
{ "email": "...", "senha": "...", "lembrarMe": true }
```

Ambas as durações são configuráveis: `JWT_EXPIRES_IN` (2h) e
`JWT_EXPIRES_IN_LEMBRAR_ME` (30d).

### Por que 30 dias é aceitável aqui

Uma sessão longa normalmente é um risco difícil de aceitar: um token roubado
vale até expirar, e não há como cancelá-lo. **Esse risco já tinha sido resolvido
antes**, quando implementamos a revogação por `tokenVersion`.

Como o `tokenVersion` do usuário vai assinado no token e é conferido contra o
banco a cada requisição autenticada, trocar a senha invalida **todos** os tokens
emitidos antes — inclusive um de 30 dias, e na mesma hora. Existe um botão de
pânico que funciona.

Sem essa revogação, a resposta correta seria manter as 2 horas. A ordem em que as
duas coisas foram construídas importa: foi a revogação que tornou a sessão longa
defensável.

### Por que o valor não é validado de forma frouxa

O validador rejeita qualquer coisa que não seja booleano — inclusive a string
`"true"`. O motivo é concreto: em JavaScript, `Boolean("false")` é `true`. Se o
front enviasse o valor como texto por engano, um usuário que **desmarcou** o
checkbox ganharia uma sessão de 30 dias sem pedir. Barrar no validador
transforma um bug silencioso em um erro 400 visível.

## Consequências

### A favor

- O usuário decide. Quem usa um computador compartilhado deixa desmarcado e
  mantém a sessão curta.
- A duração é configurável por ambiente, sem alterar código.
- A escolha não é confiável ao cliente: a validade vem assinada do servidor.

### Contra (e como lidamos)

- **Janela de exposição maior.** Um token roubado vale por até 30 dias.
  Mitigação: a revogação por `tokenVersion` derruba a sessão assim que a senha é
  trocada. É o procedimento a orientar ao usuário em caso de suspeita.
- **O token vive no `localStorage`**, que é legível por qualquer script na
  página. Uma sessão de 30 dias amplia a consequência de uma falha de XSS.
  Isso continua na lista de pendências: cookie `httpOnly` é o endurecimento
  natural, e passa a ter mais peso agora que a sessão é longa.
- **Não há "encerrar sessão em todos os dispositivos" na interface.** A
  capacidade existe no backend (basta incrementar o `tokenVersion`), mas ainda
  não há tela para acioná-la sem trocar a senha.

## Arquivos afetados

| Arquivo | O que mudou |
| --- | --- |
| `src/config/env.ts` | + `jwtExpiresInLembrarMe` (`JWT_EXPIRES_IN_LEMBRAR_ME`, padrão 30d) |
| `src/utils/validators.ts` | `LoginInput` ganhou `lembrarMe`, validado como booleano estrito |
| `src/services/authService.ts` | `montarSessao` escolhe a validade conforme o campo |
| `src/login.jsx` | checkbox controlado, enviado no corpo do login |
| `.env.example` | documenta a variável nova |

## Como isso foi verificado

Teste automatizado contra a API real, com o servidor em memória:

| Caso | Resultado |
| --- | --- |
| Login sem o campo | 7200s (2,0 h) |
| `lembrarMe: false` | 7200s (2,0 h) |
| `lembrarMe: true` | 2592000s (30,0 dias) |
| `lembrarMe: "true"` (string) | HTTP 400, campo rejeitado |
| Token de 30 dias após troca de senha | HTTP 401 — revogação continua valendo |

E pela interface, no navegador: com o checkbox marcado, o token gravado no
`localStorage` trouxe `exp - iat` igual a 30,0 dias.
