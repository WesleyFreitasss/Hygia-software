# Registro de segurança — Escalada de privilégio no cadastro público

- **Data da descoberta e correção:** 14/09/2026
- **Severidade:** crítica
- **Situação:** corrigida
- **Ambiente afetado:** desenvolvimento (o sistema ainda não estava em produção)
- **Classificação:** OWASP API Security Top 10 2023 — *API3: Broken Object
  Property Level Authorization* (atribuição em massa); CWE-915 e CWE-269

## Resumo

A rota pública `POST /auth/register` aceitava o campo `nivelAcesso` vindo do
corpo da requisição. Qualquer pessoa, sem autenticação, conseguia criar uma conta
**com papel de administrador** e receber um token válido na mesma resposta.

## Como foi descoberta

Durante a auditoria do código existente contra o `SPEC.md`, antes do início da
Semana 1. O SPEC define que novos usuários entram **por convite** e que existe um
Administrador Master protegido — o que tornava suspeita qualquer rota pública
capaz de definir papel.

A suspeita foi confirmada com uma requisição real contra a API:

```
POST /auth/register
{ "nome": "Invasor", "email": "invasor@qualquer.com",
  "senha": "senhaForte123", "nivelAcesso": "admin" }

→ HTTP 201   nivelAcesso concedido: admin   token emitido: SIM
```

## Impacto

Em produção, um invasor obteria controle administrativo completo sem precisar de
nenhuma credencial: acesso aos dados de clientes de todas as corretoras,
capacidade de alterar permissões e — após a entrada do módulo de LGPD — de
exportar e anonimizar dados pessoais.

## Causa raiz

A regra de validação tratava `nivelAcesso` como um dado de formulário comum:
conferia se o **valor** era válido (`admin` ou `vendedor`), mas nunca perguntava
se o cliente tinha **direito de informar** esse campo.

É a confusão clássica entre *validação* e *autorização*. A validação responde "o
dado está bem formado?"; a autorização responde "quem está pedindo pode pedir
isso?". Um campo que define privilégio nunca pode ser decidido por quem vai
receber o privilégio.

O código nasceu assim porque, na primeira versão, o nível de acesso foi pensado
como parâmetro opcional de conveniência para testes — e a rota pública herdou a
conveniência.

## Correção

Aplicada em **três camadas**, para que uma falha futura em uma delas não reabra a
brecha sozinha:

| Camada | Arquivo | O que mudou |
| --- | --- | --- |
| Tipo | `src/types/user.ts` | `CreateUserInput` deixou de ter `nivelAcesso`. O TypeScript agora impede que o campo seja reintroduzido no cadastro por engano |
| Validação | `src/utils/validators.ts` | A presença do campo — com **qualquer** valor — gera HTTP 400 |
| Serviço | `src/services/authService.ts` | O papel do cadastro público é fixado no servidor como `vendedor`, independentemente da entrada |

### Por que recusar com 400 em vez de ignorar em silêncio

Ignorar o campo também fecharia a brecha. A recusa explícita foi preferida
porque um cliente mal configurado — por exemplo, uma tela futura que tente enviar
o papel — descobre o problema imediatamente, em vez de criar usuários com o papel
errado sem que ninguém perceba.

### Por que outros nomes de campo não são um risco

Testamos `papel`, `role` e `isAdmin`: todos são descartados. O validador monta o
objeto de retorno **campo a campo**, e nenhuma parte do código repassa o corpo da
requisição inteiro para o banco. Uma varredura no código confirmou que não há
nenhuma outra ocorrência desse padrão.

## Verificação

Teste executado contra a API compilada, com banco isolado:

| Caso | Resultado |
| --- | --- |
| `nivelAcesso: "admin"` | HTTP 400, nenhum token, nada gravado no banco |
| `nivelAcesso: "vendedor"` | HTTP 400 — o campo é proibido, não só o valor `admin` |
| `papel`, `role`, `isAdmin` | ignorados; conta criada como `vendedor` |
| Cadastro normal | HTTP 201, criado como `vendedor` |
| Login e rota protegida `/auth/me` | continuam funcionando |
| Administradores criados pela rota pública | zero |

## Efeito colateral conhecido

Após a correção, **não existe mais nenhuma forma de criar um administrador pela
API**. Isso é intencional e temporário. O primeiro administrador — o
Administrador Master previsto no SPEC — será criado junto com a corretora no
Card 1, e os demais papéis passarão a ser concedidos por convite no Card 3.

## O que se aprendeu

1. **Privilégio nunca vem do cliente.** Todo campo que concede poder deve ser
   decidido no servidor, a partir de quem está autenticado — nunca a partir do
   que foi enviado.
2. **Validação não substitui autorização.** Um valor pode ser perfeitamente
   válido e ainda assim não caber a quem o enviou.
3. **Defesa em profundidade tem custo baixo.** Três camadas somaram poucas linhas
   de código, e cada uma sozinha teria bastado. A redundância protege contra a
   próxima refatoração, não contra o ataque de hoje.
4. **A especificação ajuda a achar falhas.** A brecha não foi encontrada por uma
   ferramenta, mas pela divergência entre o código e o que o `SPEC.md` diz sobre
   convites e administradores. Ler o código à luz das regras de negócio é, em si,
   uma técnica de revisão de segurança.

## Pendência de acompanhamento

Transformar o teste de verificação acima em teste automatizado de regressão
quando a suíte do projeto for criada (Card 5 da Semana 1), para que a brecha não
possa voltar sem que o teste falhe.
