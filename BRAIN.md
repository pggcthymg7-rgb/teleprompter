# 🧠 Cérebro do Projeto: Teleprompter Pro Online (Apple HIG & Gravação de Vídeo)

## 1. Nódulo Central (Core Architecture)
- **Conformidade Apple HIG**:
  - `Translucent Tab Bar`: Barra inferior translúcida de 83pt para fácil alcance do polegar (`safe-area-inset-bottom`).
  - `Inset Grouped Lists`: Agrupamentos nativos com cantos arredondados (16-20px) e bordas especulares.
  - `Apple Bottom Sheets & Action Sheets`: Modais deslizantes com drag handle para seleção de modelos, ajustes rápidos e tela de revisão de vídeo gravado.
  - `Apple Switches (51x31pt)`: Chaves de alternância com verde nativo `#34C759`.
  - `Área de Toque Mínima`: 44x44pt garantida em todos os botões e seletores.
  - `Haptic Feedback`: Disparo tátil em micro-interações através de vibrações sutis.
- **Motor de Gravação & Vídeo**:
  - `Live Camera Stream`: Captura em tempo real via `navigator.mediaDevices.getUserMedia` (frontal selfie com espelhamento natural ou traseira).
  - `MediaRecorder`: Gravação do feed de vídeo + microfone em tempo real (`video/mp4` ou `video/webm`).
  - `Prompter Overlay`: Texto rola suavemente sobreposto ao vídeo com película de contraste ajustável.
  - `Export & Share`: Bottom Sheet com player de vídeo gravado, download direto para o rolo da câmera / arquivos e suporte à Web Share API.

## 2. A Teia de Ramificações (Knowledge Graph / Modularity)
- 🕸️ **Entrypoints & Config**:
  - `vite.config.ts`: Configuração do Vite com `base: '/teleprompter/'`.
  - `index.html`: Shell HTML com safe areas e viewport responsivo.
  - `src/main.tsx`: Ponto de montagem da raiz React.
- 🕸️ **Domain & Prompter Logic**:
  - `src/App.tsx`: Gerenciamento das abas da Tab Bar (`script` | `record` | `settings`), MediaRecorder, contagem regressiva, loop `requestAnimationFrame` e Bottom Sheets.
  - `src/types.ts`: Tipagem expandida com parâmetros de câmera (`cameraFacing`, `overlayOpacity`, `audioEnabled`).
  - `src/templates.ts`: Modelos de script para o mercado imobiliário, pitches e tutoriais.
- 🕸️ **Estilização Apple HIG**:
  - `src/index.css`: Inset groups, switches nativos de 51x31pt, safe area variables (`--sat`, `--sab`), Shutter button estilo Apple Camera e backdrop blurs.
- 🕸️ **CI/CD & Deploy**:
  - `.github/workflows/deploy.yml`: Automação de deploy para o GitHub Pages a cada commit na `main`.

## 3. Matriz de Roteamento Rápido ("Onde ir em cada situação")
- *Ajustar câmera, MediaRecorder e exportação de vídeo* ➔ [App.tsx](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/App.tsx#L90-L240)
- *Ajustar Tab Bar e Bottom Sheets* ➔ [App.tsx](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/App.tsx#L450-L550)
- *Estilos de botões, switches e safe areas* ➔ [index.css](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/index.css)
