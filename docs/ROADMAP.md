# Yin Yang: plano de melhorias e refatoração

2026-11-08

## Contexto e diagnóstico

A refatoração recente organizou o projeto em pastas e classes, mas três problemas ainda travam o crescimento do jogo, o modo mobile e o co-op online.

O Yin Yang é um jogo 2D de ação e plataforma em Phaser 3, feito em módulos ES6 sem build. Hoje ele é local, para dois jogadores na mesma tela, com câmera dividida e uma barra de vida compartilhada. Os últimos cinco commits da branch `develop` (ainda fora do `master`) criaram as classes `Player`, `Enemy`, `GameState` e `AudioManager`, consolidaram os colliders em grupos de física e moveram os dados de spawn para `levelSpawns.js`.

**Problemas que restam**

1. **Dois jogadores fixos.** `player`, `player2`, `playerPosition` e `player2Position` são variáveis globais exportadas do `GameScene` e importadas pelos inimigos, o que cria dependência circular. O `Slime` tem um bloco de `if` para o jogador 1 e uma cópia idêntica para o jogador 2. O prefixo `yin`/`yang` está escrito direto em `handlePlayerHit`. Os callbacks de chaves, barreiras e porta existem em duas cópias.
2. **`Player.update()` com cerca de 25 `else if` encadeados.** Ele mistura ler tecla, mexer na física e tocar animação. Um jogador remoto ou um toque na tela não consegue usar essa lógica, porque ela depende de teclas.
3. **`GameScene` com 854 linhas.** O arquivo carrega assets, cria cerca de 20 animações de mão, posiciona espinhos e chaves à mão, configura colisões e confere o estado das animações a cada frame.

**Outras pendências:** o `package.json` ainda é o template do CodeSandbox, não há lint nem testes, o `indexbackup.html` (974 linhas) é um resto da versão anterior e o código usa `createStaticLayer`, que só existe no Phaser anterior à 3.50.

## Objetivos e princípios

O plano busca três resultados: um código limpo, um jogo que cresça com ajuda de IA e, a seguir, um modo mobile e um co-op online.

**Objetivos**

- **Código limpo:** sem variáveis globais, sem lógica duplicada por jogador e sem arquivos que misturam responsabilidades.
- **Crescer com IA:** acrescentar um inimigo, uma fase ou um objeto deve ser "um arquivo novo mais uma linha de dados", em arquivos pequenos e com convenções documentadas.
- **Mobile:** jogar no celular com controles de toque.
- **Co-op online:** dois jogadores em aparelhos diferentes.

**Princípios**

1. **Cada etapa deixa o jogo funcionando.** Nenhuma etapa fica pela metade; cada uma termina com o teste de fumaça passando e o jogo jogável.
2. **Entrada separada da ação.** O jogador recebe uma intenção (`{left, right, jump, attack, down}`) e não lê o teclado. Teclado, toque e rede passam a ser apenas fontes diferentes da mesma intenção.
3. **Dados no lugar de código.** Posições, animações e assets ficam em tabelas, não espalhados em `create()`.
4. **N jogadores, não 2.** Toda lógica trata uma lista de jogadores.
5. **Mudanças pequenas e verificáveis,** em commits separados, para a IA e você conseguirem revisar.

## Etapas 0 a 3: base do código

As quatro primeiras etapas limpam o código e preparam o terreno; nenhuma delas muda como o jogo é jogado.

### Etapa 0: rede de segurança (concluída)

Sem isso, cada refatoração depende de você jogar o jogo inteiro na mão.

- [x] Criar o `CLAUDE.md` com estrutura, convenções e como rodar o jogo.
- [x] Teste de fumaça com Playwright: abre o jogo, espera o `GameScene` e falha se houver erro no console. Além dele, `tests/gameplay.spec.js` cobre movimento, espinhos, inimigos, chaves, barreiras, jumper, portal e porta da cela.
- [x] Trocar o `package.json` (template do CodeSandbox) por um real, com scripts de servidor, lint e teste.
- [x] ESLint e Prettier.
- [x] Apagar o `indexbackup.html`.
- [x] Remover o `console.log` de debug (tecla P) e código morto.

**Pronto quando:** `npm test` abre o jogo e passa sem erros no console. *(Feito. A versão do Phaser era a 3.21.0; foi atualizada depois, ver Etapa 4.)*

### Etapa 1: remover o "2 jogadores fixos" (concluída)

- [x] `scene.players` passa a ser um array; cada jogador tem `id`, `character` ("yin" ou "yang") e `facing`.
- [x] Eliminar os globais `player`, `player2`, `playerPosition`, `player2Position` e os exports do `GameScene`, desfazendo a dependência circular.
- [x] Inimigos escolhem o jogador mais próximo em vez de ter um bloco de `if` por jogador (`Slime`, `Skeleton`, `Demon`).
- [x] `handlePlayerHit` usa o `character` do jogador, sem prefixo escrito no código.
- [x] Classes `Key`, `Barrier` e `JailDoor` no lugar das funções duplicadas por jogador, no mesmo formato de `Portal` e `Jumper`.
- [x] Espinhos viram uma classe ou grupo com dados em `levelSpawns.js`.

**Pronto quando:** não há nenhuma referência a "player2" ou "P2" fora de configuração, e o jogo se comporta como antes.

### Etapa 2: camada de entrada e máquina de estados (concluída)

Esta é a etapa mais importante: mobile e online dependem dela.

- [x] `Player` passa a receber um objeto de intenção e deixa de ler `controls` diretamente.
- [x] `KeyboardInput` produz a intenção a partir das teclas (setas e Enter para um jogador; WASD e espaço para o outro).
- [x] A cadeia de `else if` do `Player.update()` vira uma máquina de estados: `idle`, `run`, `jump`, `fall`, `crouch`, `attack` (combo de 3), `hurt`, `die`.
- [x] Fim de animação: a ideia original era usar o evento `animationcomplete`, mas ele muda o tempo do jogo (o Phaser avança a animação, roda a física e só depois o `update()`, então o último frame deixava de ser visto pela física exatamente uma vez). Ficou a verificação no `update()`, com uma proteção nova: uma animação parada também conta como terminada, para um frame pulado em aparelho lento não travar o estado.
- [x] Aplicar o mesmo padrão aos inimigos (`Slime`, `Skeleton`, `Demon`): uma máquina de estados pequena por inimigo.

**Pronto quando:** o `Player` não menciona teclado em nenhum lugar e o combo, o pulo duplo e o agachar se comportam exatamente como antes.

### Etapa 3: dados no lugar de código (concluída)

- [x] Animações em uma tabela (personagem → quadros, taxa, repetição), no lugar de cerca de 20 chamadas `anims.create` copiadas para Yin e Yang.
- [x] Manifesto de assets e uma `PreloadScene` separada, tirando o `preload()` de 120 linhas do `GameScene`.
- [x] Posições de espinhos, chaves, barreiras e porta no `levelSpawns.js` (feito na Etapa 1). Migrar tudo para a camada de objetos do Tiled ficou como melhoria futura.
- [x] Dividir o `GameScene` em partes menores (mapa, colisões, HUD, câmeras), cada uma com uma responsabilidade.
- [x] Documentar no `CLAUDE.md` o passo a passo de "como adicionar um inimigo", "um asset" e "uma fase". A fase 2 ainda não é possível sem mexer em `LevelMap` e `LEVEL_SPAWNS`, e o passo a passo diz isso.

**Pronto quando:** o `GameScene` tem menos de 250 linhas e acrescentar um inimigo novo exige um arquivo e uma linha de dados. *(Feito: o `GameScene` tem 108 linhas. Um inimigo novo ainda exige tocar `EntityGroups`, `spawnLevel` e `GameScene` além do arquivo e dos dados, ver o passo a passo no `CLAUDE.md`.)*

## Etapas 4 a 7: mobile e online

Com a base pronta, o mobile entra primeiro por ser mais simples e por obrigar o jogo a ter câmera única, que o online também vai usar.

### Etapa 4: mobile básico (um jogador por aparelho)

Decisão tomada: **uma pessoa por aparelho**. No celular o jogo tem um único jogador local e câmera única; o segundo jogador só existe no desktop (tela dividida) ou, no futuro, como jogador remoto no co-op online (Etapa 6). A escolha vem do `resolveGameMode()` (`src/core/gameMode.js`): aparelho de toque → `solo`, senão → `local`; dá para forçar com `?mode=solo` ou `?mode=local` (e `?character=yang`).

- [x] Atualizar o Phaser: feito, 3.21.0 → **4.2.1** (a mais recente). Mudanças no código: `createStaticLayer` → `createLayer` e `getCurrentKey` → `getName`. Os 31 testes passam e capturas de tela de 6 pontos do mapa ficaram visualmente idênticas às da 3.21.
- [x] `TouchInput` + `TouchControlsScene`: D-pad (esquerda, direita, agachar), pulo e ataque, com vários dedos ao mesmo tempo, produzindo a mesma intenção do teclado.
- [x] Modo de câmera única: `GameScene` escolhe entre tela dividida (`local`) e câmera única (`solo`).
- [~] Escala e orientação: em pé aparece o aviso "Gire o aparelho" e o jogo some; barra do navegador escondida pelo CSS e pela tela cheia. **Falta** aceitar proporções variadas: o jogo continua 4:3 (800x600) e deixa barras pretas nas laterais de celulares compridos (em um Pixel 7 só ~55% da largura é usada). Fica para a Etapa 7.
- [x] Botões na tela para pausa e tela cheia (o de tela cheia some onde o navegador não suporta, como o iPhone), no lugar das teclas F e P.
- [x] Desbloquear o áudio no primeiro toque: um único toque na tela inicial agora começa o jogo (antes eram dois) e a música espera o desbloqueio.
- [x] `meta viewport`, bloqueio de zoom e rolagem, e sem "puxar para atualizar".
- [x] Extra necessário: depois do game over, um toque (ou Enter) volta à tela inicial; antes não havia como recomeçar.

**Pronto quando:** o jogo roda no Chrome e no Safari de um celular, em paisagem, com controles de toque. *(Verificado só em emulação do Chrome com toques reais, 12 testes em `tests/mobile.spec.js`. Falta testar em aparelho de verdade, principalmente no Safari do iPhone.)*

### Etapa 5: preparar a simulação para a rede

- [ ] Dar um `id` estável a cada entidade (inimigo, chave, barreira), para dizer "o slime 7 morreu".
- [ ] Separar o estado do jogo (serializável) da renderização.
- [ ] Transformar dano, coleta e abertura de porta em eventos explícitos, não efeitos colaterais dentro de callbacks de colisão.
- [ ] Passo de simulação com tempo fixo, independente da taxa de quadros.

**Pronto quando:** é possível tirar uma foto do estado do jogo como JSON e restaurá-la.

### Etapa 6: co-op online

- [ ] Modelo **host-autoritativo**: um jogador roda a simulação (inimigos, física, vida); o outro envia apenas a intenção e recebe o estado.
- [ ] `NetworkInput`: a mesma intenção das Etapas 2 e 4, vinda da rede.
- [ ] Escolher o transporte (WebRTC direto ou servidor Node pequeno) e implementar sala, conexão e reconexão.
- [ ] Interpolação do jogador remoto, para o movimento não ficar travado.
- [ ] Uma câmera por aparelho (reaproveita o modo de câmera única da Etapa 4).
- [ ] Lobby simples: criar sala, entrar por código, escolher Yin ou Yang.

**Pronto quando:** dois aparelhos, desktop e celular, completam o jogo juntos.

**Desenho proposto** (como o modo `solo` da Etapa 4 se encaixa):

- Cada aparelho roda um `GameScene` com **um jogador local** (teclado ou toque) e uma câmera única. O outro personagem é um jogador remoto, também um `Player`, mas com `NetworkInput` no lugar do teclado.
- O **host** roda toda a simulação (física, inimigos, vida, chaves, chefes) com os dois jogadores: o dele e o remoto, movido pela intenção que o convidado envia. A cada ~50 ms o host manda um retrato do estado (posições, animações, estados, vida, objetos). O **convidado** não simula inimigos nem física: desenha o retrato recebido e interpola, e envia só a sua intenção.
- Por isso a Etapa 5 vem antes: ids estáveis nas entidades, estado serializável, eventos explícitos e passo de simulação com tempo fixo. O convidado também precisa de um modo de cena "cliente" em que as entidades são só sprites.
- **Transporte (recomendação):** um servidor Node pequeno com WebSocket que só repassa mensagens entre duas pessoas da mesma sala (código de 4 letras). Motivo: WebRTC direto costuma falhar em redes de celular (NAT de operadora) sem um servidor TURN, que é outro servidor para manter; e um repasse por WebSocket aguenta bem um jogo cooperativo com host autoritativo. Custo: hospedar o servidor (plano gratuito ou barato).
- Limitação conhecida: o convidado sente a latência da rede entre o toque e o movimento do seu personagem. Se incomodar, o convidado passa a simular o próprio jogador localmente e corrige com o host (previsão no cliente), depois.

### Etapa 7: polimento mobile

- [ ] Desempenho em aparelhos fracos (mapa grande de 4096 px, mais de 100 sprites).
- [ ] Tamanho dos assets e tempo de carregamento (atlas de sprites, áudio comprimido).
- [ ] Instalável como PWA, com ícone e funcionamento offline.
- [ ] Botões de toque ajustáveis em tamanho e posição.

## Decisões em aberto e riscos

Quatro decisões precisam ser tomadas antes ou durante as etapas; as duas primeiras mudam o escopo do mobile.

- [x] **Quem joga no celular?** *(Decidido: uma pessoa por aparelho; ver Etapa 4.)* Se o mobile for sempre single player ou online, a câmera dividida existe só no desktop. Dois jogadores no mesmo celular mudariam muito o layout, e não é recomendado. *Decidir antes da Etapa 4.*
- [x] **Versão do Phaser.** *(Resolvido: atualizado para a 4.2.1.)* O código usa `createStaticLayer`, removido na 3.50. É preciso confirmar qual versão o `index.html` carrega e planejar a atualização (a recomendação é depois da Etapa 3 e antes da Etapa 4). *Verificar na Etapa 0.*
- [ ] **Transporte do online.** WebRTC direto (sem servidor, mas com problemas de NAT) ou servidor Node pequeno (custo de hospedagem, mais confiável). *Decidir antes da Etapa 6.*
- [ ] **Build com Vite?** *(Adiado: o mobile básico não precisou. Reavaliar na Etapa 7, para PWA e carregamento.)* Hoje não há build. Um bundler ajuda a PWA e o carregamento no celular, mas acrescenta complexidade. *Decidir na Etapa 4.*

**Riscos**

| Risco | Efeito | Como reduzir |
| --- | --- | --- |
| Refatorar sem testes | Quebrar comportamento sem perceber | Teste de fumaça na Etapa 0; commits pequenos; jogar a fase inteira ao fim de cada etapa |
| Atualizar o Phaser | APIs removidas quebram mapa e colisão | Atualizar isolado, em uma branch, com o teste de fumaça |
| Sincronizar a física do Arcade pela rede | Jogadores veem mundos diferentes | Modelo host-autoritativo; não sincronizar quadro a quadro |
| Desempenho no celular | Jogo lento em aparelhos fracos | Medir cedo, na Etapa 4, antes do polimento da Etapa 7 |
| `GameScene` crescer de novo | Voltar ao arquivo gigante | Regra no `CLAUDE.md`: lógica nova vai em classes, não na cena |

## Resumo do roadmap

As oito etapas seguem a ordem que o código impõe: a base vem primeiro e a Etapa 2 libera o mobile e o online.

```text
Base do código (muda o código, não o jogo)
  [Etapa 0]──▶[Etapa 1]──▶[ETAPA 2]──▶[Etapa 3]
  Rede de      N jogadores,  Entrada e   Dados em
  segurança    não 2         estados     tabelas
                             (destaque)       │
                                              ▼
Plataformas (mobile primeiro, online depois)
  [Etapa 4]──▶[Etapa 5]──▶[Etapa 6]──▶[Etapa 7]
  Mobile       Simulação    Co-op       Polimento
  básico       para rede    online      mobile
```

A Etapa 2 é o pré-requisito de mobile e online: ambos reutilizam a mesma intenção de entrada.

O próximo passo é começar pelas Etapas 0 e 1, que juntas dão o maior ganho de limpeza com o menor risco.
