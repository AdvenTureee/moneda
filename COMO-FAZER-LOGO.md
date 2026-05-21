# 🪙 Manual de Identidade Visual: Mascote "Grana" (Estilo Anos 1920/1930)

Este documento detalha as regras de design, proporções, paleta de cores e acabamento necessários para reproduzir ou criar novas variações do mascote "Grana" mantendo a estética fiel ao estilo *Rubber Hose* (Era de Ouro da Animação Americana).

---

## 📐 1. Anatomia e Proporções

Para preservar o visual clássico de cartoon antigo, o design do personagem segue a **Regra de Três Cabeças**:

* **Cabeça (A Moeda):** Corresponde a $1/3$ da altura total do personagem. Ela concentra toda a expressividade.
* **Corpo e Membros:** Os braços e pernas ocupam os $2/3$ restantes da altura total.
* **Membros "Mangueira de Borracha":** Braços e pernas não possuem ossos, cotovelos ou joelhos visíveis. São linhas pretas grossas, fluidas e de **espessura uniforme** do início ao fim (não afinam nos pulsos/tornozelares).

---

## 🎨 2. Paleta de Cores "Vintage"

Evite o uso de cores digitais puras ou excessivamente saturadas. A paleta deve simular pigmentos físicos e o desgaste do papel/película de cinema envelhecida.

| Elemento | Aplicação | Código HEX | Amostra Visual |
| :--- | :--- | :--- | :--- |
| **Metal (Base)** | Corpo interno da moeda | `#EAB308` | Amarelo Latão Desgastado |
| **Metal (Sombra)** | Texto, ranhuras e bordas | `#A16207` | Ouro Velho / Mostarda |
| **Bochechas** | Rubor facial (Opacidade: 30%) | `#F43F5E` | Rosa Giz Pastel |
| **Contornos** | Linhas, braços, pernas e pupilas | `#1C1917` | Preto Carvão / Sépia Escuro |
| **Fundo/Olhos** | Esclera dos olhos e luvas | `#FAFAF9` | Branco Giz / Off-White |

---

## 🎭 3. Expressão e Micro-detalhes

O conceito central do personagem é a **preocupação/melancolia** ("Grana Curta"). A expressividade é alcançada através dos seguintes detalhes:

* **Olhos "Pie-Eye" (Pac-Man):** Os olhos são grandes ovais brancos. As pupilas pretas possuem um recorte triangular ("fatia de torta"). Ambas as fatias devem apontar para a mesma direção (para o centro ou levemente para cima).
* **Sobrancelhas Flutuantes:** As sobrancelhas não tocam o rosto. Elas flutuam logo acima da moeda, em formato de pequenas "gotas" inclinadas para cima no centro, reforçando o semblante preocupado.
* **Boca Trêmula:** Uma linha única curvada para baixo. Adicione pequenos traços verticais nas extremidades (linhas de expressão de marionete) para dar peso ao rosto caído.
* **O Relevo da Moeda:** As palavras `REPÚBLICA` e `BRASIL` acompanham a curvatura interna da moeda em efeito *debossed* (baixo relevo), usando fontes sans-serif pesadas e geométricas.

---

## 🧵 4. Textura e Acabamento (Efeito Película)

O segredo para o personagem não parecer um vetor digital moderno e limpo está nas imperfeições aplicadas na finalização:

1. **Line Art Orgânica:** Os contornos pretos não devem ser perfeitamente lisos. Use pincéis digitais que simulem o fluxo do **nanquim no papel** (com leves serrilhados ou ranhuras).
2. **Textura de Grão (Noise):** Aplique um overlay de ruído estático sobre o personagem inteiro (entre 3% e 5% de opacidade) para simular grão de filme antigo.
3. **Desalinhamento de Impressão (Bleed):** Deixe a cor amarela do fundo da moeda "vazar" ligeiramente para fora do contorno preto em alguns pontos, simulando um erro de impressão gráfica vintage.

---

## 🏃‍♂️ 5. Matriz de Poses para a Interface (Próximos Assets)

Para expandir o uso do mascote no seu projeto Next.js, utilize o guia abaixo para criar novos estados e telas:

### 🔴 Estado de Erro / Tela 404
* **Ação:** "O dinheiro sumiu".
* **Pose:** O personagem virado de costas para o usuário, puxando os bolsos para fora (ou com as mãos vazias abertas), com um ponto de interrogação flutuando sobre a cabeça.

### 🟡 Estado de Carregamento / Loading
* **Ação:** "Correndo contra a inflação".
* **Pose:** O personagem correndo de perfil, com os braços esticados para trás e as pernas girando em um círculo borrado (efeito clássico de velocidade de animação antiga).

### 🟢 Estado de Sucesso / Confirmação de Pagamento
* **Ação:** "Grana sob controle".
* **Pose:** O personagem abre um sorriso tímido de canto de boca (ainda mantendo a postura contida) e as pupilas em formato de "fatia de torta" se transformam temporariamente no símbolo de Cifrão (`$`).