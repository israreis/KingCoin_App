# Plano de testes manuais — KingCoin App

Versão do app: SDK 58 · Banco: `supabase/schema.sql` executado por completo.

## Como usar

1. Para cada caso, siga os passos e marque o resultado: ✅ passou · ❌ falhou · ⚠️ passou com ressalva · ⏭️ não testado.
2. Em caso de ❌, anote em **Obs.** o que aconteceu, a tela e, se possível, um print ou o erro do terminal.
3. Classifique cada falha pela severidade:
   - **S1 Crítica**: app fecha, perde dados ou expõe dados de outro usuário.
   - **S2 Alta**: funcionalidade principal não funciona e não há alternativa.
   - **S3 Média**: funciona com erro visual, texto errado ou passo extra.
   - **S4 Baixa**: detalhe estético ou sugestão.

## Ambientes

| Ambiente | Usar em |
|---|---|
| iPhone com Expo Go | Todos os casos, exceto login com Apple |
| Android com Expo Go (se tiver) | Casos marcados com **[A]**: comportamento diferente no Android |
| Tema escuro e tema claro | Casos de interface (TEMA-*) |
| Online e modo avião | Casos OFF-* |

## Dados de teste sugeridos

- Usuário A: `teste.a@seuemail.com` · Usuário B: `teste.b@seuemail.com` (para checar isolamento)
- Valores: `0,01`, `12,50`, `1.234,56`, `99.999.999,99`
- Datas: hoje, ontem, último dia do mês anterior, 29/02 (se aplicável), 31 de um mês com 30 dias

---

## Avaliação das funcionalidades

Leitura técnica de cada funcionalidade, para orientar onde testar com mais cuidado.

| # | Funcionalidade | Situação | Riscos e limitações conhecidas | Prioridade |
|---|---|---|---|---|
| 1 | Cadastro, login e recuperação de senha | Implementado | Depende da configuração de e-mail do Supabase (confirmação e template com `{{ .Token }}`) | Alta |
| 2 | Login com Google | Implementado | Exige Client ID e Redirect URLs no Supabase; no Expo Go o retorno usa `exp://` | Média |
| 3 | Login com Apple | Implementado | Só iPhone, exige conta Apple Developer e development build | Baixa |
| 4 | Biometria | Implementado | Bloqueia após 30 s em segundo plano; no Expo Go o pedido de Face ID mostra "Expo Go" | Média |
| 5 | Carteira (saldo, variação, alertas) | Implementado | Variação usa a mesma regra do site; comparar com valores esperados à mão | Alta |
| 6 | Movimentações (CRUD, busca, filtros, deslizar) | Implementado | Editar e excluir ficam em botões ao lado de cada item | Alta |
| 7 | Seletor de data nativo | Implementado | Visual diferente no iOS (calendário) e no Android (diálogo) **[A]** | Média |
| 8 | Máscara de moeda | Implementado | Limite de 10 dígitos (até 99.999.999,99) | Média |
| 9 | Comprovante (foto) | Implementado | Exige internet; conferir se a imagem antiga é apagada ao trocar | Média |
| 11 | Categorias personalizadas | Implementado | Não é possível excluir categoria com movimentações (comportamento esperado) | Média |
| 12 | Orçamentos | Implementado | Aviso só ao criar despesa no mês atual; editar uma despesa não dispara aviso | Média |
| 13 | Recorrências | Implementado | Lançadas ao abrir a Carteira; dia 31 vira último dia do mês | Alta |
| 14 | Metas e aportes | Implementado | Aporte rápido aplica na hora, sem confirmação | Média |
| 15 | Dashboard e insights | Implementado | Projeção supõe ritmo constante de gastos | Média |
| 16 | Relatórios PDF e Excel | Implementado | Depende do app de compartilhamento do aparelho | Média |
| 17 | Lembretes (notificações) | Implementado | Notificações locais; no Expo Go Android há aviso sobre push (pode ignorar) **[A]** | Baixa |
| 18 | Offline | Implementado | Só a criação de movimentações vai para a fila; editar/excluir exigem internet | Alta |
| 19 | Alterar senha com código | Implementado | Requer template "Reauthentication" do Supabase (vem pronto) | Alta |
| 20 | Excluir conta | Implementado | Ação irreversível; testar só com usuário de teste | Alta |
| 21 | Barra de navegação (dock) | Implementado | Desfoque real no iOS; no Android o vidro é semitransparente **[A]** | Média |
| 22 | Teclado | Implementado | Barra "OK" só aparece no iOS em teclados numéricos | Alta |

---

## 1. Autenticação

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| AUT-01 | Cadastro válido | Criar conta → nome, e-mail novo, senha 6+ e confirmação iguais → Cadastrar | Entra no app (ou aviso de confirmar e-mail, se a confirmação estiver ligada) | | |
| AUT-02 | Senhas diferentes | Cadastro com confirmação diferente | Mensagem "As senhas não coincidem" | | |
| AUT-03 | Senha curta | Senha com 5 caracteres | Mensagem de no mínimo 6 caracteres | | |
| AUT-04 | E-mail já cadastrado | Cadastrar e-mail do Usuário A de novo | Mensagem "Este e-mail já está cadastrado" | | |
| AUT-05 | Login válido | E-mail e senha corretos | Abre a Carteira com "Olá, nome" | | |
| AUT-06 | Login inválido | Senha errada | "E-mail ou senha incorretos" | | |
| AUT-07 | Campos vazios | Entrar sem preencher | "Informe e-mail e senha" | | |
| AUT-08 | Recuperar senha | Esqueci minha senha → e-mail → Enviar código → digitar código e nova senha | Senha alterada e entra no app | | |
| AUT-09 | Código inválido | Recuperar senha com código errado | "Código inválido ou expirado" | | |
| AUT-10 | Sessão persistente | Logar, fechar o app por completo e abrir de novo | Continua logado | | |
| AUT-11 | Sair | Conta → Sair → confirmar | Volta para o login; dados não aparecem ao reabrir | | |
| AUT-12 | Login com Google | Continuar com Google → escolher conta | Entra no app com o nome da conta Google | | |
| AUT-13 | Cancelar Google | Abrir o Google e fechar sem logar | Volta ao login sem erro | | |
| AUT-14 | Login com Apple (iPhone, dev build) | Continuar com Apple | Entra no app | | |

## 2. Navegação e interface

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| NAV-01 | Dock aparece | Abrir o app logado | Barra flutuante em pílula com 5 ícones, animação de entrada | | |
| NAV-02 | Troca de aba | Tocar em cada ícone | Pílula desliza até o ícone tocado; ícone fica verde e preenchido | | |
| NAV-03 | Toque em aba ativa | Tocar no ícone da aba atual | Nada muda, sem piscar | | |
| NAV-04 | Conteúdo não fica atrás da dock | Rolar até o fim de Carteira, Movimentações, Metas e Conta | Último item visível acima da barra | | |
| NAV-05 | Voltar só com ícone | Abrir Nova movimentação, Nova meta, Editar meta, Orçamentos, Relatórios | Seta de voltar sem o texto "(tabs)" | | |
| NAV-06 | Voltar por gesto | Deslizar da borda esquerda (iOS) ou botão voltar (Android) | Volta para a tela anterior | | |
| NAV-07 | Acessibilidade da dock | Ativar VoiceOver/TalkBack e passar pelos ícones | Lê "Carteira", "Movimentações" etc. | | |
| TEMA-01 | Tema claro | Conta → desligar Tema escuro | Todas as telas legíveis, dock clara | | |
| TEMA-02 | Tema persiste | Trocar tema, fechar e abrir o app | Mantém o tema escolhido | | |
| TEMA-03 | Respiro das telas | Navegar por todas as telas | Conteúdo afastado das bordas e do notch | | |

## 3. Teclado

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| TEC-01 | Tocar fora fecha | Abrir o teclado em qualquer campo e tocar numa área vazia | Teclado fecha | | |
| TEC-02 | Arrastar fecha | Com teclado aberto num formulário, rolar a tela para baixo | Teclado acompanha o dedo (iOS) ou fecha (Android) | | |
| TEC-03 | Barra "OK" (iOS) | Tocar em Valor, Dia do mês, Telefone ou Código | Barra com "OK" acima do teclado; ao tocar, fecha | | |
| TEC-04 | Tecla Concluir | Em campos de texto (Nome, Descrição), tocar em "Concluído/OK" do teclado | Teclado fecha | | |
| TEC-05 | Busca em Movimentações | Digitar na busca e rolar a lista | Teclado fecha ao rolar | | |
| TEC-06 | Campo não fica coberto | Em Nova movimentação, tocar em Descrição | Campo visível acima do teclado | | |
| TEC-07 | Modal de aporte | Metas → Outro valor → digitar → OK | Teclado fecha e botões visíveis | | |

## 4. Carteira

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| CAR-01 | Saldo do mês | Lançar receita 1.000,00 e despesa 300,00 no mês | Saldo R$ 700,00; Receitas 1.000; Despesas 300 | | |
| CAR-02 | Variação | Com dados no mês anterior, ver o percentual | Percentual coerente com (atual − anterior) / anterior | | |
| CAR-03 | Filtro de período | Alternar Este mês, Último mês, 3 meses, Este ano | Valores e listas mudam conforme o período | | |
| CAR-04 | Investimentos | Lançar Economia 200,00 | Card de investimentos mostra R$ 200,00; saldo não muda | | |
| CAR-05 | Puxar para atualizar | Arrastar a tela para baixo | Indicador gira e recarrega | | |
| CAR-06 | Alerta de orçamento | Ter orçamento acima de 80% | Card "Orçamentos em atenção" aparece e leva à tela de orçamentos | | |
| CAR-07 | Lista vazia | Usuário novo sem dados | Mensagens de vazio, sem erro | | |

## 5. Movimentações

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| TRA-01 | Criar despesa | Nova movimentação → Despesa → categoria → valor → data → Adicionar | Aparece na lista e no saldo | | |
| TRA-02 | Criar receita e economia | Repetir com Receita e Economia | Cores e sinais corretos (+ verde, − vermelho, roxo) | | |
| TRA-03 | Validação | Adicionar sem categoria, depois com valor 0 | Mensagens claras, nada salvo | | |
| TRA-04 | Máscara de valor | Digitar 1, 2, 3, 4, 5, 6 | Campo mostra 1.234,56 | | |
| TRA-05 | Valor máximo | Digitar mais de 10 dígitos | Para em 99.999.999,99 | | |
| TRA-06 | Seletor de data | Tocar em Data → escolher outro dia → Confirmar | Data exibida em DD/MM/AAAA e salva corretamente | | |
| TRA-07 | Atalhos Hoje/Ontem | Tocar em Ontem | Data muda para ontem | | |
| TRA-08 | Editar | Tocar numa movimentação → mudar valor → Salvar | Valor atualizado na lista | | |
| TRA-09 | Excluir pelo formulário | Abrir → Excluir → confirmar | Some da lista | | |
| TRA-10 | Botão de editar | Tocar no lápis ao lado do item | Abre o formulário de edição | | |
| TRA-11 | Botão de excluir | Tocar na lixeira ao lado do item → confirmar | Item removido | | |
| TRA-12 | Rolagem da lista | Rolar a lista rapidamente | Rola sem acionar editar/excluir por engano | | |
| TRA-13 | Busca | Digitar parte da descrição, depois o nome da categoria, depois com/sem acento | Filtra corretamente nos três casos | | |
| TRA-14 | Filtro por tipo | Tocar em Receita/Despesa/Economia/Todas | Lista filtra | | |
| TRA-16 | Comprovante pela câmera | Anexar → Tirar foto | Miniatura aparece; tocar abre em tela cheia | | |
| TRA-17 | Comprovante da galeria | Anexar → Escolher da galeria → salvar → reabrir | Imagem carrega ao editar | | |
| TRA-18 | Trocar/remover comprovante | Editar → Trocar ou Remover → salvar | Nova imagem ou nenhuma; a antiga some do Storage | | |
| TRA-19 | Criar categoria a partir do formulário | Tocar em "+ Criar ou gerenciar categorias" | Abre Categorias; ao voltar, a nova aparece | | |

## 6. Metas

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| MET-01 | Criar meta | Metas → + → nome, valor 1.000,00 → Criar | Aparece com 0% | | |
| MET-02 | Aporte rápido | Tocar em + R$ 100 | Valor guardado e percentual sobem | | |
| MET-03 | Outro valor | Outro valor → 250,00 → Guardar | Soma 250 | | |
| MET-04 | Meta atingida | Aportar até passar do valor da meta | Alerta "Meta atingida!"; barra em 100% | | |
| MET-05 | Editar e excluir | Lápis → editar → salvar; lixeira → excluir | Funciona como nas movimentações | | |
| MET-06 | Validação | Criar meta sem nome ou com valor 0 | Mensagens de erro | | |

## 7. Orçamentos, recorrências e categorias

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| ORC-01 | Criar orçamento | Conta → Orçamentos → + → Supermercado → 500,00 | Aparece com o gasto do mês | | |
| ORC-02 | Aviso 80% | Lançar despesa de Supermercado que leve o gasto a 80% ou mais | Alerta de atenção ao salvar | | |
| ORC-03 | Aviso 100% | Lançar despesa que ultrapasse 500,00 | Alerta de orçamento ultrapassado; barra vermelha | | |
| ORC-04 | Categoria já usada | Criar segundo orçamento | Supermercado não aparece entre as opções | | |
| ORC-05 | Editar e excluir | Tocar no orçamento → mudar limite / excluir | Atualiza ou remove | | |
| REC-01 | Recorrência hoje | Recorrências → + → Receita Salário → dia de hoje → Criar → voltar à Carteira | Movimentação de salário lançada uma vez | | |
| REC-02 | Sem duplicar | Fechar e abrir o app várias vezes | Continua só uma movimentação no mês | | |
| REC-03 | Dia futuro | Criar recorrência para um dia após hoje | Não lança agora | | |
| REC-04 | Pausar | Desligar "Ativa" | Aparece como pausada e não gera mais lançamentos | | |
| CAT-01 | Criar categoria | Categorias → tipo → nome → Adicionar | Aparece na lista e no formulário de movimentação | | |
| CAT-02 | Renomear | Lápis → novo nome → Salvar | Nome atualizado inclusive nas movimentações | | |
| CAT-03 | Excluir em uso | Excluir categoria com movimentações | Mensagem "Este item está em uso" | | |
| CAT-04 | Padrão protegida | Categorias padrão | Mostram cadeado, sem editar/excluir | | |

## 8. Dashboard e relatórios

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| DAS-01 | Insights | Com despesas no mês, abrir Dashboard | Maior gasto, categoria top, média diária e previsões coerentes | | |
| DAS-02 | Barras mensais | Ver gráfico Receitas x despesas | 6 meses, cores corretas, comparação com mês anterior | | |
| DAS-03 | Evolução do saldo | Ver gráfico de linha | Valor do último ponto igual ao saldo acumulado | | |
| DAS-04 | Pizza por categoria | Ver despesas e receitas por categoria | Percentuais somam 100% | | |
| DAS-05 | Sem dados | Usuário novo | Mensagens de vazio, sem quebrar | | |
| REL-01 | PDF | Relatórios → período → Exportar PDF → abrir | PDF com tabela, totais e período corretos | | |
| REL-02 | Excel | Exportar Excel → abrir no app de planilhas | Colunas Data, Descrição, Categoria, Tipo, Valor e totais | | |
| REL-03 | Datas invertidas | Data inicial depois da final | Mensagem de erro | | |
| REL-04 | Período vazio | Período sem movimentações | Arquivo gerado com "Nenhuma movimentação" | | |

## 9. Conta, segurança e preferências

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| CTA-03 | Dados só leitura | Abrir Conta | Nome completo sob a foto; cartão Dados pessoais sem campos editáveis | | |
| CTA-04 | Editar dados | Editar dados → nome, sobrenome, telefone → Salvar | Volta à Conta com os dados novos; saudação da Carteira atualizada | | |
| CTA-05 | Máscara de telefone | Digitar 11987654321 | Campo mostra (11) 98765-4321 | | |
| CTA-06 | Alterar e-mail | Segurança → Alterar e-mail → novo e-mail duas vezes → Enviar | Mensagem de confirmação; após clicar no link, o novo e-mail aparece | | |
| CTA-07 | E-mail em uso | Tentar o e-mail de outra conta | "Este e-mail já está em uso" | | |
| CTA-02 | Foto de perfil | Tocar na foto → escolher imagem | Foto aparece e persiste após reabrir | | |
| SEN-01 | Alterar senha | Conta → Alterar senha → Enviar código → código do e-mail + nova senha | Senha alterada; login funciona com a nova | | |
| SEN-02 | Código errado | Digitar código inválido | "Código inválido ou expirado" | | |
| SEN-03 | Senhas diferentes | Nova senha e confirmação diferentes | Mensagem de erro, nada muda | | |
| DEL-01 | Senha errada | Deletar minha conta → senha errada | "Senha incorreta"; conta continua | | |
| DEL-02 | Excluir conta | Usuário de teste → senha correta → confirmar | Volta ao login; o e-mail pode ser cadastrado de novo | | |
| DEL-03 | Dados apagados | Após DEL-02, conferir no Supabase (Table Editor e Storage) | Nenhuma linha ou arquivo do usuário | | |
| DEL-04 | Conta do Google | Usuário criado pelo Google → Deletar | Pede o e-mail em vez da senha | | |
| BIO-01 | Ativar biometria | Ligar "Desbloquear com biometria" | Pede Face ID/digital para confirmar | | |
| BIO-02 | Bloqueio | Sair do app por mais de 30 s e voltar | Tela de bloqueio; libera com biometria | | |
| BIO-03 | Retorno rápido | Sair e voltar em menos de 30 s | Não bloqueia | | |
| BIO-04 | Sem biometria | Aparelho sem Face ID/digital cadastrado | Mensagem explicando, interruptor continua desligado | | |
| NOT-01 | Lembrete diário | Ligar lembrete e permitir notificações | Pede permissão; horários aparecem | | |
| NOT-02 | Disparo | Escolher o horário mais próximo e aguardar | Notificação chega no horário | | |
| NOT-03 | Desligar | Desligar o lembrete | Nenhuma notificação depois | | |
| NOT-04 | Permissão negada | Negar a permissão | Mensagem orientando a liberar nas configurações | | |

## 10. Offline

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| OFF-01 | Abrir sem internet | Usar o app online, ativar modo avião, fechar e abrir | Abre com os últimos dados e aviso "Sem conexão" | | |
| OFF-02 | Criar sem internet | Em modo avião, criar uma movimentação | Alerta "salva no aparelho"; item com "Aguardando envio" | | |
| OFF-03 | Sincronizar | Desligar modo avião e puxar para atualizar | Item perde o aviso e aparece no Supabase uma única vez | | |
| OFF-04 | Editar sem internet | Em modo avião, editar uma movimentação | Mensagem "Sem conexão com a internet" | | |
| OFF-05 | Comprovante sem internet | Em modo avião, anexar comprovante e salvar | Mensagem de sem conexão; nada salvo pela metade | | |
| OFF-06 | Sair limpa o cache | Sair e entrar com outro usuário | Não aparecem dados do usuário anterior | | |

## 11. Segurança entre usuários

| ID | Cenário | Passos | Esperado | Resultado | Obs. |
|---|---|---|---|---|---|
| SEG-01 | Isolamento | Criar dados com Usuário A, logar com Usuário B | B não vê nada de A (movimentações, metas, categorias, contas, comprovantes) | | |
| SEG-02 | Categorias personalizadas | A cria categoria; B abre Nova movimentação | Categoria de A não aparece para B | | |

---

## Resumo da rodada

| Item | Valor |
|---|---|
| Data | |
| Aparelho e sistema | |
| Casos executados | |
| ✅ Passaram | |
| ❌ Falharam (S1 / S2 / S3 / S4) | |
| Observações gerais | |
