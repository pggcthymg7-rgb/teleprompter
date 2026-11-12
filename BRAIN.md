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
  - Gravação de vídeo/áudio via `MediaRecorder` com codecs otimizados para iOS Safari (`video/mp4;codecs=avc1`).
  - **Motor de Rolagem Subpixel do Teleprompter**:
    - *Correção de Truncamento do Safari (120Hz)*: Em telas ProMotion (iPhone 15 Pro), incrementos diretos no DOM `scrollTop` menores que 0.5px eram truncados para zero, fazendo 1x e 2x ficarem congelados e 3x saltar bruscamente.
    - *Acumulador Contínuo em Ponto Flutuante*: `scrollPosRef` preserva frações de pixel entre frames, garantindo fluidez contínua em qualquer taxa de quadros (60Hz / 120Hz).
    - *Calibragem Linear & Escala WPM*: 1x (16 px/s), 2x (28 px/s), 3x (40 px/s), proporcional ao tamanho da fonte.
    - *Controle de Precisão com Passo 0.5x*: Presets rápidos + sliders nativos no Ajustes e no Quick Settings.
  - **Exportação Nativa para a Galeria de Fotos (Camera Roll / Fotos)**:
    - *Sandbox do Safari*: Downloads via `<a download>` são restritos pela Apple à pasta "Downloads" do app "Arquivos".
    - *Solução Oficial Apple*: Invocação do `navigator.share({ files: [file] })` com arquivo `video/mp4`.
    - *Resultado*: Abre a Folha de Compartilhamento nativa do iOS, onde a ação primária **"Salvar Vídeo"** grava diretamente na Galeria de Fotos (Camera Roll) do iPhone.
    - *Opções Secundárias*: Botões dedicados para "Salvar em Arquivos" e "AirDrop / WhatsApp".

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
