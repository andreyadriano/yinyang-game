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

**Pronto quando:** `npm test` abre o jogo e passa sem erros no console. *(Feito. Versão do Phaser confirmada: 3.21.0.)*

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

### Etapa 3: dados no lugar de código

- [ ] Animações em uma tabela (personagem → quadros, taxa, repetição), no lugar de cerca de 20 chamadas `anims.create` copiadas para Yin e Yang.
- [ ] Manifesto de assets e uma `PreloadScene` separada, tirando o `preload()` de 120 linhas do `GameScene`.
- [ ] Posições de espinhos, chaves, barreiras e porta no `levelSpawns.js` ou na camada de objetos do Tiled.
- [ ] Dividir o `GameScene` em partes menores (mapa, colisões, HUD, câmeras), cada uma com uma responsabilidade.
- [ ] Documentar no `CLAUDE.md` o passo a passo de "como adicionar um inimigo" e "como adicionar uma fase".

**Pronto quando:** o `GameScene` tem menos de 250 linhas e acrescentar um inimigo novo exige um arquivo e uma linha de dados.

## Etapas 4 a 7: mobile e online

Com a base pronta, o mobile entra primeiro por ser mais simples e por obrigar o jogo a ter câmera única, que o online também vai usar.

### Etapa 4: mobile básico (single player)

- [ ] Atualizar o Phaser para 3.50 ou superior, que tem suporte a toque e escala melhores (ver decisões em aberto).
- [ ] `TouchInput`: D-pad virtual e botões de pulo e ataque, com multitouch, produzindo a mesma intenção do teclado.
- [ ] Modo de câmera única: a cena escolhe entre **split-screen local** (desktop) e **câmera única** (mobile e online).
- [ ] Escala e orientação: forçar paisagem, aceitar proporções variadas de tela e esconder a barra do navegador.
- [ ] Botões na tela para tela cheia e pausa, no lugar das teclas F e P.
- [ ] Desbloquear o áudio no primeiro toque.
- [ ] `meta viewport` e bloqueio de zoom e rolagem.

**Pronto quando:** o jogo roda no Chrome e no Safari de um celular, em paisagem, com controles de toque.

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

### Etapa 7: polimento mobile

- [ ] Desempenho em aparelhos fracos (mapa grande de 4096 px, mais de 100 sprites).
- [ ] Tamanho dos assets e tempo de carregamento (atlas de sprites, áudio comprimido).
- [ ] Instalável como PWA, com ícone e funcionamento offline.
- [ ] Botões de toque ajustáveis em tamanho e posição.

## Decisões em aberto e riscos

Quatro decisões precisam ser tomadas antes ou durante as etapas; as duas primeiras mudam o escopo do mobile.

- [ ] **Quem joga no celular?** Se o mobile for sempre single player ou online, a câmera dividida existe só no desktop. Dois jogadores no mesmo celular mudariam muito o layout, e não é recomendado. *Decidir antes da Etapa 4.*
- [ ] **Versão do Phaser.** O código usa `createStaticLayer`, removido na 3.50. É preciso confirmar qual versão o `index.html` carrega e planejar a atualização (a recomendação é depois da Etapa 3 e antes da Etapa 4). *Verificar na Etapa 0.*
- [ ] **Transporte do online.** WebRTC direto (sem servidor, mas com problemas de NAT) ou servidor Node pequeno (custo de hospedagem, mais confiável). *Decidir antes da Etapa 6.*
- [ ] **Build com Vite?** Hoje não há build. Um bundler ajuda a PWA e o carregamento no celular, mas acrescenta complexidade. *Decidir na Etapa 4.*

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
