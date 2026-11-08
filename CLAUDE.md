# Yin Yang: guia para trabalhar no código

Jogo 2D de ação e plataforma em **Phaser 3.21.0** (carregado por CDN no `index.html`), módulos ES6, sem build.
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
  main.js              config do Phaser; expõe window.__game para os testes
  core/                GameState (estado compartilhado), AudioManager
  input/               fontes de entrada (KeyboardInput); devolvem a intenção { left, right, up, down, attack }
  scenes/              StartScene, GameScene, GameOverScene, CreditsScene, sceneKeys.js
  entities/
    player/            Player (id, character, facing; tag sprite.setData("owner"))
    enemies/           Enemy (base com máquina de estados), Slime, Skeleton, Demon
    hazards/           Flamethrower, Spikes
    interactive/       Portal, Jumper, Key, Barrier, JailDoor
  data/levelSpawns.js  jogadores, espinhos, barreiras, chaves, porta e inimigos da fase
assets/                sprites, tilesets, mapa (Tiled JSON) e áudio
tests/                 testes Playwright
```

## Convenções

- Código e nomes de assets em **inglês**; textos de documentação em português.
- Lógica nova vai em **classes** em `src/entities/` ou `src/core/`, nunca direto no `GameScene`.
- Posições e configuração de fase vão em **dados** (`levelSpawns.js`), não espalhadas em `create()`.
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
