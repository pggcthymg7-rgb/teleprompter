# 🧠 Cérebro do Projeto: Teleprompter Pro Online (Apple HIG & Safe Areas iPhone 15 Pro)

## 1. Nódulo Central (Core Architecture)
- **Conformidade Apple HIG & Safe Areas**:
  - `viewport-fit=cover`: Ativado no `index.html` para permitir que o WebKit acesse as medidas reais das safe areas do iPhone.
  - `ios-safe-top`: Margem de topo calculada dinamicamente (`calc(max(env(safe-area-inset-top, 0px), 54px) + 16px)`), garantindo que os títulos nunca toquem o Dynamic Island (59px) nem a barra de status em nenhum modelo de iPhone.
  - `ios-safe-x`: Margens laterais (`calc(max(env(safe-area-inset-left, 0px), 16px) + 6px)`) que protegem contra os cantos arredondados físicos da tela OLED.
  - `ios-safe-bottom-scroll` + Spacer Físico: Margem de rodapé de 100px + espaçador `h-28` que garante que o último item de qualquer lista possa ser rolado completamente acima da Tab Bar.
  - `Translucent Tab Bar`: Barra inferior translúcida de 83pt fixada na base (`safe-area-inset-bottom`), posicionada perfeitamente acima da Home Indicator bar.
  - `Área Segura de Leitura (Camera)`: Texto confinado estritamente entre `top-[18%]` e `bottom-[25%]`, com máscara de gradiente suave, impedindo qualquer sobreposição com o botão de gravar ou controles inferiores.
  - `Navegação da Câmera`: Botão **"‹ Voltar"** no padrão Apple HIG (`ios-camera-top`), permitindo retorno imediato ao Roteiro.
- **Motor de Câmera & MediaRecorder**:
  - Captura direta via `getUserMedia` acionada por gesto de toque.
  - Gravação de vídeo/áudio via `MediaRecorder` com codecs otimizados para iOS Safari.
  - Bottom Sheet de Exportação com player de vídeo, download e compartilhamento AirDrop/WhatsApp.

## 2. A Teia de Ramificações (Knowledge Graph / Modularity)
- 🕸️ **Entrypoints & Config**:
  - `index.html`: Configurado com `viewport-fit=cover`, `apple-mobile-web-app-capable` e `theme-color`.
  - `vite.config.ts`: Configuração com `base: '/teleprompter/'`.
  - `src/main.tsx`: Montagem da raiz React.
- 🕸️ **Domain & Prompter Logic**:
  - `src/App.tsx`: Fluxo de navegação em 3 abas (`script` | `record` | `settings`), MediaRecorder, área de leitura delimitada e Bottom Sheets.
  - `src/types.ts`: Tipagem de `TeleprompterSettings`.
  - `src/templates.ts`: Modelos de script (Imóveis, Pitch de 60s, Tutorial).
- 🕸️ **Estilização Apple HIG**:
  - `src/index.css`: Inset groups, switches nativos de 51x31pt, safe area variables (`--sat`, `--sab`), Shutter button estilo Apple Camera e máscara de gradiente do teleprompter.

## 3. Matriz de Roteamento Rápido ("Onde ir em cada situação")
- *Ajustar câmera, MediaRecorder e exportação de vídeo* ➔ [App.tsx](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/App.tsx)
- *Ajustar Safe Areas e margens do iPhone* ➔ [index.css](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/index.css)
- *Modelos de script* ➔ [templates.ts](file:///Users/joaogabrielzava/Documents/GitHub/teleprompter/src/templates.ts)
