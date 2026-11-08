# Yin Yang: guia para trabalhar no código

Jogo 2D de ação e plataforma em **Phaser 4.2.1** (carregado por CDN, versão fixa no `index.html`), módulos ES6, sem build.
O plano de refatoração e as próximas etapas estão em [`docs/ROADMAP.md`](docs/ROADMAP.md): leia antes de mexer na estrutura.

## Como rodar

```bash
npm install
npm start          # serve em http://localhost:3000 (precisa de servidor HTTP por causa dos módulos ES6)
npm test           # teste de fumaça (Playwright + Google Chrome do sistema)
npm run lint       # ESLint
npm run format     # Prettier
```

## Estrutura

```
src/
  main.js                  config do Phaser; expõe window.__game para os testes
  core/                    GameState, AudioManager, loadAssets (carrega um manifesto), gameMode (quem joga neste aparelho)
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
  input/                   fontes de entrada (KeyboardInput, TouchInput) que devolvem { left, right, up, down, attack }; fullscreen
  ui/                      Hud
assets/                    sprites, tilesets, mapa (Tiled JSON) e áudio
tests/                     smoke, gameplay, mobile (celular emulado, toque real) e assets (Playwright)
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
6. Em `GameScene`, guarde o array (`this.novos = spawned.novos`) e inclua-o na lista `updatables`.
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
- `solo`: **um jogador por aparelho**, câmera única (padrão em aparelhos de toque; é também a base do co-op online, em que o outro jogador é remoto).
- Dá para forçar na URL: `?mode=solo`, `?mode=local`, e em solo `?character=yang`.

Regras para não quebrar o celular:

- `scene.players` só tem os jogadores **locais**: pode ter 1 ou 2. Nunca use `players[1]` fora do código da tela dividida.
- Toda entrada nova (toque, rede) implementa `read()` e devolve a intenção; o `Player` não sabe de onde ela vem.
- Botões na tela ficam na `TouchControlsScene` (cena própria, para não se mexerem com as câmeras do jogo). Cada botão novo entra em `this.buttons`, que os testes usam para achar a posição.
- Áudio: no celular ele só destrava no primeiro toque; use `audio.playWhenUnlocked()` para música.
- Testes de celular: `tests/mobile.spec.js` usa a emulação "Pixel 7 landscape" e toques reais via CDP (`Fingers`), inclusive com dois dedos.
- Limitação conhecida: o jogo é 4:3 e deixa barras pretas nas laterais de celulares compridos (Etapa 7).
