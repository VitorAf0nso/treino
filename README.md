# Treino

App pessoal de acompanhamento de treino, alimentacao e ganho de peso.
PWA offline, um unico usuario, dados so no aparelho.

---

## Colocar no iPhone — passo a passo

### 1. No computador (uma vez)

```bash
cd "caminho/para/treino"
npm install
```

### 2. Criar o repositorio no GitHub

Crie um repositorio **publico** chamado `treino` em github.com/new
(publico e necessario para o GitHub Pages no plano gratuito; nao ha nada sensivel no codigo —
seus dados nunca saem do celular).

Depois, na pasta do projeto:

```bash
git init
git add .
git commit -m "app de treino"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/treino.git
git push -u origin main
```

### 3. Publicar

```bash
npm run deploy
```

Isso compila e envia a pasta `dist/` para a branch `gh-pages`.

Na primeira vez, va em **Settings > Pages** no GitHub e confirme:
- Source: **Deploy from a branch**
- Branch: **gh-pages** / **(root)**

Em 1-2 minutos o app estara em:

```
https://SEU-USUARIO.github.io/treino/
```

> Se o seu usuario do GitHub for diferente ou voce usar outro nome de repositorio,
> ajuste o `base` em `vite.config.ts` para `/nome-do-repo/`.

### 4. Instalar no iPhone

1. Abra o link **no Safari** (Chrome no iOS nao instala PWA)
2. Botao de compartilhar (□↑) > role para baixo > **Adicionar a Tela de Inicio** > Adicionar
3. **Feche o Safari. A partir de agora, use so o icone da tela de inicio.**

> **Importante:** o Safari e o app instalado guardam dados **separados**.
> Se voce abrir a URL pelo Safari depois de comecar a usar, vai ver um app vazio —
> nao e perda de dados, e outro armazenamento. Use sempre o icone.

4. Abra pelo icone e aceite o pedido de armazenamento persistente
5. Ative o modo aviao e abra de novo para confirmar que funciona offline

### 5. Atualizar depois

```bash
npm run deploy
```

O app se atualiza sozinho na proxima abertura com internet.
**Seus dados nao sao tocados** — ficam no IndexedDB, independente do codigo.

---

## Backup

Os dados vivem **so neste aparelho**. Nao ha servidor, nao ha conta, nao ha sincronizacao.

**Exporte uma vez por mes:** Ajustes > Exportar JSON > salvar em Arquivos/iCloud.
O app avisa quando passa de 30 dias sem backup.

- **Exportar JSON** — todos os dados menos as fotos (arquivo pequeno, poucos kB)
- **Exportar com fotos** — inclui as imagens em base64 (arquivo grande)
- **Importar JSON** — substitui tudo pelo conteudo do arquivo

---

## Desenvolvimento

```bash
npm run dev       # servidor local
npm run build     # compila para dist/
npm run test      # logica + renderizacao de todas as telas
npm run preview   # serve o build (util para testar no celular via rede local)
```

Para testar no iPhone antes de publicar: `npm run preview` e acesse
`http://IP-DO-PC:4173/treino/` pela rede local. (Sem HTTPS o service worker
nao registra, entao o offline so da para testar depois de publicar.)

---

## Como esta organizado

```
src/
  seed.ts        catalogo de exercicios, programa A/B/C, alimentos, metas padrao
  types.ts       formato dos dados
  store.ts       estado + persistencia (IndexedDB, com espelho em localStorage)
  db.ts          wrapper de IndexedDB (dados + blobs das fotos)
  actions.ts     todas as mutacoes de estado
  nav.ts         pilha de navegacao
  lib/
    calc.ts      progressao de carga, recordes, media movel, projecao, traducao de deficit
    rules.ts     os alertas (2 semanas abaixo, plato, jejum, backup, modo viagem)
    date.ts      datas em horario local
    photos.ts    compressao de imagem (1080px, JPEG 0.75)
    backup.ts    export/import JSON
    sound.ts     bip do cronometro
  components/    ui.tsx (stepper, sheet, toast...), charts.tsx (SVG), icons.tsx
  screens/       uma tela por arquivo
tests/
  smoke.ts       logica pura: recordes, media movel, metas, regras
  render.tsx     renderiza todas as telas em varios estados
```

### Decisoes que valem lembrar

- **Programa e catalogo nao sao dados do usuario.** Vivem em `seed.ts` e sao recarregados a cada
  abertura. Da para corrigir o programa sem migrar nada, porque as sessoes gravadas guardam ids.
- **Historico e por exercicio, nao por posicao na ficha.** Trocar leg press por hack na sessao nao
  mistura as cargas dos dois.
- **Encolhimento (dia B) e stiff (dia C)** entram sozinhos em 01/09/2026 — sao slots com data.
- **Modo viagem** liga sozinho de 01/09 a 30/09/2026 e baixa a meta para 2.600 kcal.
- **Fotos** sao reduzidas para 1080 px e ~200 kB antes de salvar. 36 fotos/ano ≈ 7 MB.
- **Cronometro** e baseado em timestamp, nao em tick: sobrevive a tela apagar.
