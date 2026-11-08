# O Worker da Cloudflare: o site e o servidor online

Um único Worker serve **o jogo** (os arquivos de `dist/`, montados por `scripts/build-site.mjs`) e **o servidor
do co-op online**: cada sala é um Durable Object que só repassa mensagens entre os dois jogadores. Por padrão um
arquivo que existe em `dist/` é servido sem rodar o código do Worker; o que não é arquivo (`/room/...`,
`/health`) cai no Worker. As regras da sala são as mesmas do servidor local (`src/net/RoomCore.js`); aqui só há a
parte da Cloudflare.

**Para publicar, siga o [DEPLOY.md](DEPLOY.md)** (comandos em ordem, quais chaves são necessárias e onde cada
uma vai).

```
worker/
  DEPLOY.md        o passo a passo de publicação, as chaves e o que fazer em emergência
  wrangler.jsonc   configuração (nome, site em dist/, endereço próprio, Durable Object, limites, ALLOWED_ORIGINS)
  src/index.js     o Worker: /health e /room/ABC234
  src/guards.js    as recusas baratas, antes de tocar em qualquer sala (puro: testado no Node)
  src/turnstile.js a verificação do token do Turnstile na Cloudflare
  src/Room.js      o Durable Object de cada sala (hibernação de WebSocket, alarmes de expiração)
  src/reject.js    recusa um jogador dizendo o motivo
```

## Testar no seu computador

```bash
npm run build:site           # monta dist/ (a página, o código e os arquivos do jogo)
npm run worker:dev           # monta o site e sobe o Worker local em http://localhost:8788 (workerd de verdade)
npm run test:worker          # os testes do Worker (sobe 5 instâncias sozinho: normal, rígida, 2 com Turnstile, e
                             # a "como em produção", que serve o site e só aceita a própria página)
npm run test:online-worker   # o jogo inteiro, duas páginas, passando pelo Worker
npm run deploy               # monta o site e publica tudo (ver DEPLOY.md)
```

Para jogar de verdade contra ele, abra `http://localhost:8788/?online=host&relay=same` (o jogo é servido pelo
próprio Worker; `relay=same` diz para usar o endereço da página como servidor) e, em outra janela, o link de convite
(ele já leva o código da sala e o `relay`).

## Como funciona por dentro

Pedidos passam por camadas, da mais barata para a mais cara (`src/guards.js`):

1. Endereço que não é de sala: 404. Sem WebSocket: 426.
2. Chave geral `ONLINE_ENABLED = "false"`: 503 (corta tudo durante um ataque).
3. Limite de tentativas por endereço (rajada de 20, depois 20 por minuto): 429. Fica na memória do Worker,
   sem custo; o limitador da própria Cloudflare (`ratelimits`) pode ser somado, está no `wrangler.jsonc`, comentado.
4. Página que não está em `ALLOWED_ORIGINS`: 403. O padrão é `"self"`: só a página servida por este mesmo Worker.
5. Código de sala inválido (6 caracteres: letras e dígitos, sem I, L, O, 0, 1): um socket que diz `bad-room`.
6. Turnstile (se `TURNSTILE_SECRET` estiver configurada): sem token, `challenge-required`; token que a Cloudflare não
   aprova, `challenge-failed`. É a única camada que faz uma chamada de rede, por isso é a última.

Só então a conexão chega ao Durable Object da sala (`env.ROOMS.getByName(código)`):

- O jogo pede o papel (`?role=host` ou `?role=guest`): o convidado só entra em sala que **já existe**
  (`room-not-found`) e o anfitrião só abre sala que ainda não existe (`room-in-use`). Entrar nunca cria sala.
  Um terceiro jogador é recusado com `room-full`.
- Cada conexão tem um balde de mensagens (60 por segundo, rajada de 150; o jogo usa uns 20 a 30). Passou disso,
  ou mandou 5 mensagens inválidas, é **expulsa**: avisada, cortada, e tirada da sala na hora (o outro jogador é
  avisado). Mensagens maiores que 32 KB são inválidas.
- Um alarme olha a sala a cada minuto: anfitrião esperando sozinho há mais de 10 minutos, ou sala com mais de
  3 horas, é encerrada com `room-timeout`.
- O Durable Object usa a **API de hibernação**: se ninguém manda nada por um tempo (o anfitrião esperando o
  amigo), o objeto sai da memória sem derrubar as conexões, e não gasta duração. Quando acorda, a sala é
  reconstruída a partir dos sockets abertos; cada socket guarda o seu papel, a sala e a hora de chegada como
  anexo (`serializeAttachment`).
- Os pings de manutenção do cliente (`{"t":"ping"}` a cada 25 s) são respondidos pelo próprio runtime
  (`setWebSocketAutoResponse`), sem acordar o objeto.
- Quando o anfitrião sai, o convidado é avisado (`peer-left`) e o próprio cliente se desconecta. O servidor
  só fecha a conexão como reserva, depois de 2 s: no `wrangler dev`, um fechamento iniciado pelo servidor
  em outro socket deixa a conexão pela metade, então o jogo não depende dele.

## Configuração (`wrangler.jsonc`, em `vars`)

| Variável | Padrão | O que faz |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | `"self"` | páginas que podem abrir salas: `"self"` (a do próprio Worker), `"*"` (qualquer) ou endereços |
| `ONLINE_ENABLED` | `"true"` | `"false"` recusa tudo (chave geral) |
| `CONNECT_BURST`, `CONNECT_PER_MINUTE` | 20 e 20 | tentativas de conexão por endereço |
| `ROOM_WAITING_MS` | 600000 (10 min) | quanto o anfitrião pode esperar sozinho |
| `ROOM_MAX_MS` | 10800000 (3 h) | vida máxima de uma sala |
| `TURNSTILE_SECRET` | não existe | **secret** (não é variável de arquivo): liga o Turnstile; ver DEPLOY.md |
