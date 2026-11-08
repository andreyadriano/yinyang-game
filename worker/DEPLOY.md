# Publicar o jogo e o servidor online: passo a passo

Um **único Worker** da Cloudflare serve o jogo (o site) **e** as salas do co-op online, no mesmo endereço
(por exemplo `https://jogo.seudominio.com`). Tudo no plano gratuito, sem cartão. Tempo: uns 20 minutos, mais a
espera do DNS se você ainda não usa a Cloudflare no seu domínio.

O caminho principal é **pelo Git**: você liga o Worker ao repositório do GitHub e, depois disso, cada `git push` publica
o jogo. Quem preferir o terminal tem a alternativa no fim do passo a passo.

Os comandos `git ...` abaixo são para o terminal, dentro da pasta do projeto. (Comandos que começam com `!` rodam
na sessão do Claude Code; fora dela é só tirar o `!`.)

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
| **Secret Key** do Turnstile | **Sim** | No Cloudflare, como *secret* do Worker chamado `TURNSTILE_SECRET` | No painel: Worker, Settings, Variables and Secrets, tipo **Secret** (ou `npx wrangler secret put TURNSTILE_SECRET`) |
| O seu endereço (`jogo.seudominio.com`) | Não | `wrangler.jsonc`, em `routes` | Editar o arquivo |
| Servidor das salas | — | **Nada a configurar:** por padrão é o mesmo endereço da página | `PRODUCTION_RELAY_URL` só se o servidor ficar em outro lugar |
| Páginas permitidas | Não | `wrangler.jsonc`, em `ALLOWED_ORIGINS` (já vem `"self"`: só a própria página) | Só se quiser liberar outras |
| Chaves de **teste** do Turnstile (só para rodar no seu computador) | Não | `.dev.vars` (ignorado pelo git) | Ver "Testar no computador" abaixo |

Regras de ouro:

- A **Secret Key** nunca vai em arquivo do projeto, nem no `wrangler.jsonc`, nem no git, nem no chat. Só no painel
  (tipo **Secret**) ou pelo comando `wrangler secret put`, que a guardam cifrada na Cloudflare.
- A **Site Key** é feita para ficar à mostra no código do jogo; sozinha ela não serve para nada.
- Você **não precisa** criar nenhum "API token": ao ligar o Git, a Cloudflare gera o dela sozinha, e o
  `wrangler login` (caminho do terminal) usa o navegador.

## Passo a passo (pelo Git: a Cloudflare publica sozinha a cada push)

O caminho abaixo liga o Worker ao repositório do GitHub: depois de pronto, **cada `git push` na branch de produção
publica o jogo**. Você não precisa instalar nem logar nada no seu computador (só se quiser usar o terminal, no
fim). São 3 fases, e dá para parar depois de cada uma, com tudo funcionando:

- **Fase A:** o jogo e o servidor online no ar em `https://yinyang.SEU-SUBDOMINIO.workers.dev` (sem domínio próprio).
- **Fase B:** o mesmo, no seu endereço (`jogo.seudominio.com`).
- **Fase C:** o Turnstile (a verificação "você é uma pessoa") ligado.

### Fase A: colocar no ar

**A1. Enviar o código ao GitHub.** A Cloudflare só enxerga o que está no GitHub, e a `develop` local tem commits que o
`origin` ainda não tem. No terminal, na pasta do projeto:

```bash
git push origin develop
```

(É um push normal, sem `--force`.)

**A2. Criar o Worker ligado ao repositório.** Em dash.cloudflare.com, no menu **Workers & Pages**, clique em
**Create application** e escolha **Import a repository** (conectar ao Git). Autorize a Cloudflare no GitHub e
escolha o repositório `yinyang-game`. Na tela de configuração, preencha **exatamente** assim:

| Campo | Valor |
| --- | --- |
| Project name (o nome do Worker) | `yinyang` (**tem de ser igual** ao `name` do `wrangler.jsonc`) |
| Production branch | `develop` (ou `master`, depois que você juntar nela: veja a nota abaixo) |
| Build command | `npm run build:site` |
| Deploy command | `npx wrangler deploy` (é o padrão: deixe assim) |
| Root directory | `/` (o padrão) |
| Build variables (em "Advanced settings") | nome `HUSKY`, valor `0` |

Em seguida **Save and Deploy**. A Cloudflare instala as dependências, roda o build command (que monta a pasta
`dist/` com o site) e o deploy command. Leva uns minutos; acompanhe em **Builds**.

Se for a primeira vez que você usa Workers, o painel pede para escolher o seu **subdomínio `workers.dev`** (por
exemplo `meunome`): escolha um.

**A3. Conferir.** Quando o build ficar verde, o painel mostra o endereço do Worker, algo como
`https://yinyang.meunome.workers.dev`. Abra no navegador (deve abrir o jogo) e abra
`https://yinyang.meunome.workers.dev/health` (deve mostrar `ok`).

**A4. Testar o online.** Abra `https://yinyang.meunome.workers.dev/?online=host`, toque no texto do topo para copiar
o link de convite e abra em outro aparelho (ou aba anônima). O amigo deve aparecer e o jogo andar nos dois.

Neste ponto já funciona. Sem o Turnstile (Fase C) qualquer pessoa com o link consegue abrir salas, então não divulgue
o endereço ainda.

> **Nota sobre a branch de produção:** o trabalho novo está na `develop`; a `master` ainda não o tem. Ou você deixa a
> produção na `develop`, ou junta a `develop` na `master` e muda **Settings, Build, Branch control** para `master`.
> **Deixe "Enable Preview Builds" desmarcado:** a documentação diz que Workers com Durable Objects não geram URLs de
> versão, então as prévias de outras branches não ajudariam e só gastariam minutos de build.

### Fase B: usar o seu endereço

**B1. Pôr o domínio na Cloudflare** (leia "Antes de começar" acima: precisa ser o DNS do domínio). Painel,
**Add a domain**, plano **Free**; troque os nameservers no site onde registrou o domínio pelos dois que ela mostrar;
espere ficar **Active**. Confira os registros importados (principalmente e-mail, os MX).

**B2. Apontar o Worker para o endereço.** Edite o `wrangler.jsonc` (na raiz): tire os `//` da linha `routes` e ponha o
seu endereço:

```jsonc
"routes": [{ "pattern": "jogo.seudominio.com", "custom_domain": true }],
```

O endereço **não pode já ter um registro CNAME** no DNS da Cloudflare (apague-o antes, se houver). Faça o commit e o
push; o build publica e a Cloudflare cria sozinha o registro DNS e o certificado HTTPS (pode levar alguns minutos):

```bash
git add wrangler.jsonc && git commit -m "chore: serve the game on its own domain" && git push
```

**B3. Conferir:** `https://jogo.seudominio.com/health` deve mostrar `ok`, e o jogo deve abrir.

Se você ainda não tem domínio na Cloudflare, pule esta fase: o endereço `workers.dev` da Fase A continua valendo.

### Fase C: ligar o Turnstile

**C1. Criar o widget.** No painel: menu **Turnstile**, **Add widget**.

- **Nome:** `yinyang` (qualquer um).
- **Hostnames:** o endereço onde o jogo roda, **sem** `https://`, sem porta e sem caminho: `jogo.seudominio.com` (ou, sem
  domínio próprio, `yinyang.meunome.workers.dev`; a documentação que li não diz se `workers.dev` é aceito, e se o
  painel recusar é preciso um domínio). Adicionar um nome libera também os subdomínios dele.
- **Widget Mode:** `Managed`.
- Crie e **copie as duas chaves**: **Site Key** (pública) e **Secret Key** (secreta).

**C2. Guardar a Secret Key no Worker.** No painel: **Workers & Pages**, o Worker `yinyang`, **Settings**,
**Variables and Secrets**, **Add**:

- **Type:** `Secret` (**não** use "Text": texto fica visível no painel)
- **Variable name:** `TURNSTILE_SECRET`
- **Value:** cole a Secret Key e salve.

Isso liga o Turnstile no servidor: a partir de agora toda conexão exige um token válido. (Não use as "Build variables"
para isto: elas só existem durante o build e **não chegam** ao Worker em execução.)

Alternativa pelo terminal (precisa de `npx wrangler login` uma vez):
`npx wrangler secret put TURNSTILE_SECRET`

**C3. Dar a Site Key ao jogo.** Edite `src/net/config.js`:

```js
export const TURNSTILE_SITE_KEY = "0x4AAAAAAA...";   // a Site Key (pública)
```

e faça o commit e o push (o build publica):

```bash
git add src/net/config.js && git commit -m "chore: configure the Turnstile site key" && git push
```

**C4. Conferir.** Repita o teste do A4. O jogo agora pede o desafio (invisível, quase sempre sem você ver) antes de
conectar. Depois do primeiro build automático depois do C2, confirme que o secret continua lá: em
**Variables and Secrets** deve aparecer `TURNSTILE_SECRET`. (A documentação que li não diz se um deploy automático
preserva secrets; na prática costuma preservar.)

### Pronto. E agora?

- Para **atualizar o jogo**, é só `git push`: a Cloudflare monta o site e publica.
- Limites do plano gratuito dos builds: 3.000 minutos por mês, 1 build por vez, 20 minutos por build; este leva poucos.
- Se algo falhar, veja "Se algo der errado" no fim e o log em **Builds** no painel.

## Alternativa: publicar pelo terminal (sem ligar o Git)

```bash
npx wrangler login      # abre o navegador, uma vez
npm run deploy          # monta o site e publica o Worker
npx wrangler secret put TURNSTILE_SECRET   # cola a Secret Key
```

O nome do Worker é o `name` do `wrangler.jsonc` (`yinyang`). Se você publicou assim e depois ligou o Git, use o mesmo
nome na tela de conexão para continuar no mesmo Worker.

## Atualizar o jogo depois

Qualquer mudança em `src/`, `assets/`, `index.html` ou `main.css` só chega às pessoas depois de publicar. Com o Git
ligado, é só enviar:

```bash
git push
```

(Sem o Git ligado: `npm run deploy`. O site é servido pelo Worker, então publicar o Worker é o que publica o jogo.)

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
printf 'TURNSTILE_SECRET=1x0000000000000000000000000000000AA\n' > .dev.vars   # ignorado pelo git
npm run worker:dev
# abra: http://localhost:8788/?online=host&relay=same&turnstileKey=1x00000000000000000000BB
```

Sem o `turnstileKey=...` o Worker local recusa com "Verificação de segurança necessária", que é o esperado.
Para voltar ao normal, apague `.dev.vars`. Os testes automáticos fazem tudo isso sozinhos: `npm run test:worker`.

## Em emergência

- **Alguém está abusando agora:** em `wrangler.jsonc` ponha `"ONLINE_ENABLED": "false"`, faça o commit e o `git push`
  (ou `npm run deploy`). O servidor recusa tudo com 503 na hora (o site continua abrindo). Volte para `"true"` depois.
- **Trocar a Secret Key** (por exemplo, se ela vazou): no painel do Turnstile, no seu widget, gere uma nova
  secret key e troque o valor de `TURNSTILE_SECRET` (passo C2).
- **Desligar só o Turnstile:** apague o secret `TURNSTILE_SECRET` no painel (ou `npx wrangler secret delete TURNSTILE_SECRET`)
  e deixe `TURNSTILE_SITE_KEY` como `null` no jogo (e faça o `git push`). O jogo volta a funcionar sem o desafio, e fica sem essa proteção.

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
| "Verificação de segurança necessária" | o servidor exige o Turnstile e o jogo não tem a Site Key (passo C3) |
| "Não foi possível confirmar que você é uma pessoa" | a Secret Key não é a do mesmo widget da Site Key, ou o hostname da página não está no widget (passo C1) |
| "A verificação de segurança não carregou" | um bloqueador de anúncios, ou rede bloqueando `challenges.cloudflare.com` |
| "Essa sala não existe" | o link é de uma sala que já fechou; peça um novo |
| "A sala expirou" | o anfitrião esperou mais de 10 min sozinho (ou a sala passou de 3 h) |
| "Mensagens demais" / "Mensagens inválidas" | a conexão foi cortada pelo servidor; é proteção, recarregue |

Se a página abre mas conexões são recusadas com 403: a página que abriu o jogo não é a mesma do Worker (por
exemplo, o jogo hospedado em outro lugar). Ponha o endereço dessa página em `ALLOWED_ORIGINS`.

Para ver o que o Worker está fazendo ao vivo: `npx wrangler tail`.
