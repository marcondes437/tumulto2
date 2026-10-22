# Arte das arenas: o que existe e como trocar por ilustração pintada à mão

## O que está no jogo agora

Este ambiente não tem gerador de imagens. Por isso a arte das arenas foi **pintada por código**
(`tools/art/*.js`) e **assada** em imagens WebP (`node tools/bake-maps.js`). Não é um desenho simples
em Canvas feito a cada quadro: são camadas de 2560×1440 (fundos) e de 2 px por unidade do mundo (palcos),
com gradientes, ruído de textura, pinceladas, desfoque atmosférico, luz de borda e brilhos.

Sendo honesto sobre o limite: o resultado é convincente e coerente com as referências em composição,
paleta e profundidade, mas **não tem o nível de detalhe de uma ilustração profissional pintada à mão**
(pinceladas intencionais, rochas com forma desenhada uma a uma, folhagem orgânica). Para chegar nesse
nível, troque as camadas abaixo por arte pintada — o jogo não precisa de nenhuma outra mudança.

## Como trocar uma camada

1. Pinte a imagem **com exatamente o mesmo tamanho em pixels** e exporte com o mesmo nome, em formato
   WebP (com transparência onde houver).
2. Substitua o arquivo em `public/maps/<arena>/`.
3. Recarregue o jogo. Aperte **F2** para ver as colisões por cima e conferir o alinhamento.

Regras para não quebrar o jogo:

* **Camadas `stage.webp`** (presas ao mundo): o topo de cada plataforma tem que estar **na mesma linha**
  da colisão. Use a imagem atual como guia (abra como camada de baixo no Photoshop/Krita) e pinte por cima.
  Escala: 2 px por unidade do mundo; o canto superior esquerdo da imagem é o ponto (x, y) indicado abaixo.
* Nada pintado no `stage.webp` pode parecer chão onde não há colisão (ex.: copas decorativas devem ter
  forma arredondada, não topo plano).
* **Camadas de fundo** (2560×1440): o centro da imagem é o centro da tela; as bordas (~5 % a 25 % conforme
  o parallax) só aparecem quando a câmera se move. Mantenha o assunto principal no centro.
* **Camadas que deslizam** (`fog`, `clouds`, `mist`, `*front`) precisam **emendar na horizontal**
  (a borda direita continua na esquerda).
* **`glow.webp`/`glow2.webp`** são somadas (modo "lighter"): fundo preto/transparente, só a luz.

## Lista de recursos por arena

Coordenadas do mundo; tamanho em pixels.

### Templo Congelado (`public/maps/templo/`)
| Arquivo | Tamanho | Conteúdo pedido |
|---|---|---|
| `sky.webp` | 2560×1440 | Céu noturno azul-marinho → ciano no horizonte, estrelas, aurora discreta |
| `far.webp` | 2560×1440 | Duas cordilheiras azuladas com neve no topo, névoa ciano na base |
| `mid.webp` | 2560×1440 | Pagode de três andares com luzes à esquerda, penhascos nas bordas, rochas flutuantes ao longe |
| `fog.webp` | 2560×1440, emenda horizontal | Faixas de névoa clara na parte de baixo |
| `stage.webp` | 3240×2520, canto (−800, −660) | Bloco de cantaria com neve, rocha sob o bloco, rocha flutuante, árvore com copas azul/violeta, 2 lanternas de pedra |
| `glow.webp` | 1620×1260 (1 px/unid.), canto (−800, −660) | Brilho das lanternas e das copas |
| `fogfront.webp` | 2560×1440, emenda horizontal | Névoa baixa na frente |

### Ilhas Celestiais (`public/maps/ilhas/`)
| Arquivo | Tamanho | Conteúdo pedido |
|---|---|---|
| `sky.webp` | 2560×1440 | Céu claro, grandes nuvens cúmulo com sombra lilás |
| `far.webp` | 2560×1440 | Vale nevado lilás à direita, ilhas distantes pálidas |
| `mid.webp` | 2560×1440 | Penhasco gramado com farol e casas (esq.), terra baixa (dir.), rochas flutuantes |
| `clouds.webp` | 2560×1440, emenda horizontal | Mar de nuvens embaixo |
| `stage.webp` | 3200×2360, canto (−800, −660) | Blocos de pedra escura entalhada (espirais, meandros, triângulos) com grama lima e trepadeiras |
| `cloudsfront.webp` | 2560×1440, emenda horizontal | Nuvens baixas na frente |

### Arena Cósmica (`public/maps/cosmica/`)
| Arquivo | Tamanho | Conteúdo pedido |
|---|---|---|
| `sky.webp` | 2560×1440 | Crepúsculo índigo → laranja, estrelas, lua grande, planeta anelado, raios |
| `far.webp` | 2560×1440 | Silhuetas de montanhas com luz de borda laranja |
| `mid.webp` | 2560×1440 | Formações rochosas com casas escavadas, torres com ameias, cachoeiras luminosas, cristais |
| `mist.webp` | 2560×1440, emenda horizontal | Névoa rosada |
| `stage.webp` | 2480×2080, canto (−620, −260) | Ilha-pilar cilíndrica com borda gramada, janelas-runa ciano |
| `glow.webp` | 1240×1040, canto (−620, −260) | Brilho das runas e luz quente na borda |
| `mistfront.webp` | 2560×1440, emenda horizontal | Névoa baixa na frente |

### Cidade Neon (`public/maps/neon/`)
| Arquivo | Tamanho | Conteúdo pedido |
|---|---|---|
| `sky.webp` | 2560×1440 | Céu noturno violeta, linhas de dados, brilho ciano da cidade |
| `far.webp` | 2560×1440 | Megatorres enevoadas, emblema holográfico central |
| `mid.webp` | 2560×1440 | Prédios com janelas, letreiros verticais (HOTEL, BAR, ARCADE, 24H), anel holográfico |
| `near.webp` | 2560×1440 | Prédios escuros nas bordas com varandas e letreiros |
| `stage.webp` | 2240×2360, canto (−560, −330) | Letreiro "TUMULTO" com moldura de neon, torre treliçada, passarelas e andaimes |
| `glow.webp` / `glow2.webp` | 1120×1180, canto (−560, −330) | Brilho do neon (a 2ª camada pisca em outro ritmo) |

## Sugestão de briefing para um artista ou gerador de imagens

> Pintura digital 2D cartunesca para jogo de luta de plataforma, contornos escuros nas plataformas
> jogáveis, fundo com perspectiva atmosférica e baixo contraste, iluminação [luar ciano / dia claro /
> crepúsculo com luz de borda laranja / neon]. Camada isolada com fundo transparente, [tamanho] px,
> seguindo exatamente a silhueta da imagem-guia anexada (não alterar a altura dos topos das plataformas).

Depois de trocar arquivos, rode `node tools/thumbs.js` para atualizar as miniaturas do lobby
(precisa de Playwright; é opcional).
