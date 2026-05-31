# Melhorias dos graficos financeiros

## Objetivo

Os graficos do Moneda devem ajudar o usuario a entender duas perguntas rapidamente:

- Para onde o dinheiro esta indo?
- O gasto acumulado esta acompanhando o maximo planejado para o periodo?

Por isso, a visualizacao por categoria passa a usar waffle chart, que evidencia participacao percentual, e a visualizacao temporal passa a comparar duas linhas acumuladas: gasto real e planejado proporcional.

## Gastos por categoria

O grafico waffle usa uma matriz de 100 celulas. Cada celula representa 1% do gasto total do periodo.

Regras:

- Categorias com menos de 3% do total continuam agrupadas em "Outros".
- Clique ou foco em uma categoria abre o mesmo detalhe ja usado na lista.
- A lista por categoria permanece abaixo do grafico para leitura exata dos valores.
- Cores continuam vindo da categoria cadastrada pelo usuario.

Essa escolha torna a proporcao mais concreta que o donut anterior, especialmente em telas pequenas.

## Gasto vs planejado

O grafico temporal compara gasto real e planejado:

- **Gasto**: valor gasto no recorte exibido.
- **Planejado**: maximo informado pelo usuario para aquele recorte.

A linha de gasto pode ultrapassar a linha planejada. Isso nao e erro visual; e justamente o sinal de que o ritmo de gasto passou do ritmo planejado.

Modos:

- **Ano**: meses do ano selecionado. O planejado e o teto de cada mes, sem acumular ao longo do ano.
- **Mes**: dias do mes selecionado. O planejado mensal e dividido pelos dias do mes.
- **Dia**: horas do dia selecionado. O planejado diario e derivado do planejado mensal dividido pelos dias do mes e distribuido pelas 24 horas.

## Dados e fallback

O valor planejado principal vem de `getMonthlyBudgetCents`, que considera o teto mensal declarado no onboarding.

Se esse valor for zero, o app usa como fallback a soma dos orcamentos por categoria cadastrados para o periodo.

Nao ha mudanca de schema: os dados continuam vindo de `expenses`, `budgets`, `profiles` e `incomes`.

## Criterios de aceite

- Waffle representa 100% do gasto por categoria.
- Categorias pequenas aparecem agrupadas como "Outros".
- O clique nas categorias continua abrindo o detalhe correto.
- O grafico temporal abre em modo Ano por padrao.
- Ano, Mes e Dia alternam sem nova navegacao.
- No modo Ano, a linha Planejado representa o teto mensal de cada mes, sem escalar acumulado.
- Nos modos Mes e Dia, a linha Planejado cresce proporcionalmente no periodo.
- A linha Gasto pode ultrapassar a Planejado.
- Estados sem gasto ou sem planejamento continuam legiveis.
- Light e dark mode preservam contraste.
