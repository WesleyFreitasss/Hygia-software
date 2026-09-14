Especificação Consolidada do MVP Hygia
Objetivo
CRM especializado para corretoras de seguros, substituindo ferramentas fragmentadas e organizando:

Captação e importação de leads.
Gestão de clientes e oportunidades.
Funil comercial.
Follow-ups e tarefas.
Reativação de leads frios.
Controle de equipe e permissões.
Base preparada para chatbot, comissões, simulador e automações futuras.
Entidades principais
Conta/Corretora: isolamento completo dos dados, fuso padrão America/Sao_Paulo e configurações próprias.
Cliente: cadastro permanente com nome, telefone, CPF/CNPJ, e-mail e dados LGPD.
Oportunidade: negociação específica vinculada a um cliente, produto, etapa, responsável, histórico e dados da cotação.
Usuário: membro da equipe com papel e permissões individuais.
Tarefa: follow-up, vencimento, responsável e próxima ação.
Histórico/Auditoria: usuário, ação e timestamps.
Log técnico: tentativas inválidas de webhook e avisos de integração.
Um cliente pode ter várias oportunidades para novos produtos, renovações ou cross-sell.

Entrada de leads
Webhook
Obrigatórios:

external_id
Nome
Telefone
Opcionais:

Plano desejado.
Composição familiar.
Idades.
Região.
Hospital de preferência.
Plano anterior.
Responsável.
Outros campos personalizados.
Regras:

Cada conta possui URL e token próprios.
Token regenerado invalida imediatamente o anterior.
account_id + external_id é a chave idempotente.
Reenvio atualiza apenas os campos presentes no payload.
Campos ausentes nunca apagam dados existentes.
Etapa, responsável, tarefas e histórico são preservados.
Responsável é identificado por e-mail; nome exato é fallback.
E-mail sempre vence conflito com nome.
Responsável ausente ou não encontrado envia o lead para a fila.
Payload inválido não cria registros e gera log técnico.
Respostas:

201 Created: novo cliente/oportunidade.
200 OK: processamento idempotente.
400 Bad Request: payload inválido.
401 Unauthorized: token ausente, inválido ou revogado.
CSV
UTF-8, até 50 MB.
Importação síncrona e parcial.
Mapeamento configurável de colunas.
Prévia antes da confirmação.
Suporte a external_id, mas ele não é obrigatório.
Responsável por e-mail, com nome como fallback.
Sem responsável válido, lead vai para a fila.
Linhas válidas são importadas.
Linhas inválidas aparecem em relatório com motivo.
Sem nome ou telefone: erro bloqueante.
Sem external_id, busca por nome + telefone e cria nova oportunidade.
A prévia deve classificar:

Prontas.
Erro bloqueante.
Cliente existente com nova oportunidade.
Responsável enviado para a fila.
Google Planilhas será usado apenas para exportar/importar dados, sem sincronização automática.

Deduplicação
Antes da busca:

Nome convertido para minúsculas e sem acentos.
Telefone reduzido somente a dígitos.
Máscaras, espaços e parênteses são ignorados.
Fluxo:

external_id existente: atualiza a oportunidade correspondente.
external_id novo com cliente encontrado: cria nova oportunidade.
Cliente não encontrado: cria cliente e oportunidade.
CSV sem external_id segue a mesma busca por nome + telefone.
Funil
Etapas intermediárias são personalizáveis pelo Administrador:

Criar.
Renomear.
Reordenar.
Excluir mediante migração ou bloqueio se houver dados.
Definir campos obrigatórios por etapa/produto.
Etapas finais protegidas:

Fechado/Ganho
Perdido
Ambas permanecem no final do funil e não podem ser excluídas ou reposicionadas.

“Leads Frios” é uma visualização separada, fora do Kanban principal.

Campos da oportunidade
Entrada inicial mínima:

Nome.
Telefone.
Campos de cotação:

Plano desejado.
Composição familiar.
Idades.
Tem CNPJ.
É MEI.
MEI há mais de seis meses.
Região.
Hospital de preferência.
Plano anterior:
Não possui.
Outra operadora.
Mesmo plano.
Não informado.
Composição familiar e idades serão campos de texto no MVP.

O cartão do Kanban exibirá apenas:

Nome.
Telefone.
Plano desejado.
Os demais dados ficam na ficha detalhada.

Cadência e tarefas
A cadência é configurável por conta pelo Administrador, com valores iniciais sugeridos de:

Primeira tentativa: mesmo dia.
Follow-up 1: após 24 horas.
Follow-up 2: após 48 horas.
Sem avanço após a terceira tentativa: Leads Frios.
O cálculo usa horas corridas, 24/7, respeitando o fuso da conta.

Conta como interação comercial:

Ligação registrada.
WhatsApp registrado.
Reunião registrada.
Observação relevante.
Alteração de etapa.
Não conta:

Correção de e-mail.
Correção de digitação.
Alteração cadastral sem avanço comercial.
Ao concluir uma tarefa, o sistema abre um modal “Qual o próximo passo?” com:

Amanhã.
Em 48 horas.
Data personalizada.
Encerrar cadência por venda fechada ou perda.
Leads frios podem ser reativados em uma etapa escolhida pelo corretor. A etapa inicial é sugerida e a cadência recomeça do zero.

Desfechos
Fechado/Ganho
A oportunidade torna-se imutável e exige:

CPF ou CNPJ válido, exatamente um dos dois.
E-mail.
Data de início/vigência.
Data de renovação posterior à vigência.
Seguradora.
Número da apólice.
Novas vendas ou renovações exigem nova oportunidade vinculada ao mesmo cliente.

Perdido
Exige:

Motivo da perda.
Descrição obrigatória quando o motivo for “Outro”.
Motivos iniciais:

Preço/condição de pagamento.
Falta de interesse/parou de responder.
Fechou com concorrente.
Documentação pendente/incompleta.
Perfil incompatível/fora da área.
Reprovado pela seguradora/operadora.
Outro.
Motivos usados não podem ser excluídos, apenas inativados.

Equipe e permissões
Papéis iniciais:

Administrador.
Vendedor.
Financeiro.
As permissões podem ser sobrescritas individualmente por usuário.

Permissões independentes:

Visualizar leads.
Criar leads.
Editar leads.
Transferir responsáveis.
Movimentar etapas.
Criar tarefas.
Visualizar valores.
Exportar dados.
Excluir oportunidades.
Regras:

Sempre existe pelo menos um Administrador Master protegido.
Vendedores veem apenas sua carteira por padrão.
O Administrador pode ampliar a visibilidade de usuários específicos.
Financeiro vê CPF/CNPJ, apólices, valores, comissões e relatórios, mas não movimenta o funil.
Transferência remove imediatamente o acesso do vendedor anterior.
Usuário desativado devolve seus leads ativos à fila.
Convites:

Enviados por e-mail.
Link seguro válido por 24 horas.
Administrador pode reenviar convite.
Usuário define senha e confirma nome/e-mail no primeiro acesso.
LGPD e exclusão
Auditoria salva criador, editor, transferidor, usuário e timestamps.
Dados podem ser exportados em CSV/JSON pelo Administrador.
Anonimização substitui dados pessoais por “Cliente Anonimizado / LGPD”.
Histórico, métricas, oportunidades e valores são preservados.
Exclusão de oportunidade exige modal de alerta e digitação de EXCLUIR.
Operações de anonimização e exclusão são restritas ao Administrador.
Identidade visual
Design system baseado na referência fornecida:

Fundo preto sofisticado.
Dourado em logotipo, bordas, destaques e botões.
Gradientes dourados nos CTAs.
Tipografia limpa.
Contraste acessível em textos, tabelas e mensagens.
Erros em tons claros ou vermelho de alerta.
Fotos JPG, PNG e WebP até 5 MB.
Redimensionamento automático.
Avatar com iniciais quando não houver foto.
Fora do MVP
Chatbot próprio.
Distribuição automática por roleta.
SLA automático e redistribuição.
E-mail e WhatsApp automáticos.
Simulador de cálculos.
Controle completo de comissões.
Assistente virtual.
Sincronização contínua com Google Planilhas.
Relatórios visuais avançados.
Composição familiar estruturada.
Painel visual completo de auditoria.
A base de dados e a API devem, porém, nascer preparadas para essas fases futuras.