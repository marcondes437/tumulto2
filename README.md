# TUMULTO

Jogo de luta de plataforma para o navegador, com até 4 jogadores e multiplayer online.
Os personagens, a arte, o cenário e o código foram feitos do zero. Nada vem de outro jogo.

## Como jogar

Você só precisa do **Node.js** (versão LTS, https://nodejs.org). Não precisa de `npm install`.

| Quero… | Faça |
|---|---|
| Jogar sozinho, contra CPU ou com alguém no mesmo PC | Dê dois cliques em **`iniciar.bat`**. O jogo abre em http://localhost:3000 |
| Jogar com amigos na **mesma rede/Wi-Fi** | Rode `iniciar.bat` e mande para eles `http://SEU-IP-LOCAL:3000` (veja o IP com `ipconfig`) |
| Jogar com amigos **pela internet** | Dê dois cliques em **`jogar-com-amigos.bat`**. Ele instala o `cloudflared` (gratuito) e mostra um link `https://….trycloudflare.com`. Mande esse link aos amigos |

No jogo: **Jogar online com amigos → Criar sala → Copiar convite**. Os amigos abrem o link e entram na sala.
O anfitrião pode adicionar CPUs e escolher o número de vidas.

> O link do `trycloudflare.com` muda toda vez que você abre o arquivo. Para um link fixo, veja "Hospedar 24h" abaixo.

## Controles

| Ação | Jogador 1 | Jogador 2 (mesmo PC) | Controle |
|---|---|---|---|
| Mover / mirar | W A S D | Setas | Analógico / direcional |
| Pular (2 pulos no ar, Lume tem 3) | Espaço | Enter / Num 0 | A / ✕ |
| Ataque leve | J | , / Num 1 | X / □ |
| Ataque pesado (segure no chão p/ carregar) | K | . / Num 2 | B, Y / ○, △ |
| Esquiva | L / Shift | ; / Num 3 | LB, RB, gatilhos |
| Pausa | Esc | | |

* Cada ataque muda conforme a direção: neutro, lado, baixo (e no ar).
* **Cima + pesado** = golpe de recuperação (use para voltar ao palco). **Baixo + pesado no ar** = pancada no chão.
* Quanto mais **%** de dano, mais longe você voa. Saiu da tela, perdeu uma vida.
* Encostou na parede do palco no ar? Aperte pular para escalar.
* **Segure baixo** (ou baixo + pular) para descer das plataformas finas. Baixo no ar = queda rápida, atravessando-as.
* No celular aparecem botões na tela.

## Arenas

| Arena | Clima | Plataformas |
|---|---|---|
| **Templo Congelado** | Noite azul, neve, árvore de copas violeta, lanternas | Bloco de pedra + rocha flutuante + 2 copas atravessáveis |
| **Ilhas Celestiais** | Dia claro sobre o mar de nuvens | Bloco largo + 2 lajes atravessáveis + pilar e bloco altos nas laterais |
| **Arena Cósmica** | Crepúsculo laranja e azul, lua, estrelas cadentes | Ilha-pilar única (com parede para escalar embaixo da borda) |
| **Cidade Neon** | Metrópole noturna, letreiros piscando, holofotes | Topo do letreiro + 2 passarelas atravessáveis |

Escolha a arena antes de lutar (modo local) ou no lobby (o anfitrião escolhe no online).
**F2** mostra colisões e hitboxes. Detalhes em `docs/MAPAS.md`; para trocar a arte por ilustração pintada, `docs/ARTE.md`.

## Lutadores

| | Arma | Estilo |
|---|---|---|
| **Brasa**, a Punhos de Fogo | Manoplas | Rápida, combos curtos, soco-cometa |
| **Tora**, o Lenhador da Montanha | Machado | Pesado, lento, golpes enormes |
| **Lume**, Lanceira da Aurora | Lança | Leve, 3 pulos no ar, maior alcance |
| **Maré**, Capitã das Correntes | Sabre | Equilibrada |

## Publicar na Vercel

A Vercel hospeda a **página** do jogo. O modo **online** precisa do `server.js` ligado o tempo todo
(WebSocket com salas em memória), e isso a Vercel não mantém: as conexões dela caem depois de alguns
minutos e cada jogador pode cair em uma instância diferente. Por isso há dois jeitos:

**Só a página (CPU e 2 jogadores no mesmo PC):**
1. Suba esta pasta para um repositório no GitHub.
2. Em https://vercel.com → **Add New → Project** → importe o repositório.
3. Deixe *Framework Preset* em **Other**. O arquivo `vercel.json` já manda a Vercel publicar a pasta `public`.
4. **Deploy**.

**Página na Vercel + online funcionando:**
1. Publique o servidor no Render (passos em "Hospedar 24h" abaixo). Você recebe algo como `tumulto.onrender.com`.
2. Abra `public/config.js` e coloque: `window.TUMULTO_SERVER = 'tumulto.onrender.com';`
3. Suba a mudança para o GitHub. A Vercel publica de novo sozinha.

Se não quiser dois serviços, use só o Render: ele já entrega a página e o online no mesmo link.

## Hospedar 24h (link fixo e grátis)

1. Crie um repositório no GitHub e suba esta pasta.
2. Em https://render.com, clique em **New → Blueprint** e escolha o repositório (o arquivo `render.yaml` já configura tudo).
   Ou crie um **Web Service** a partir do repositório com estes campos:
   * Build command: (deixe vazio)
   * Start command: `node server.js`
3. Pronto. O Render dá um link `https://….onrender.com` que funciona para todo mundo.
   (No plano grátis, o servidor "dorme" depois de um tempo parado e leva ~30 s para acordar.)

Também funciona em Railway, Fly.io ou qualquer VPS com Node 18+ (a porta vem da variável `PORT`).

## Como funciona por dentro

```
public/config.js  endereço do servidor online, se a página estiver em outro lugar (Vercel)
public/sim.js     motor do jogo: física, arenas (colisões), golpes, knockback, vidas, CPU (60 ticks/s)
public/arena.js   desenha as arenas em camadas com parallax + efeitos animados
public/maps/      arte das arenas (WebP) e manifesto das camadas
public/game.js    cliente: lutadores, câmera, efeitos, som, menus, controles, rede
public/index.html telas e estilos
server.js         servidor HTTP + WebSocket; roda a simulação de cada sala (autoritativo)
ws-mini.js        WebSocket mínimo usando só módulos nativos do Node (sem dependências)
tests/            testes (node --test tests/*.test.js): física das 4 arenas e multiplayer real
tools/            geração da arte das arenas (só para desenvolvedores; precisa de Playwright)
docs/             análise das referências, arenas e guia para trocar a arte
```

Para regerar a arte: `npm i -D playwright && npx playwright install chromium`, depois
`node tools/bake-maps.js` e `node tools/thumbs.js`. Jogar não precisa de nada disso.

A rede é **autoritativa no servidor**. Cada jogador manda só os botões que está apertando,
o servidor roda a luta e devolve o estado 30 vezes por segundo, e o navegador interpola
entre os estados para o movimento ficar liso. Assim ninguém consegue trapacear mexendo no
próprio navegador, e todo mundo vê a mesma luta.
