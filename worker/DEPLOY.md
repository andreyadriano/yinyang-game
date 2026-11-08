# Publicar o servidor online: passo a passo

Tempo: uns 15 minutos. Você vai criar um widget do Turnstile (a verificação "você é uma pessoa"), publicar o
Worker na Cloudflare e dizer ao jogo onde ele está. Tudo no plano gratuito, sem cartão.

Comandos que começam com `!` são para você digitar no prompt do Claude Code (eles rodam na sua sessão).
Fora dele, é só tirar o `!` e rodar no terminal, dentro da pasta do projeto.

## As chaves: quais são e onde cada uma vai

| O quê | Secreta? | Onde fica | Como colocar |
| --- | --- | --- | --- |
| **Site Key** do Turnstile (começa com `0x4...`) | Não, é pública | `src/net/config.js`, em `TURNSTILE_SITE_KEY` | Editar o arquivo (vai para o git, tudo bem) |
| **Secret Key** do Turnstile | **Sim** | No Cloudflare, como *secret* do Worker chamado `TURNSTILE_SECRET` | `npx wrangler secret put TURNSTILE_SECRET --config worker/wrangler.jsonc` (cola quando pedir) |
| Endereço do Worker (`wss://yinyang-relay.SEU.workers.dev`) | Não | `src/net/config.js`, em `PRODUCTION_RELAY_URL` | Editar o arquivo |
| Página(s) do jogo permitidas | Não | `worker/wrangler.jsonc`, em `ALLOWED_ORIGINS` | Editar o arquivo e publicar de novo |
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

### 2. Publicar o Worker (a primeira vez)

```bash
! npm run worker:deploy
```

- Na primeira vez ele pergunta o nome do seu subdomínio `workers.dev`; escolha um (por exemplo `meunome`).
- No fim mostra o endereço, algo como `https://yinyang-relay.meunome.workers.dev`. **Anote.**

Confira que está no ar (deve mostrar `ok`):

```bash
curl https://yinyang-relay.meunome.workers.dev/health
```

Neste ponto o Turnstile ainda está desligado (falta a Secret Key), então qualquer um poderia abrir salas. Não
divulgue o endereço ainda e siga direto para o passo 3.

### 3. Criar o widget do Turnstile

No painel da Cloudflare (dash.cloudflare.com): menu **Turnstile** → **Add widget**.

- **Nome do widget:** `yinyang` (qualquer um).
- **Hostnames:** o endereço da página onde o jogo vai rodar, **sem** `https://`, sem porta e sem caminho, por
  exemplo `meujogo.pages.dev`. Adicionar `meujogo.pages.dev` também libera os subdomínios. Se o jogo ainda não tem
  endereço, ponha o que pretende usar e edite depois (o painel permite).
- **Widget Mode:** `Managed` (recomendado).
- Crie e **copie as duas chaves**: **Site Key** e **Secret Key**.

Notas:

- No plano gratuito são até 20 widgets, 10 hostnames por widget e desafios ilimitados.
- A documentação do Turnstile que li não diz se `pages.dev` e `workers.dev` são aceitos como hostname. Se o painel
  recusar, a saída é usar um domínio próprio.
- Não precisa pôr `localhost` no widget: para testar no computador use as chaves de teste (veja mais abaixo).

### 4. Guardar a Secret Key no Worker

```bash
! npx wrangler secret put TURNSTILE_SECRET --config worker/wrangler.jsonc
```

Cole a **Secret Key** quando ele pedir (não aparece na tela) e dê Enter. Isso já ativa o Turnstile no servidor: a
partir de agora, toda conexão precisa de um token válido.

Conferir (mostra só o nome, nunca o valor):

```bash
npx wrangler secret list --config worker/wrangler.jsonc
```

### 5. Dizer ao jogo onde o servidor está e qual é a Site Key

Edite `src/net/config.js`:

```js
export const PRODUCTION_RELAY_URL = "wss://yinyang-relay.meunome.workers.dev"; // wss://, sem barra no fim
export const TURNSTILE_SITE_KEY = "0x4AAAAAAA...";                             // a Site Key (pública)
```

Depois, o commit de sempre (`git add src/net/config.js && git commit -m "chore: configure the production relay"`).

### 6. Restringir quem pode abrir salas (assim que o jogo tiver endereço)

Em `worker/wrangler.jsonc`, ponha o endereço do jogo (com `https://`, separando vários por vírgula):

```jsonc
"ALLOWED_ORIGINS": "https://meujogo.pages.dev"
```

e publique de novo:

```bash
! npm run worker:deploy
```

O Worker passa a recusar conexões vindas de qualquer outra página. (Um script pode inventar esse cabeçalho, então
isso sozinho não basta; é a combinação com o Turnstile que fecha a porta.)

### 7. Testar de verdade

Abra o jogo no endereço publicado com `?online=host`, toque no texto do topo para copiar o link de convite e abra
o link em outro aparelho (ou aba anônima). O amigo deve aparecer e o jogo andar nos dois.

Se algo não funcionar, veja "Se algo der errado" no fim.

## Testar no computador antes de publicar (sem conta)

A Cloudflare dá chaves de **teste** que funcionam em `localhost`:

| Chave | Valor | Efeito |
| --- | --- | --- |
| Site Key | `1x00000000000000000000BB` | invisível, sempre aprova |
| Site Key | `2x00000000000000000000BB` | invisível, sempre recusa |
| Secret Key | `1x0000000000000000000000000000000AA` | aprova qualquer token |
| Secret Key | `2x0000000000000000000000000000000AA` | recusa sempre |

```bash
# 1. Diga ao Worker local para exigir o Turnstile (arquivo ignorado pelo git)
printf 'TURNSTILE_SECRET=1x0000000000000000000000000000000AA\n' > worker/.dev.vars

# 2. Suba o Worker local (porta 8788) e, em outro terminal, o jogo
npm run worker:dev
npm start

# 3. Abra, em duas janelas (a segunda com o link de convite, que inclui o código da sala):
#    http://localhost:3000/?online=host&relay=ws://localhost:8788&turnstileKey=1x00000000000000000000BB
```

Sem o `turnstileKey=...` o Worker local recusa com "Verificação de segurança necessária", que é o esperado.
Os testes automáticos fazem isso sozinhos: `npm run test:worker`.

## Em emergência

- **Alguém está abusando agora:** em `worker/wrangler.jsonc` ponha `"ONLINE_ENABLED": "false"` e publique
  (`npm run worker:deploy`). O servidor recusa tudo com 503 na hora. Volte para `"true"` quando passar.
- **Trocar a Secret Key** (por exemplo, se ela vazou): no painel do Turnstile, no seu widget, gere uma nova
  secret key e rode de novo o passo 4.
- **Desligar só o Turnstile:** `npx wrangler secret delete TURNSTILE_SECRET --config worker/wrangler.jsonc`
  (e deixe `TURNSTILE_SITE_KEY` como `null` no jogo). O jogo volta a funcionar sem o desafio, e fica sem essa proteção.

## O que cada proteção faz (e o que não faz)

| Camada | Onde | Protege contra | Não protege contra |
| --- | --- | --- | --- |
| Código de sala de 6 caracteres, gerado com aleatoriedade segura | jogo | adivinhar a sala de outra pessoa | |
| Convidado só entra em sala que existe | servidor | scripts criando salas vazias | |
| **Turnstile** | Worker (verificação) e jogo (desafio) | **scripts abrindo salas e conexões** (cada conexão exige um token que só um navegador de verdade obtém, de uso único e válido por 5 min). Protege o seu limite de Durable Objects e de duração | requisições sem token ainda contam no limite de 100 mil/dia do **Worker** (são recusadas rápido, mas contam) |
| Limite de tentativas por endereço (20 por minuto) | Worker | um script martelando de um lugar só | vários endereços ao mesmo tempo (é aproximado: cada instância e cada local da Cloudflare conta por si) |
| `ALLOWED_ORIGINS` | Worker | uso do seu servidor por páginas de terceiros | um script que invente o cabeçalho `Origin` |
| Limite de mensagens por conexão e expulsão de quem manda lixo | sala | enxurrada de mensagens dentro de uma sala | |
| Sala expira: 10 min com o anfitrião sozinho, 3 h no máximo | sala | salas esquecidas ocupando recursos | |
| Chave geral `ONLINE_ENABLED` | Worker | ataque em andamento (corta tudo na hora) | |

Contra um volume enorme de requisições, a defesa forte é uma **regra de rate limiting do WAF** da Cloudflare, que
roda antes do Worker. No plano gratuito é 1 regra, janela de 10 s, por endereço, e é de uma *zona*, ou seja,
precisa de um **domínio próprio** na Cloudflare apontando para o Worker. Ela não vale para `workers.dev`. É a
camada seguinte se o jogo virar alvo; a documentação que li não diz se as requisições barradas pelo WAF deixam
de contar no limite do Worker, então confirme no painel se um dia precisar disso.

Lembre também: o plano gratuito **não cobra nada**. Ao estourar um limite, o modo online só fica fora do ar até
as 00:00 UTC.

## Se algo der errado

| O jogo mostra | Causa provável |
| --- | --- |
| "O modo online ainda não está disponível neste endereço" | `PRODUCTION_RELAY_URL` ainda é `null` (passo 5) |
| "Não foi possível conectar ao servidor online" | Worker fora do ar, endereço errado, ou limite de tentativas por endereço (espere 1 minuto) |
| "Verificação de segurança necessária" | o servidor exige o Turnstile e o jogo não tem a Site Key (passo 5) |
| "Não foi possível confirmar que você é uma pessoa" | a Secret Key não é a do mesmo widget da Site Key, ou o hostname da página não está no widget (passo 3) |
| "A verificação de segurança não carregou" | um bloqueador de anúncios, ou rede bloqueando `challenges.cloudflare.com` |
| "Essa sala não existe" | o link é de uma sala que já fechou; peça um novo |
| "A sala expirou" | o anfitrião esperou mais de 10 min sozinho (ou a sala passou de 3 h) |
| "Mensagens demais" / "Mensagens inválidas" | a conexão foi cortada pelo servidor; é proteção, recarregue |

Para ver o que o Worker está fazendo ao vivo: `npx wrangler tail --config worker/wrangler.jsonc`.
