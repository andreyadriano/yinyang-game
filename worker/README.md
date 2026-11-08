# Servidor online (Cloudflare Worker)

O servidor de repasse do co-op online: um Worker que manda cada sala para um Durable Object, que
só repassa mensagens entre os dois jogadores. As regras da sala são as mesmas do servidor local
(`src/net/RoomCore.js`); aqui só há a parte da Cloudflare.

```
worker/
  wrangler.jsonc   configuração (nome, Durable Object, ALLOWED_ORIGINS)
  src/index.js     o Worker: /health e /room/ABCD (valida o código e a origem)
  src/Room.js      o Durable Object de cada sala (hibernação de WebSocket)
  src/reject.js    recusa um jogador dizendo o motivo
```

## Testar no seu computador

```bash
npm run worker:dev        # sobe o Worker local em ws://localhost:8788 (workerd de verdade)
npm run test:worker       # os testes do servidor contra o Worker (sobe o worker:dev sozinho)
npm run test:online-worker   # o jogo inteiro, duas páginas, passando pelo Worker
```

Para jogar de verdade contra ele, com `npm start` rodando, abra no navegador
`http://localhost:3000/?online=host&relay=ws://localhost:8788` e, em outra janela, o link de convite
com `&relay=ws://localhost:8788` no final.

## Publicar (uma vez)

Precisa de conta na Cloudflare (o plano gratuito basta: não precisa de cartão para o Workers Free).

1. Login, que abre o navegador: `npx wrangler login`
2. Publicar: `npm run worker:deploy`
   - Na primeira vez, o `wrangler` pergunta o nome do seu subdomínio `workers.dev`; escolha um.
   - No fim ele mostra o endereço, algo como `https://yinyang-relay.SEU-SUBDOMINIO.workers.dev`.
3. Teste se está no ar: abra `https://yinyang-relay.SEU-SUBDOMINIO.workers.dev/health` (deve mostrar `ok`).
4. Diga ao jogo onde o servidor está: em `src/net/config.js`, troque `PRODUCTION_RELAY_URL` por
   `"wss://yinyang-relay.SEU-SUBDOMINIO.workers.dev"` (com `wss://`, sem barra no fim).
5. Quando souber onde o jogo vai ficar hospedado, restrinja quem pode abrir salas: em
   `worker/wrangler.jsonc`, ponha o endereço do jogo em `ALLOWED_ORIGINS` (por exemplo
   `"https://meujogo.pages.dev"`) e publique de novo. Vazio aceita qualquer origem.

Para testar sem publicar, o jogo aceita `?relay=wss://...` na URL.

## Limites do plano gratuito

100.000 requisições e 13.000 GB-s de duração por dia (veja `docs/ROADMAP.md`, Etapa 6, para a conta
feita para este jogo). Ao estourar, as operações falham até 00:00 UTC; nada é cobrado. Acompanhe o
uso no painel da Cloudflare, em Workers & Pages, no seu Worker, aba Metrics, e na parte de Durable Objects.
Se passar do limite com frequência, o plano pago começa em US$ 5 por mês.

## Como funciona por dentro

- O Worker valida o endereço (`/room/ABCD`, código de 4 letras sem I, L, O) e, se `ALLOWED_ORIGINS`
  estiver preenchido, a origem. Um código inválido é recusado ali, antes de existir qualquer sala.
- Cada código vira um Durable Object (`env.ROOMS.getByName(código)`). O primeiro a entrar é o
  anfitrião e o segundo o convidado; um terceiro é recusado com `room-full`.
- O Durable Object usa a **API de hibernação**: se ninguém manda nada por um tempo (o anfitrião esperando
  o amigo), o objeto sai da memória sem derrubar as conexões, e não gasta duração. Quando acorda, a
  sala é reconstruída a partir dos sockets abertos; cada socket guarda o seu papel e a sua sala
  como anexo (`serializeAttachment`). Os testes cobrem isso (25 s de espera e a sala continua certa).
- Os pings de manutenção do cliente (`{"t":"ping"}` a cada 25 s) são respondidos pelo próprio runtime
  (`setWebSocketAutoResponse`), sem acordar o objeto.
- Quando o anfitrião sai, o convidado é avisado (`peer-left`) e o próprio cliente se desconecta. O servidor
  só fecha a conexão como reserva, depois de 2 s: no `wrangler dev`, um fechamento iniciado pelo servidor
  em outro socket deixa a conexão pela metade, então o jogo não depende dele.
