# Yin Yang: guia para trabalhar no código

Jogo 2D de ação e plataforma em **Phaser 4.2.1** (carregado por CDN, versão fixa no `index.html`), módulos ES6, sem build.
O plano de refatoração e as próximas etapas estão em [`docs/ROADMAP.md`](docs/ROADMAP.md): leia antes de mexer na estrutura.

## Como rodar

```bash
npm install
npm start          # serve em http://localhost:3000 (precisa de servidor HTTP por causa dos módulos ES6)
npm test           # teste de fumaça (Playwright + Google Chrome do sistema)
npm run lint       # ESLint
npm run relay      # servidor de repasse do modo online em Node (ws://localhost:8787); os testes já o sobem sozinhos
npm run build:site  # monta dist/ (o site que o Worker serve: página, src/ e assets/)
npm run worker:dev # o Worker (site + salas), local, em http://localhost:8788/?online=host&relay=same
npm run test:worker        # o contrato do servidor contra o Worker
npm run test:online-worker # o jogo online inteiro passando pelo Worker
npm run deploy             # monta o site e publica o Worker (que serve o site e as salas); passo a passo e chaves em worker/DEPLOY.md
npm run format     # Prettier
```

## Estrutura

```
src/
  main.js                  config do Phaser; expõe window.__game para os testes
  core/                    GameState (estado em JSON + eventos), gameEvents, EventBus, AudioManager,
                           loadAssets (carrega um manifesto), gameMode (quem joga neste aparelho)
  data/
    assets.js              manifesto: todo asset do jogo (imagens, spritesheets, mapa, áudio) e GAME_SOUNDS
    levelSpawns.js         jogadores, espinhos, barreiras, chaves, porta e inimigos da fase
    playerAnimations.js    tabela das animações dos jogadores
  scenes/                  PreloadScene (carrega tudo), StartScene, GameScene, GameOverScene, CreditsScene,
                           TouchControlsScene (botões na tela, só em aparelhos de toque)
  level/                   LevelMap (camadas do Tiled), EntityGroups (grupos de física),
                           spawnLevel (cria inimigos e objetos), cameras (tela dividida e câmera única)
  entities/
    player/                Player (id, character, facing; tag sprite.setData("owner")), playerAnimations
    enemies/               Enemy (base com máquina de estados), Slime, Skeleton, Demon
    hazards/               Flamethrower, Spikes
    interactive/           Portal, Jumper, Key, Barrier, JailDoor
  net/                     co-op online: protocolo, Transport, WebSocketTransport, RoomCore (regras da sala),
                           snapshotDelta (envios pequenos), HostSession, GuestSession, connectOnline, config
  sim/                     base do online: EntityRegistry (ids estáveis), snapshot (foto do jogo em JSON),
                           spriteState, FixedStepper (lógica em passos de 1/60 s)
  input/                   fontes de entrada (KeyboardInput, TouchInput, NetworkInput) que devolvem { left, right, up, down, attack }; fullscreen
  ui/                      Hud, OnlineStatus (sala e quem está conectado)
server/                    relay.js: servidor de repasse em Node (usa net/RoomCore.js)
scripts/                   build-site.mjs: monta dist/ (gerada, fora do git) para o Worker servir
worker/                    o mesmo servidor como Cloudflare Worker + Durable Object (DEPLOY.md: como publicar; README.md: como funciona)
assets/                    sprites, tilesets, mapa (Tiled JSON) e áudio
tests/                     smoke, gameplay, groups, mobile (celular emulado, toque real), simulation, unit, audio,
                           net, security, turnstile, site, relay, relay-worker*, site-worker, online (duas páginas jogando juntas), online-turnstile, online-same-origin e assets (Playwright)
```

## Convenções

- Código e nomes de assets em **inglês**; textos de documentação em português.
- Lógica nova vai em **classes** em `src/entities/`, `src/level/`, `src/ui/` ou `src/core/`, nunca direto no `GameScene`: ele só liga as peças (hoje tem ~100 linhas e deve continuar assim).
- Posições e configuração de fase vão em **dados** (`levelSpawns.js`); assets vão no manifesto (`assets.js`); animações dos jogadores na tabela (`playerAnimations.js`). Nada disso é escrito direto em `create()`.
- A **ordem de criação é a ordem de desenho** (ver `LevelMap`): ao mover a criação de algo, confira o que fica na frente de quê.
- Nada de variáveis globais nem `export` de variáveis mutáveis entre módulos.
- Nunca assumir dois jogadores: use `scene.players` (array de `Player`). Inimigos escolhem o jogador mais próximo (`playersNearestFirst()`, `closestPlayer()` em `Enemy`). Objetos que reagem a jogadores expõem `bindPlayers(players)`.
- O `Player` nunca lê teclado: recebe uma fonte de entrada (`input.read()` devolve a intenção do frame). Toque e rede devem implementar o mesmo `read()`.
- `Player` e `Enemy` são máquinas de estados (`free`, `attack`, `hurt`, `die`). O fim de uma animação é conferido no `update()` com `isAnimFinished()`, não com o evento `animationcomplete`: o evento muda o tempo do dano (ver `docs/ROADMAP.md`, Etapa 2).
- Para criar um inimigo novo, estenda `Enemy` e implemente `updateFree()` e os ganchos `onHurtFrame`, `onHurtFinished`, `onAttackFrame`, `onAttackFinished`, `onDeathFinished`.
- Mudanças pequenas, um commit por passo, com `npm test` e `npm run lint` passando.
- **Commits seguem Conventional Commits**, em inglês: `<tipo>(escopo opcional): descrição`, com tipo `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`, `build`, `ci` ou `revert`. Um hook do Husky (`commit-msg` + commitlint) rejeita mensagens fora do padrão; não use `--no-verify`. **Não adicione `Co-Authored-By`** (nem a IA como coautora): o mesmo hook rejeita mensagens com essa linha.

## Antes de dar uma tarefa por concluída

1. `npm test` passa (o jogo carrega e a fase roda sem erro no console).
2. `npm run lint` não tem erros novos.
3. Para mudanças de comportamento, confira no navegador (as fases têm chefes, portais e chaves que o teste de fumaça não exercita).

## Mapa de coordenadas úteis (fase 1)

- Posição padrão após teleportes: `1312, 1440`
- Do quarto escondido para o easter egg: `1744, 2573`
- Dos portais para o chefe 1: `96, 3616`; para o chefe 2: `4000, 3616`

## Como adicionar um asset

1. Coloque o arquivo em `assets/`.
2. Acrescente uma linha em `src/data/assets.js` (`images`, `spritesheets`, `tilemaps` ou `audio`).
3. `npm test`: `tests/assets.spec.js` falha se o caminho não existir ou se a chave se repetir.

Se for um som que a fase usa, acrescente também em `GAME_SOUNDS` (nome usado no código → chave do asset) e use `this.audio.get("nome")`.

## Como adicionar um inimigo

1. Coloque os spritesheets em `assets/` e registre-os em `src/data/assets.js`.
2. Crie `src/entities/enemies/NovoInimigo.js` estendendo `Enemy` (copie `Slime.js` como modelo): constante `ANIM_KEYS`, função `createAnimations` (com guarda para criar uma vez), construtor que cria o sprite, faz `group.add(this.sprite)` e `this.sprite.setData("owner", this)`.
3. Implemente `updateFree()` (patrulha e perseguição, usando `playersNearestFirst()` ou `closestPlayer()`), `handlePlayerHit(player)` e os ganchos que precisar (`onHurtFrame`, `onHurtFinished`, `onAttackFrame`, `onAttackFinished`, `onDeathFinished`).
4. Em `src/level/EntityGroups.js`, crie o grupo de física do inimigo e inclua-o na lista de inimigos que andam no chão e machucam jogadores.
5. Em `src/level/spawnLevel.js`, crie as instâncias a partir de uma nova lista em `src/data/levelSpawns.js`, e devolva o array.
6. Em `GameScene`, guarde o array (`this.novos = spawned.novos`) e inclua-o na lista `updatables`. O `spawnLevel` já registra o inimigo no `EntityRegistry` (id `novo-0`, `novo-1`, ...) e o `Enemy` já sabe se salvar e restaurar; só acrescente em `getState()`/`setState()` o que for específico dele.
7. Acrescente um teste em `tests/gameplay.spec.js` (ferido volta ao estado livre, morte, dano ao jogador).

## Como adicionar uma fase

Hoje existe só a fase 1 (`level1`). Para uma segunda fase:

1. Exporte o mapa do Tiled para `assets/environment/` e registre-o em `tilemaps` no manifesto, com os tilesets em `images`.
2. Ajuste `src/level/LevelMap.js` (listas de camadas e tilesets) para os nomes do novo mapa. Hoje essas listas descrevem a fase 1; o ideal é recebê-las por fase.
3. Crie as posições da fase em `src/data/` no formato de `levelSpawns.js` (hoje `LEVEL_SPAWNS` é único) e faça a `GameScene` escolher os dados pela fase.
4. Crie o caminho que leva da fase 1 à 2 (hoje a porta da cela leva aos créditos) e um teste para ele.

## Phaser 4: o que mudou em relação ao que se encontra em tutoriais antigos

O projeto foi migrado da 3.21 para a 4.2.1. Muito material na internet ainda mostra a API antiga. Já pegamos:

- `anims.getCurrentKey()` agora é `anims.getName()` (devolve `""`, não `undefined`, quando não há animação).
- `map.createStaticLayer()` e `createDynamicLayer()` viraram `map.createLayer()`.
- O guia oficial de migração está no pacote npm (`phaser/changelog/v4/4.0/MIGRATION-GUIDE.md`): lá constam também tint (`setTintFill` virou `setTintMode`), `Geom.Point` (agora `Vector2`), `Math.TAU` (agora PI * 2) e o `roundPixels` (agora `false` por padrão).

Ao atualizar a versão do Phaser: troque o número em `index.html` e aqui, rode `npm test` e compare capturas de tela antes e depois, porque o renderizador pode mudar a aparência sem quebrar nenhum teste.

## Modos de jogo e celular

Quem joga neste aparelho é decidido por `resolveGameMode()` (`src/core/gameMode.js`):

- `local`: dois jogadores no mesmo teclado, tela dividida (padrão no desktop).
- `solo`: **um jogador por aparelho**, câmera única (padrão em aparelhos de toque).
- `online`: co-op em dois aparelhos (ver a seção abaixo). `?online=host` ou `?online=join&room=ABCD`.
- Dá para forçar na URL: `?mode=solo`, `?mode=local`, e em solo `?character=yang`.

Regras para não quebrar o celular:

- `scene.players` tem os jogadores **em jogo neste aparelho**: 1 (solo), 2 (local) ou, online, o jogador local **mais** o remoto. Use `scene.localPlayer` para o jogador deste aparelho (a câmera o segue) e nunca `players[1]` fora do código da tela dividida. Um jogador pode estar escondido (`sprite.active === false`, o amigo ainda não conectou): filtre por isso (`Enemy.activePlayers()`).
- Toda entrada nova (toque, rede) implementa `read()` e devolve a intenção; o `Player` não sabe de onde ela vem.
- Botões na tela ficam na `TouchControlsScene` (cena própria, para não se mexerem com as câmeras do jogo). Cada botão novo entra em `this.buttons`, que os testes usam para achar a posição.
- Áudio: no celular ele só destrava no primeiro toque; use `audio.playWhenUnlocked()` para música.
- Testes de celular: `tests/mobile.spec.js` usa a emulação "Pixel 7 landscape" e toques reais via CDP (`Fingers`), inclusive com dois dedos.
- Limitação conhecida: o jogo é 4:3 e deixa barras pretas nas laterais de celulares compridos (Etapa 7).

## Simulação: a base do co-op online

O online vai funcionar assim: o host simula tudo e manda uma foto do jogo; o convidado só desenha a foto. Para isso:

- **O estado do jogo muda só por métodos** de `GameState` (`loseSoul`, `collectKey`, `useKey`, `defeatBoss`, `gameOver`, `endGame`), que avisam o que aconteceu em `state.events` (lista e dados em `src/core/gameEvents.js`). Nunca escreva `state.soulCount -= n` direto. Quem quiser reagir (som, HUD, rede) escuta o evento, sem o código que o causa saber de nada.
- **Toda entidade com estado tem id estável** (`slime-3`, `key-1`, `player-yin`), dado por `scene.entities.add(tipo, entidade)` pela ordem em `src/data/levelSpawns.js`. Não reordene essas listas sem necessidade: dois aparelhos precisam da mesma versão do jogo para terem os mesmos ids.
- **Quem tem estado implementa `getState()` e `setState(estado)`** com JSON puro (números, textos, booleanos; nada de sprites ou funções). Use `getSpriteState`/`applySpriteState` (`src/sim/spriteState.js`) para a parte comum.
- **`takeSnapshot(scene)` e `applySnapshot(scene, snapshot)`** (`src/sim/snapshot.js`) tiram e devolvem a foto. Uma fase inteira tem ~17 KB.
- **A lógica roda em passos fixos de 1/60 s** (`GameScene.simulate()` via `FixedStepper`), não a cada quadro. Código de jogo vai no `update()` das entidades; o que é só de tela (HUD, câmera) fica fora do `simulate()`. Com a máquina lenta ele roda até 5 passos por quadro e descarta o resto.
- **Armadilha do Phaser (tempo):** nos primeiros 120 quadros depois de iniciar (e sempre que a janela perde o foco) o Phaser limita o `delta` a 1/60 s, então o jogo anda em câmera lenta se a tela estiver abaixo de 60 quadros. Depois disso entrega o tempo real. Em testes que medem tempo, espere `window.__game.loop.frame > 220` antes.
- **Armadilha do Phaser (grupos):** `group.add(sprite)` reaplica os padrões do grupo e **zera velocidade, `collideWorldBounds` e `immovable`**. Adicione o sprite ao grupo **antes** de configurá-lo (isso já causou inimigos parados e lança-chamas empurráveis).

## Co-op online

Dois aparelhos, um servidor de repasse no meio. O **anfitrião** (`?online=host`) roda o jogo inteiro e joga de Yin; o **convidado** (`?online=join&room=ABCD`) não roda nada: manda o que está apertando e desenha o que o anfitrião manda, jogando de Yang. O anfitrião abre a sala, toca no texto no topo para compartilhar o link, e o amigo entra pelo link. O código da sala (6 caracteres, letras e dígitos sem I, L, O, 0, 1, gerado com `crypto.getRandomValues`) se mantém enquanto a página estiver aberta.

Como funciona (`src/net`):

- `HostSession`: o Yang é um `Player` com `NetworkInput`, movido pela intenção que o convidado manda (1 número por mensagem). A cada 3 passos (20 vezes por segundo) manda um snapshot **só com o que mudou** (`snapshotDelta`; o ponto da animação só vai quando a animação troca); um completo quando o amigo entra e a cada 5 s. Repassa os sons (`audio.events`). Ao sair, manda como a partida acabou (`end`).
- `GuestSession`: aplica os snapshots com `setState(estado, { position: false, progress: false })` e faz as entidades deslizarem até a posição nova (`glide`), então o movimento fica suave. A física do convidado fica pausada; `GameScene.update` só chama `session.update`.
- `RoomCore` (`src/net/RoomCore.js`) são as regras da sala (primeiro é anfitrião, segundo é convidado, terceiro é recusado, o que é repassado). É usada pelo `server/relay.js` (Node) e pelo Durable Object da Cloudflare (`worker/src/Room.js`). As duas implementações passam pelo **mesmo contrato de testes** (`tests/helpers/relayContract.js`); ao mudar uma regra da sala, rode `npm test` (que roda os dois).
- Para saber se os dois têm a mesma versão, cada lado manda `hello` com uma impressão digital dos ids das entidades (`hashIds`). Diferentes: o jogo avisa e para.
- Servidor e Turnstile: `src/net/config.js`. Em localhost o servidor é `ws://localhost:8787` (`npm run relay`); em qualquer outro endereço é **o mesmo endereço da página** (o Worker serve o jogo e as salas juntos), então `PRODUCTION_RELAY_URL` fica `null`; `TURNSTILE_SITE_KEY` fica vazia até publicar (passo a passo em `worker/DEPLOY.md`). Na URL: `?relay=ws://...` troca o servidor, `?relay=same` usa o endereço da página, `?turnstileKey=...` troca a chave do Turnstile.

Regras:

- Mensagens novas entram em `src/net/protocol.js` (documentadas no topo do arquivo) e, se o servidor deve repassá-las, na lista `GAME_MESSAGES`.
- Qualquer coisa que o convidado precisa ver tem de estar em `getState()`; qualquer som que ele precisa ouvir tem de passar por `audio.play()` (não por `audio.get(...).play()`).
- Testes online: `tests/online.spec.js` abre duas páginas (dois contextos do Chrome) contra o relay local. Use códigos de sala válidos nos testes e um diferente por teste.
- O Durable Object **hiberna** quando a sala fica em silêncio (o anfitrião esperando o amigo): a memória some e o `RoomCore` é reconstruído a partir dos sockets (cada um guarda papel e sala em `serializeAttachment`). Não guarde estado da sala só em variáveis do objeto.
- Não confie em o servidor fechar a conexão de **outro** socket (no `wrangler dev` ela fica pela metade): o cliente se desconecta sozinho ao receber `peer-left` sendo convidado (`WebSocketTransport`).
- Limitações conhecidas: o convidado sente o atraso da rede entre apertar e ver o personagem mexer (sem previsão no cliente); sem reconexão; sem pausa online; o convidado é sempre o Yang; ainda não há botão de "jogar online" na tela inicial, só a URL.

### Segurança do servidor online (não afrouxe sem entender)

O plano gratuito da Cloudflare tem limites diários (100 mil requisições, 13 mil GB-s de duração); ao estourar, o online
fica fora do ar até as 00:00 UTC. As defesas, da mais barata para a mais cara, estão em `worker/src/guards.js` e
`src/net/RoomCore.js`; a tabela do que cada uma cobre está em `worker/DEPLOY.md`. Regras para quem mexer:

- **Segredos nunca vão para o git:** a Secret Key do Turnstile só existe como `wrangler secret` (e, para testes locais, em
  `worker/.dev.vars`, que o git ignora). A Site Key é pública e fica em `src/net/config.js`.
- Recuse o mais cedo e o mais barato possível; a verificação do Turnstile (chamada de rede) é sempre a última.
- Entrar numa sala nunca cria sala: o cliente pede o papel (`?role=`), e o servidor confere.
- Quem é expulso (`RoomCore.expel`) sai da sala **na hora**; não dependa de o servidor conseguir fechar a conexão.
- O que muda o comportamento do servidor tem de passar pelo contrato de testes (`tests/helpers/relayContract.js`) nos dois
  servidores, e as recusas novas ganham teste em `tests/security.spec.js` (puro) ou `tests/relay-worker-strict.spec.js`.
- As chaves **de teste** do Turnstile (`1x00000000000000000000BB` e as secretas `1x…AA` / `2x…AA`) são as únicas que entram no
  repositório; elas funcionam em qualquer domínio e a secreta `1x…AA` aprova **qualquer** token.

### O site e o servidor são um Worker só

O mesmo Worker serve o jogo (`dist/`) e as salas. Consequências:

- **Mudou algo em `src/`, `assets/`, `index.html` ou `main.css`? Só chega às pessoas com `npm run deploy`** (ele monta `dist/` e publica).
- `dist/` é gerada e não vai para o git. `scripts/build-site.mjs` copia só a página, o estilo, `src/` e `assets/`, confere os limites do plano
  gratuito (20 mil arquivos, 25 MiB cada) e `tests/site.spec.js` garante que nenhum import nem arquivo do manifesto de assets fique de fora.
- Arquivo novo na raiz que o jogo precise (por exemplo uma fonte) tem de entrar na lista `INCLUDED` do script, senão não é publicado.
- Arquivos estáticos que existem em `dist/` são servidos **sem rodar o Worker**; o que não é arquivo (`/room/...`, `/health`) vai ao Worker.
  Por isso o Worker nunca deve depender de interceptar um caminho de arquivo.
- `ALLOWED_ORIGINS` vale `"self"` por padrão (só a página do próprio Worker); instâncias de teste usam `--var ALLOWED_ORIGINS:*`.
