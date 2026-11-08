# Publicar o jogo e o servidor online: passo a passo

Um **único Worker** da Cloudflare serve o jogo (o site) **e** as salas do co-op online, no mesmo endereço
(por exemplo `https://jogo.seudominio.com`). Tudo no plano gratuito, sem cartão. Tempo: uns 20 minutos, mais a
espera do DNS se você ainda não usa a Cloudflare no seu domínio.

Comandos que começam com `!` são para você digitar no prompt do Claude Code (eles rodam na sua sessão).
Fora dele, é só tirar o `!` e rodar no terminal, dentro da pasta do projeto.

## Antes de começar

1. Conta na Cloudflare (gratuita).
2. **O seu domínio precisa estar ativo na Cloudflare.** Isto é o ponto que mais surpreende, então leia:
   - Para o Worker responder no **seu** endereço, a Cloudflare precisa ser o DNS do domínio. No plano gratuito só
     existe esse modo ("configuração completa", com os nameservers dela).
   - Apontar um registro CNAME do DNS de outro provedor para o Worker **não funciona** (a Cloudflare não suporta isso
     para Workers).
   - Como fazer: painel da Cloudflare, **Add a domain**, escolha o plano Free; ela mostra dois nameservers e importa
     os registros DNS que já existem; no site onde você registrou o domínio, troque os nameservers pelos dois que
     ela mostrou e espere o domínio ficar **Active** (de minutos a algumas horas). Antes de trocar, confira se os
     registros importados batem com os que você tem hoje (principalmente e-mail, os registros MX).
   - Pode ser um subdomínio (`jogo.seudominio.com`): o resto do domínio continua como está, só passa a ser gerido
     pela Cloudflare.
3. **Sem domínio?** Funciona igual em `https://yinyang.SEU-SUBDOMINIO.workers.dev` (o `wrangler` mostra no deploy).
   Fica de fora a regra de WAF (seção "O que cada proteção faz"), e a documentação do Turnstile que li não diz se
   `workers.dev` é aceito como hostname do widget; se o painel recusar, é preciso um domínio.

## As chaves: quais são e onde cada uma vai

| O quê | Secreta? | Onde fica | Como colocar |
| --- | --- | --- | --- |
| **Site Key** do Turnstile (começa com `0x4...`) | Não, é pública | `src/net/config.js`, em `TURNSTILE_SITE_KEY` | Editar o arquivo (vai para o git, tudo bem) |
| **Secret Key** do Turnstile | **Sim** | No Cloudflare, como *secret* do Worker chamado `TURNSTILE_SECRET` | `npx wrangler secret put TURNSTILE_SECRET --config worker/wrangler.jsonc` (cola quando pedir) |
| O seu endereço (`jogo.seudominio.com`) | Não | `worker/wrangler.jsonc`, em `routes` | Editar o arquivo |
| Servidor das salas | — | **Nada a configurar:** por padrão é o mesmo endereço da página | `PRODUCTION_RELAY_URL` só se o servidor ficar em outro lugar |
| Páginas permitidas | Não | `worker/wrangler.jsonc`, em `ALLOWED_ORIGINS` (já vem `"self"`: só a própria página) | Só se quiser liberar outras |
| Chaves de **teste** do Turnstile (só para rodar no seu computador) | Não | `worker/.dev.vars` (ignorado pelo git) | Ver "Testar no computador" abaixo |

Regras de ouro:

- A **Secret Key** nunca vai em arquivo do projeto, nem no `wrangler.jsonc`, nem no git, nem no chat. Só pelo
  comando `wrangler secret put`, que a guarda cifrada na Cloudflare.
- A **Site Key** é feita para ficar à mostra no código do jogo; sozinha ela não serve para nada.
- Você **não precisa** criar nenhum "API token": o `wrangler login` usa o navegador. (API token só é preciso
  para publicar por um robô, como o GitHub Actions.)

## Passo a passo

### 1. Entrar na Cloudflare

```bash
! npx wrangler login
```

Abre o navegador; clique em "Allow". Para conferir: `npx wrangler whoami`.

### 2. Escolher o endereço do jogo

Em `worker/wrangler.jsonc`, tire os `//` da linha `routes` e ponha o seu endereço:

```jsonc
"routes": [{ "pattern": "jogo.seudominio.com", "custom_domain": true }],
```

No próximo deploy a Cloudflare cria sozinha o registro DNS e o certificado HTTPS, apontando para o Worker.
Atenção: o endereço **não pode já ter um registro CNAME** no DNS da Cloudflare (apague-o antes, se houver), e vale só
para esse endereço exato, sem curingas.

### 3. Criar o widget do Turnstile

No painel da Cloudflare (dash.cloudflare.com): menu **Turnstile**, **Add widget**.

- **Nome do widget:** `yinyang` (qualquer um).
- **Hostnames:** o seu endereço, **sem** `https://`, sem porta e sem caminho: `jogo.seudominio.com`. (Adicionar um
  nome libera também os subdomínios dele.)
- **Widget Mode:** `Managed` (recomendado).
- Crie e **copie as duas chaves**: **Site Key** e **Secret Key**.

No plano gratuito são até 20 widgets, 10 hostnames por widget e desafios ilimitados. Não precisa pôr `localhost`:
para testar no computador use as chaves de teste.

### 4. Publicar

```bash
! npm run deploy
```

Isso monta o site (`npm run build:site`, que junta a página, o código e os arquivos do jogo na pasta `dist/`) e
publica o Worker junto com o site. No fim ele mostra o endereço. Se for a primeira vez e você não usa
domínio próprio, ele pergunta o nome do seu subdomínio `workers.dev`; escolha um.

Confira que o servidor responde (deve mostrar `ok`) e que o jogo abre no navegador:

```bash
curl https://jogo.seudominio.com/health
```

Com domínio próprio, o certificado pode levar alguns minutos para valer na primeira vez.

Neste ponto o Turnstile ainda está desligado (falta a Secret Key). Não divulgue o endereço ainda e siga para o passo 5.

### 5. Guardar a Secret Key no Worker

```bash
! npx wrangler secret put TURNSTILE_SECRET --config worker/wrangler.jsonc
```

Cole a **Secret Key** quando ele pedir (não aparece na tela) e dê Enter. Isso já ativa o Turnstile no servidor: a
partir de agora, toda conexão precisa de um token válido.

Conferir (mostra só o nome, nunca o valor):

```bash
npx wrangler secret list --config worker/wrangler.jsonc
```

### 6. Dar a Site Key ao jogo

Edite `src/net/config.js`:

```js
export const TURNSTILE_SITE_KEY = "0x4AAAAAAA..."; // a Site Key (pública)
```

(`PRODUCTION_RELAY_URL` fica `null`: o jogo usa o mesmo endereço da página.) Como o site vai junto com o Worker,
publique de novo e faça o commit:

```bash
! npm run deploy
git add src/net/config.js && git commit -m "chore: configure the Turnstile site key"
```

### 7. Testar de verdade

Abra o jogo no seu endereço com `?online=host`, toque no texto do topo para copiar o link de convite e abra o link
em outro aparelho (ou aba anônima). O amigo deve aparecer e o jogo andar nos dois.

Se algo não funcionar, veja "Se algo der errado" no fim.

## Atualizar o jogo depois

Qualquer mudança em `src/`, `assets/`, `index.html` ou `main.css` só chega às pessoas depois de:

```bash
! npm run deploy
```

(O site é servido pelo Worker, então publicar o Worker é o que publica o jogo.)

## Testar no computador antes de publicar (sem conta)

Duas formas:

```bash
# A) Jogo local + servidor de salas em Node (o mais simples; sem Turnstile)
npm run relay        # terminal 1
npm start            # terminal 2, abre http://localhost:3000/?online=host

# B) O Worker de verdade, servindo o site e as salas juntos, em http://localhost:8788
npm run worker:dev   # monta o site e sobe o Worker
#    abra: http://localhost:8788/?online=host&relay=same
```

O `?relay=same` diz ao jogo para usar o endereço da própria página como servidor (em `localhost` o padrão é o
servidor Node da forma A).

Para testar o Turnstile no computador, a Cloudflare dá chaves de **teste** que funcionam em `localhost`:

| Chave | Valor | Efeito |
| --- | --- | --- |
| Site Key | `1x00000000000000000000BB` | invisível, sempre aprova |
| Site Key | `2x00000000000000000000BB` | invisível, sempre recusa |
| Secret Key | `1x0000000000000000000000000000000AA` | aprova qualquer token |
| Secret Key | `2x0000000000000000000000000000000AA` | recusa sempre |

```bash
printf 'TURNSTILE_SECRET=1x0000000000000000000000000000000AA\n' > worker/.dev.vars   # ignorado pelo git
npm run worker:dev
# abra: http://localhost:8788/?online=host&relay=same&turnstileKey=1x00000000000000000000BB
```

Sem o `turnstileKey=...` o Worker local recusa com "Verificação de segurança necessária", que é o esperado.
Para voltar ao normal, apague `worker/.dev.vars`. Os testes automáticos fazem tudo isso sozinhos: `npm run test:worker`.

## Em emergência

- **Alguém está abusando agora:** em `worker/wrangler.jsonc` ponha `"ONLINE_ENABLED": "false"` e publique
  (`npm run deploy`). O servidor recusa tudo com 503 na hora (o site continua abrindo). Volte para `"true"` depois.
- **Trocar a Secret Key** (por exemplo, se ela vazou): no painel do Turnstile, no seu widget, gere uma nova
  secret key e rode de novo o passo 5.
- **Desligar só o Turnstile:** `npx wrangler secret delete TURNSTILE_SECRET --config worker/wrangler.jsonc`
  (e deixe `TURNSTILE_SITE_KEY` como `null` no jogo, e publique). O jogo volta a funcionar sem o desafio, e fica sem essa proteção.

## O que cada proteção faz (e o que não faz)

| Camada | Onde | Protege contra | Não protege contra |
| --- | --- | --- | --- |
| Código de sala de 6 caracteres, gerado com aleatoriedade segura | jogo | adivinhar a sala de outra pessoa | |
| Convidado só entra em sala que existe | servidor | scripts criando salas vazias | |
| **Turnstile** | Worker (verificação) e jogo (desafio) | **scripts abrindo salas e conexões** (cada conexão exige um token que só um navegador de verdade obtém, de uso único e válido por 5 min). Protege o seu limite de Durable Objects e de duração | requisições sem token ainda contam no limite de 100 mil/dia do **Worker** (são recusadas rápido, mas contam) |
| Limite de tentativas por endereço (20 por minuto) | Worker | um script martelando de um lugar só | vários endereços ao mesmo tempo (é aproximado: cada instância e cada local da Cloudflare conta por si) |
| `ALLOWED_ORIGINS = "self"` | Worker | uso do seu servidor por páginas de terceiros | um script que invente o cabeçalho `Origin` |
| Limite de mensagens por conexão e expulsão de quem manda lixo | sala | enxurrada de mensagens dentro de uma sala | |
| Sala expira: 10 min com o anfitrião sozinho, 3 h no máximo | sala | salas esquecidas ocupando recursos | |
| Chave geral `ONLINE_ENABLED` | Worker | ataque em andamento (corta tudo na hora) | |
| Arquivos do site servidos sem rodar o Worker | Cloudflare | o site (arquivos estáticos) não gasta o limite de requisições do Worker: segundo a documentação, essas requisições são gratuitas e ilimitadas | a documentação não diz se elas entram na conta dos 100 mil/dia; confira no painel depois de um tempo no ar |

Contra um volume enorme de requisições, a defesa forte é uma **regra de rate limiting do WAF** da Cloudflare, que
roda antes do Worker. Como o seu domínio estará na Cloudflare, ela fica disponível: no plano gratuito é 1 regra, janela
de 10 s, contando por endereço. No painel: **Security**, **WAF**, **Rate limiting rules**; uma regra razoável é
"o caminho começa com `/room/`, mais de 30 requisições em 10 s do mesmo endereço, bloquear". Os rótulos exatos e a
duração do bloqueio dependem do painel; ele guia. A documentação que li não diz se as requisições barradas pelo WAF
deixam de contar no limite do Worker, então confirme no painel se um dia precisar disso.

Lembre também: o plano gratuito **não cobra nada**. Ao estourar um limite, o modo online só fica fora do ar até
as 00:00 UTC.

## Limites do que é publicado

O site tem hoje 170 arquivos e 17 MiB, o maior com 3,5 MiB. O plano gratuito aceita até 20 mil arquivos e 25 MiB por
arquivo; `npm run build:site` avisa (e para) se passar disso.

O Phaser ainda é carregado da CDN `cdn.jsdelivr.net` (versão fixa no `index.html`). Se quiser que tudo venha do seu
endereço, dá para copiar o arquivo para o site; não é necessário para funcionar.

## Se algo der errado

| O jogo mostra | Causa provável |
| --- | --- |
| "O modo online ainda não está disponível neste endereço" | `PRODUCTION_RELAY_URL` está preenchido com algo errado, ou a página não é a servida pelo Worker |
| "Não foi possível conectar ao servidor online" | Worker fora do ar, endereço errado, ou limite de tentativas por endereço (espere 1 minuto) |
| "Verificação de segurança necessária" | o servidor exige o Turnstile e o jogo não tem a Site Key (passo 6) |
| "Não foi possível confirmar que você é uma pessoa" | a Secret Key não é a do mesmo widget da Site Key, ou o hostname da página não está no widget (passo 3) |
| "A verificação de segurança não carregou" | um bloqueador de anúncios, ou rede bloqueando `challenges.cloudflare.com` |
| "Essa sala não existe" | o link é de uma sala que já fechou; peça um novo |
| "A sala expirou" | o anfitrião esperou mais de 10 min sozinho (ou a sala passou de 3 h) |
| "Mensagens demais" / "Mensagens inválidas" | a conexão foi cortada pelo servidor; é proteção, recarregue |

Se a página abre mas conexões são recusadas com 403: a página que abriu o jogo não é a mesma do Worker (por
exemplo, o jogo hospedado em outro lugar). Ponha o endereço dessa página em `ALLOWED_ORIGINS`.

Para ver o que o Worker está fazendo ao vivo: `npx wrangler tail --config worker/wrangler.jsonc`.
