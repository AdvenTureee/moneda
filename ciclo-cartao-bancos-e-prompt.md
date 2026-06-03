# Ciclo do cartão de crédito em bancos e regra de parcelamento para agentes de IA

## Visão geral

O ciclo do cartão de crédito é o período entre um fechamento de fatura e o próximo. Nesse intervalo, as compras realizadas no cartão são agrupadas para compor a fatura atual ou a próxima, dependendo da data em que a transação foi lançada em relação ao fechamento.[cite:2][cite:7][cite:9]

Na prática, bancos como Nubank e C6 tratam o fechamento como o momento em que o cartão “vira”. Depois desse ponto, novas compras passam a entrar na fatura do mês seguinte.[cite:2][cite:7]

Esse comportamento não é exclusivo de um banco. Materiais explicativos de outras instituições e publicações de educação financeira seguem a mesma lógica: o fechamento define a mudança de ciclo, e não o dia exato da compra original.[cite:3][cite:5][cite:9]

## Como funciona o ciclo

Os conceitos centrais são:

- **Data de fechamento**: último dia considerado para consolidar compras em uma fatura.[cite:3][cite:7]
- **Data de vencimento**: dia em que a fatura deve ser paga.[cite:2][cite:9]
- **Novo ciclo**: começa logo após o fechamento da fatura anterior.[cite:7][cite:9]

Exemplo:

- Fechamento: dia 20.
- Vencimento: dia 27.
- Compras feitas até o dia 20 entram na fatura que vencerá no dia 27.[cite:3][cite:9]
- Compras feitas depois do dia 20 entram na próxima fatura.[cite:3][cite:7][cite:9]

Por isso, o “melhor dia para compra” costuma ser o dia imediatamente após o fechamento. Nesse caso, a compra ganha quase um ciclo completo antes de vencer.[cite:2][cite:7]

## Como parcelamento entra no ciclo

Quando uma compra é parcelada, a primeira parcela entra conforme o ciclo em que a compra foi realizada ou capturada. As parcelas seguintes passam a ser lançadas nas faturas subsequentes, acompanhando a virada de cada novo ciclo.[cite:17][cite:24][cite:36]

Isso significa que as parcelas futuras não devem ficar presas ao mesmo dia e horário da primeira parcela no sistema interno do aplicativo. No comportamento esperado de cartão de crédito, a parcela seguinte passa a existir logo no início do novo ciclo da fatura correspondente, porque ela já compõe aquela fatura futura.[cite:7][cite:17][cite:36]

Em termos de modelagem, a regra mais fiel ao comportamento bancário é:

1. Registrar a primeira parcela na fatura compatível com a data da compra.
2. Para cada parcela seguinte, lançar a parcela na abertura do ciclo seguinte do cartão, e não repetir o timestamp original da primeira compra.
3. Exibir as parcelas futuras assim que o novo ciclo começar, mesmo que ainda não tenha chegado o mesmo dia do mês da compra original.[cite:3][cite:7][cite:9]

## Problema comum em apps financeiros

Um erro comum é salvar todas as parcelas com base em uma recorrência mensal ancorada no mesmo dia e horário da primeira parcela. Quando isso acontece, o usuário só vê a próxima parcela quando o calendário chega novamente naquele dia, o que não reflete a lógica da fatura do cartão.[cite:3][cite:7]

Esse modelo gera uma visão incorreta do orçamento, porque no começo do novo ciclo a próxima parcela já deveria aparecer como compromisso futuro daquela fatura. Em apps de controle financeiro, isso afeta previsão de gastos, limite disponível e compreensão da fatura aberta.[cite:5][cite:9]

## Regra recomendada para o projeto

A implementação recomendada é separar dois conceitos:

- **Data real da compra**: usada para histórico da transação original.
- **Competência da parcela no cartão**: usada para decidir em qual ciclo/fatura cada parcela deve aparecer.

Cada parcela deve ter pelo menos estes campos conceituais:

| Campo | Função |
|---|---|
| `purchase_date` | Data original da compra |
| `installment_number` | Número da parcela |
| `installment_total` | Total de parcelas |
| `card_closing_day` | Dia de fechamento do cartão |
| `billing_cycle_id` | Identificador do ciclo/fatura |
| `visible_from` | Data de início de exibição da parcela |
| `due_invoice_month` | Mês/competência da fatura |

Regra sugerida:

- A primeira parcela entra no ciclo determinado pela data da compra versus data de fechamento.
- A parcela 2 entra no ciclo imediatamente seguinte.
- A parcela 3 entra no próximo ciclo após a parcela 2, e assim por diante.
- A visibilidade da parcela deve começar no primeiro instante do ciclo correspondente, por exemplo `00:00:00` do dia seguinte ao fechamento anterior, ou conforme a convenção adotada no sistema.[cite:7][cite:9]

## Prompt para o agente IA

Use o texto abaixo como instrução de sistema, regra de negócio ou prompt interno do agente:

```text
Ao processar gastos de cartão de crédito parcelados, trate cada parcela com base no ciclo da fatura do cartão, e não com base no mesmo dia e horário da primeira compra.

Regras obrigatórias:
1. Identifique a data de fechamento do cartão e a data de vencimento.
2. Determine em qual ciclo a primeira parcela deve entrar com base na data da compra em relação ao fechamento.
3. Após registrar a primeira parcela, todas as parcelas subsequentes devem ser lançadas no início de cada novo ciclo do cartão.
4. Não replique o mesmo timestamp da primeira parcela para as próximas.
5. Assim que um novo ciclo começar, a próxima parcela correspondente já deve ficar visível para o usuário.
6. O usuário não deve precisar esperar o mesmo dia do mês da compra original para visualizar a próxima parcela.
7. A data original da compra deve ser preservada apenas como referência histórica, sem controlar a visibilidade das parcelas futuras.
8. Para fins de exibição, orçamento e previsão de fatura, considere a competência da parcela no ciclo do cartão.

Exemplo:
- Compra parcelada em 4 vezes realizada no dia 10.
- Fechamento do cartão no dia 20.
- A primeira parcela entra na fatura do ciclo atual.
- Quando o ciclo seguinte começar após o fechamento, a segunda parcela já deve aparecer imediatamente no começo desse novo ciclo.
- O mesmo vale para as demais parcelas subsequentes.

Se houver conflito entre “data da compra” e “ciclo da fatura”, priorize sempre o ciclo da fatura para decidir quando a parcela deve aparecer ao usuário.
```

## Regra curta para documentação técnica

Se o projeto precisar de uma versão mais curta da regra:

```text
Parcelas futuras de cartão de crédito devem ser exibidas por ciclo de fatura. A primeira parcela respeita a data da compra e o fechamento atual; as demais devem aparecer no início de cada novo ciclo, sem depender do mesmo dia da compra original.
```

## Observações finais

Como regra de produto, vale tratar esse comportamento como padrão da maioria dos emissores, porque a organização da fatura é centrada no fechamento do cartão. Nubank e C6 documentam explicitamente a lógica de virada de ciclo, e outros bancos seguem a mesma estrutura de fechamento, próxima fatura e parcelas em faturas subsequentes.[cite:2][cite:7][cite:31][cite:35][cite:36]

Se o sistema permitir múltiplos cartões, a lógica ideal é calcular as parcelas por cartão, já que cada emissor ou bandeira pode ter data de fechamento e convenções de exibição diferentes, embora a regra geral do ciclo permaneça a mesma.[cite:3][cite:7][cite:9]
