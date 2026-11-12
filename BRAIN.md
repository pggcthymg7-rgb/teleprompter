# 🧠 Cérebro do Projeto: Teleprompter Pro Online (Estilo Apple iOS / Lift AI)

## 1. Nódulo Central (Core Architecture)
- **Design System**: Inspirado no Lift AI Photo & Video Editor e nas Apple Human Interface Guidelines (HIG) para iOS.
- **Estrutura por Etapas**:
  - `Etapa 1 (Roteiro)`: Foco puro na escrita, modelos rápidos e contadores de tempo/palavras.
  - `Etapa 2 (Ajustes & Estúdio)`: Controles estilo Ajustes do iOS + Simulador de Teleprompter em tempo real.
  - `Etapa 3 (Gravação Ao Vivo)`: Modo cinemático de imersão total com HUD flutuante (Liquid Glass capsule).
- **Stack**: React 18 + TypeScript + Vite + Tailwind CSS v4 + Lucide React.
- **Hospedagem & Deploy**: GitHub Pages via GitHub Actions automático (`.github/workflows/deploy.yml`).
- **Base Path**: `/teleprompter/`.

## 2. A Teia de Ramificações (Knowledge Graph / Modularity)
- 🕸️ **Entrypoints & Config**:
  - `vite.config.ts`: Configuração do Vite com plugin React e `base: '/teleprompter/'`.
  - `index.html`: Shell HTML inicial com viewport responsivo.
  - `src/main.tsx`: Ponto de montagem da raiz React.
- 🕸️ **Domain & Prompter Logic**:
  - `src/App.tsx`: Fluxo de navegação em 3 etapas (`currentStep`), simulador de enquadramento, loop `requestAnimationFrame`, HUD dinâmico estilo Apple e persistência no `localStorage`.
  - `src/types.ts`: Tipagem de `TeleprompterSettings` e padrões de fábrica.
  - `src/templates.ts`: Roteiros profissionais prontos (imóvel, pitch de 60s, tutorial).
- 🕸️ **Estilização & Óptica Apple**:
  - `src/index.css`: Vidro jateado (`apple-glass`), specular highlights (`border-white/[0.08]`), segmented controls e espelhamento óptico (`mirror-h`, `mirror-v`).
- 🕸️ **CI/CD & Deploy**:
  - `.github/workflows/deploy.yml`: Workflow que compila e publica na branch `gh-pages` a cada push na `main`.

## 3. Matriz de Roteamento Rápido ("Onde ir em cada situação")
- *Ajustar fluxo das etapas e animação do Prompter* ➔ [App.tsx](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/App.tsx)
- *Alterar modelos de texto pré-carregados* ➔ [templates.ts](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/templates.ts)
- *Ajustar parâmetros tipados* ➔ [types.ts](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/types.ts)
- *Estilos visuais Apple Glass e fontes* ➔ [index.css](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/index.css)
