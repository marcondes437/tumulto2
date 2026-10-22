# Arenas do Tumulto

Este documento traz (1) a análise das quatro imagens de referência, (2) como cada arena original foi
construída a partir delas e (3) como a arena funciona por dentro (física, rede, câmera, camadas).

> As referências foram usadas só para estudar composição, proporção, paleta e iluminação.
> Nenhum pixel, forma ou logotipo das imagens originais está no jogo: toda a arte é gerada por
> código próprio (`tools/art/`). O letreiro "ラーメン RAMEN" da referência virou um letreiro próprio
> ("TUMULTO • ARENA 24H" com um ícone de raio); a árvore, as lanternas, as rochas entalhadas e as
> formações rochosas foram redesenhadas.

---

## 1. Análise individual das referências

Medidas em % da imagem (largura × altura). "Topo" = altura do chão onde se pisa.

### Referência A — cidade cyberpunk com letreiro de lámen (1920×1167)

| Aspecto | Observação |
|---|---|
| Composição | Simétrica. Letreiro gigante no centro, torre treliçada embaixo; prédios enquadram os lados. |
| Plataformas | 3: palco principal (topo do letreiro) + 2 superiores atravessáveis. |
| Posição | Principal: 32–68 % da largura, topo a 57 % da altura. Superiores: 33–44 % e 56–67 %, topo a 41 %. |
| Proporções | Principal ≈ 37 % da largura da tela; superiores ≈ 30 % do principal cada. Personagem ≈ 7 % da altura. |
| Área jogável | Faixa central; tudo acima do letreiro até ~35 % da altura. |
| Decoração | Arranha-céus, letreiros verticais, anel holográfico, emblema circular, linhas de dados no céu, holofotes, andaimes. |
| Paleta | Índigo, violeta, ciano e magenta no fundo; amarelo/laranja/vermelho saturados no foco (letreiro). |
| Profundidade | 4–5 planos; névoa ciano aumenta com a distância. |
| Frente × fundo | Palco quente e muito saturado contra fundo frio e enevoado. Contorno escuro nas plataformas. |
| Iluminação | Emissiva (neon), sem sol; brilho difuso de cidade no horizonte. |

### Referência B — templo nevado com árvore (1200×675)

| Aspecto | Observação |
|---|---|
| Composição | Bloco de pedra no centro; árvore estilizada sai de trás dele à esquerda; rocha flutuante à direita. |
| Plataformas | Bloco principal (sólido), rocha flutuante (sólida), 2 copas atravessáveis (galhos). |
| Posição | Bloco: 35–71 % da largura, topo a 62 %. Copa baixa à esquerda a 51 %, copa central a 39 %. Rocha: 75–86 %, topo a 41 %. |
| Proporções | Bloco ≈ 36 % da largura; rocha ≈ 1/3 do bloco. Copas superiores da árvore são só decoração. |
| Decoração | Lanternas de pedra, pagode distante com luzes, montanhas, névoa, estrelas. |
| Paleta | Azul-marinho, ciano, branco-neve; violeta/rosa só na parte de baixo das copas. |
| Profundidade | Céu → montanhas → pagode/névoa → palco; névoa clara separa planos. |
| Frente × fundo | Palco com contorno escuro e contraste alto; fundo de baixo contraste. |
| Iluminação | Luar suave e frio; luz quente-ciano pontual nas lanternas. |

### Referência C — ilhas no céu com lajes de pedra entalhada (1200×674)

| Aspecto | Observação |
|---|---|
| Composição | Bloco principal largo embaixo; duas lajes acima formando um "V"; pilar alto à esquerda; bloco alto à direita. |
| Plataformas | 3 sólidos (principal, pilar, bloco direito) + 2 lajes superiores. |
| Posição | Principal: 28–75 %, topo a 59 %. Lajes: 33–71 %, topo a 31 %. Pilar: 13–25 %, topo a 19 %. Bloco direito: 78–89 %, topo a 6 %. |
| Decoração | Nuvens enormes pintadas, penhasco com farol e casas, ilhas distantes, rochas flutuantes, vale nevado. |
| Paleta | Azul-céu, branco com sombras lilás, verde-lima, cinza-chumbo. |
| Profundidade | Mar de nuvens embaixo e na frente separa o palco do cenário. |
| Iluminação | Dia claro, luz do alto à esquerda. |

### Referência D — pilar de pedra diante de formações rochosas (1920×1080)

| Aspecto | Observação |
|---|---|
| Composição | Uma única ilha cilíndrica centralizada; formações rochosas com casas, torres e cachoeiras atrás. |
| Plataformas | 1 (principal), sem plataformas extras. |
| Posição | Principal: 23–68 % da largura, topo a 55 %. Pilar mais estreito embaixo. |
| Paleta | Verde-menta, areia, azul-céu claro (dia). |
| Iluminação | Dia difuso. |

**Observação:** o pedido do "Mapa 3 — Arena Cósmica" descreve crepúsculo laranja×azul, lua, estrelas e
iluminação dramática, enquanto a referência D é diurna. Mantive **a composição e a escala** da referência D
(pilar central único, formações rochosas com casas/torres/cachoeiras) e apliquei **a atmosfera do texto**
(crepúsculo, lua, planeta anelado, luz de borda laranja vinda de trás).

---

## 2. As quatro arenas

Unidades do mundo: um lutador tem ~90 de altura. `y` cresce para baixo; topo do palco principal = 0.

| Arena | Sólidos (l, r, topo, base) | Semissólidas (l, r, topo) | Limites de eliminação |
|---|---|---|---|
| **Templo Congelado** | bloco −350…350, 0…210 · rocha flutuante 450…640, −235…−20 · rocha sob o bloco −280…280, 210…330 | copa esquerda −545…−305 em −125 · copa central −115…115 em −255 | x ±1350, y −1050…800 |
| **Ilhas Celestiais** | principal −450…450, 0…300 · pilar −725…−530, −420…−40 · bloco direito 515…720, −565…−330 | laje −360…−18 e laje 18…360, ambas em −290 | x ±1400, y −1150…850 |
| **Arena Cósmica** | borda −440…440, 0…70 · pilar −300…300, 70…680 | — | x ±1300, y −1050…820 |
| **Cidade Neon** | letreiro −405…405, 0…340 | passarela −360…−140 e 140…360, ambas em −205 | x ±1300, y −1050…820 |

Pontos de início (4 vagas) e de reaparecimento estão em `public/sim.js` (`STAGES`). Os inícios são
espelhados em todas as arenas, exceto no Templo, onde a 4ª vaga fica sobre a rocha flutuante (assimetria
da própria referência).

O que cada arena tem de animado:

* **Templo:** neve em duas profundidades, estrelas cintilando, névoa deslizando, brilho pulsante das lanternas e das copas.
* **Ilhas:** mar de nuvens deslizando atrás e na frente, bandos de pássaros.
* **Cósmica:** estrelas cintilando, estrelas cadentes, brasas subindo, névoa rosada deslizando, runas do pilar pulsando.
* **Neon:** letreiro e tubos piscando (duas camadas com ritmos diferentes), holofotes varrendo o céu, tráfego aéreo, luzes de antena.

---

## 3. Como funciona por dentro

### Física separada da arte
A colisão vem só de `Sim.STAGES` (sim.js), nunca da imagem. A arte foi desenhada **em cima das
coordenadas da colisão** (o pintor lê `Sim.STAGES` e pinta o topo da neve/grama/metal exatamente no `topo`
de cada bloco), por isso ficam alinhadas. Para conferir no jogo: **F2** (ou `?debug=1` na URL) mostra
sólidos (vermelho), semissólidas (ciano), inícios/reaparecimentos (amarelo), limites de eliminação (rosa),
caixa da câmera (verde), corpo dos lutadores e hitboxes ativas.

Decoração (árvore, lanternas, andaimes, torre treliçada, pontas de rocha) é só imagem: não bloqueia nada.

### Plataformas
* **Sólidos:** chão, paredes laterais (com deslizamento e pulo na parede) e teto (bate a cabeça embaixo).
* **Semissólidas:** atravessa-se de baixo para cima; para descer, **segure baixo** (5 quadros) ou **baixo + pular**;
  **segurar baixo no ar** faz queda rápida e atravessa essas plataformas.

### Câmera
Cada arena define uma caixa que a câmera sempre enquadra e um zoom mínimo/máximo. A câmera segue
todos os lutadores vivos, com amortecimento, e a arte de fundo se move em parallax conforme ela anda e dá zoom.

### Multiplayer
O anfitrião escolhe a arena no lobby (`{t:'stage'}`); o servidor valida o nome, guarda na sala, avisa todos
e cria a simulação com essa arena. Toda a física e os acertos rodam **no servidor**; cada estado enviado
(`s.m`) carrega a arena, então quem está assistindo também troca de cenário sozinho.

### Telas de outros formatos
O mundo usa escala uniforme (`min(largura/1280, altura/720)`) — nunca estica. As camadas de fundo
"cobrem" a tela como `object-fit: cover`, recortando as sobras em telas 4:3, 21:9 ou de celular.

### Camadas de arte (`public/maps/<arena>/`)
| Tipo | Exemplo | Como é desenhado |
|---|---|---|
| `screen` | `sky`, `far`, `mid` | 2560×1440, cobre a tela, parallax pequeno (céu) a médio (prédios próximos) |
| `screen` + `scroll` | `fog`, `clouds`, `mist` | repete na horizontal e desliza devagar |
| `world` | `stage` | preso às coordenadas do mundo, 2 px por unidade |
| `world` + `blend: lighter` + `anim` | `glow` | brilho somado, pulsando ou piscando |
| `front: true` | `fogfront`, `cloudsfront` | desenhado na frente dos lutadores, só na faixa de baixo |
| `fx` | `snow`, `searchlights`… | efeito procedural animado (em `public/arena.js`) |

O manifesto gerado (`public/maps/manifest.js`) diz a posição, o parallax e a ordem de cada camada.
