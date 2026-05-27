```md
# Problemas e inconsistências no modo escuro

## 1. Fade inferior fora do tema escuro
Existe um efeito de fade/brilho na parte inferior da tela para indicar que há mais conteúdo abaixo, porém esse efeito está claro/branco e não segue a paleta do modo escuro. Isso quebra a imersão visual e passa a sensação de resquício do tema claro.

## 2. Hierarquia inconsistente entre fundos e superfícies
Os fundos gerais das telas, os cards e os blocos internos usam tons escuros diferentes, mas sem uma hierarquia visual clara entre background principal, superfície e superfície elevada. O resultado é uma interface visualmente inconsistente.

## 3. Inputs com aparência de tema claro
Alguns campos de entrada continuam com fundo muito claro, quase branco, mesmo dentro de contextos escuros. Isso acontece, por exemplo, no campo de valor do modal de adicionar gasto e no campo de busca do feed.

## 4. Contraste excessivo em campos de formulário
Além de estarem claros demais, alguns inputs contrastam de forma muito agressiva com o restante da interface. Em vez de parecerem componentes integrados ao dark mode, eles parecem elementos importados do tema claro.

## 5. Texto importante com contraste insuficiente
Há informações relevantes com contraste baixo demais em relação ao fundo escuro. Um exemplo é o valor grande de saldo/restante do mês, que fica difícil de ler e perde destaque mesmo sendo um dado prioritário.

## 6. Textos secundários mal calibrados
Os textos de apoio e descrições secundárias aparecem apagados em excesso em algumas áreas e claros demais em outras. Isso prejudica a consistência da hierarquia tipográfica e visual.

## 7. Cores semânticas sem padronização
Verde, roxo, azul, vermelho e amarelo aparecem em diferentes contextos, mas sem uma regra clara de uso para estados, categorias ou ações. No modo escuro, essa falta de padronização fica ainda mais evidente.

## 8. Ícones com saturação desigual
Os ícones circulares coloridos das seções e categorias possuem intensidades e brilhos diferentes entre si. Isso dá a impressão de que cada item segue um estilo visual diferente dentro do mesmo sistema.

## 9. Tab bar inferior com separação artificial
A navegação inferior está em um tom escuro coerente, mas existe uma transição/fade claro acima dela que cria uma quebra visual brusca entre conteúdo e barra inferior. A composição parece “emendada”.

## 10. Botão flutuante central com peso visual excessivo
O botão flutuante verde na barra inferior chama mais atenção do que o restante da navegação e desequilibra a hierarquia visual da tela. Ele parece pertencer a outro nível de destaque.

## 11. Elevação e profundidade inconsistentes
Alguns cards parecem completamente chapados, outros têm sombra perceptível e outros têm brilho ou sensação de elevação diferente. Falta uma regra consistente de profundidade entre componentes parecidos.

## 12. Card verde de resumo luminoso demais para dark mode
O card de resumo do mês usa um verde muito claro e muito dominante visualmente. Em vez de funcionar como destaque pontual, ele quase parece um bloco de tema claro colorido.

## 13. Conflito visual entre card claro e botão escuro
Dentro do card verde de resumo, o botão escuro “Regenerar” até funciona isoladamente, mas entra em conflito com o fundo muito luminoso do container. Isso reforça a sensação de mistura entre dois sistemas visuais.

## 14. Gráficos não totalmente adaptados ao tema escuro
Nos gráficos, algumas barras e linhas estão claras demais em comparação ao fundo escuro. Isso deixa a visualização mais agressiva visualmente do que o necessário e reduz a elegância do dark mode.

## 15. Paleta dos gráficos desalinhada do restante da interface
Elementos como barras roxas e destaques verdes nos gráficos não parecem seguir uma lógica unificada com os demais componentes do app. A visualização de dados parece usar outra linguagem visual.

## 16. Estados de seleção pouco claros
Filtros, chips e estados ativos/inativos não estão sempre bem diferenciados. Em alguns casos, o item ativo funciona bem, mas os inativos ficam próximos demais do fundo e perdem legibilidade.

## 17. Botões de ação com baixa distinção visual
Ações como editar e excluir, especialmente nos cards do feed, têm fundo escuro muito próximo ao do card principal. Isso reduz a clareza de reconhecimento das ações.

## 18. Tema escuro ativado, mas não totalmente refletido na interface
Mesmo com o switch de modo escuro ativo, ainda existem elementos, efeitos e superfícies que não parecem adaptados ao tema. Isso gera sensação de implementação parcial ou incompleta.

## 19. Divisores e bordas sem consistência
Em algumas áreas, os separadores quase desaparecem; em outras, ficam visíveis demais. Isso indica falta de padronização nos tokens de borda/divisor do tema escuro.

## 20. Destaques visuais competindo com informações mais importantes
Alguns elementos decorativos ou secundários, como a borda verde do avatar e certos ícones, chamam mais atenção do que dados principais da tela. Isso prejudica a hierarquia visual.

---

# Diagnóstico geral

O principal problema do modo escuro é que ele aparenta ter sido aplicado de forma parcial e por componente, em vez de seguir um sistema visual único e consistente. As inconsistências aparecem em fundos, inputs, fades, gráficos, contrastes, cores semânticas, divisores e estados interativos.

---

# Resumo curto para agente

O modo escuro apresenta inconsistências visuais em superfícies, inputs, fades, contrastes, gráficos, cores semânticas e navegação. A interface passa a sensação de que alguns componentes foram adaptados ao dark mode, mas outros ainda mantêm comportamento visual do tema claro, comprometendo coerência, legibilidade e hierarquia.
```