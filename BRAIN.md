# 🧠 Cérebro do Projeto: Teleprompter Pro Online

## 1. Nódulo Central (Core Architecture)
- **Stack**: React 18 + TypeScript + Vite + Tailwind CSS v4 + Lucide React.
- **Hospedagem & Deploy**: GitHub Pages via GitHub Actions automático (`.github/workflows/deploy.yml`).
- **Base Path**: `/teleprompter/` (para resolver assets corretamente em sub-rotas do GitHub Pages).
- **Armazenamento**: LocalStorage persistente (roteiro do usuário e configurações visuais).

## 2. A Teia de Ramificações (Knowledge Graph / Modularity)
- 🕸️ **Entrypoints & Config**:
  - `vite.config.ts`: Configuração do Vite com plugin React e `base: '/teleprompter/'`.
  - `index.html`: Shell HTML inicial com viewport responsivo.
  - `src/main.tsx`: Ponto de montagem da raiz React.
- 🕸️ **Domain & Prompter Logic**:
  - `src/App.tsx`: Gerenciador de estado duplo (Editor vs Prompter), loop de animação contínua com `requestAnimationFrame`, HUD flutuante, atalhos de teclado e persistência local.
  - `src/types.ts`: Definições tipadas de `TeleprompterSettings` e configurações padrão.
  - `src/templates.ts`: Modelos de scripts pré-definidos (imóveis, pitches rápidos e aulas).
- 🕸️ **Estilização & Óptica**:
  - `src/index.css`: Design responsivo, classes para espelhamento óptico horizontal/vertical (`mirror-h`, `mirror-v`), fontes Google Fonts e scrollbars customizadas.
- 🕸️ **CI/CD & Deploy**:
  - `.github/workflows/deploy.yml`: Workflow que compila e publica na branch gh-pages automaticamente a cada push na `main`.

## 3. Matriz de Roteamento Rápido ("Onde ir em cada situação")
- *Ajustar velocidade, animação e rolagem contínua* ➔ [App.tsx](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/App.tsx)
- *Alterar modelos de texto pré-carregados* ➔ [templates.ts](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/templates.ts)
- *Adicionar novos parâmetros de configuração visual* ➔ [types.ts](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/types.ts)
- *Ajustar rotas e deploy para produção* ➔ [vite.config.ts](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/vite.config.ts) & [deploy.yml](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/.github/workflows/deploy.yml)

## 4. Grafo de Relações e Dependências Cruzadas
- `main.tsx` ➔ renderiza `App.tsx`
- `App.tsx` ➔ consome `types.ts` & `templates.ts`
- `App.tsx` ➔ lê e escreve no `localStorage` do navegador
- `deploy.yml` ➔ roda `npm run build` ➔ publica a pasta `dist/` no GitHub Pages
