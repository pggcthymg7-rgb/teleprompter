import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Settings2,
  FlipHorizontal,
  FlipVertical,
  Type,
  Gauge,
  Eye,
  FileText,
  Clock,
  Sparkles,
  ArrowLeft,
  Keyboard,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignJustify
} from 'lucide-react';
import { DEFAULT_SETTINGS, TeleprompterSettings } from './types';
import { TEMPLATES } from './templates';

export default function App() {
  const [mode, setMode] = useState<'editor' | 'prompter'>('editor');
  const [script, setScript] = useState<string>(() => {
    return localStorage.getItem('teleprompter_script') || TEMPLATES[0].content;
  });
  const [settings, setSettings] = useState<TeleprompterSettings>(() => {
    const saved = localStorage.getItem('teleprompter_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<any>(null);

  // Salvar no localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter_script', script);
  }, [script]);

  useEffect(() => {
    localStorage.setItem('teleprompter_settings', JSON.stringify(settings));
  }, [settings]);

  // Estatísticas do texto
  const stats = useMemo(() => {
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    const chars = script.length;
    // Média de fala: ~130 palavras por minuto
    const minutes = Math.floor(words / 130);
    const seconds = Math.round(((words % 130) / 130) * 60);
    const duration = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;
    return { words, chars, duration };
  }, [script]);

  // Iniciar modo Prompter com contagem regressiva
  const startPrompter = () => {
    setMode('prompter');
    setIsPlaying(false);
    if (settings.countdownSeconds > 0) {
      setCountdown(settings.countdownSeconds);
    } else {
      setIsPlaying(true);
    }
  };

  // Contagem regressiva
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      setIsPlaying(true);
    }
  }, [countdown]);

  // Loop de rolagem suave contínua
  useEffect(() => {
    if (mode !== 'prompter' || !isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const scrollLoop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (scrollContainerRef.current) {
        // Velocidade base em pixels por segundo ajustada de 1 a 10
        const pixelsPerSecond = settings.speed * 28;
        scrollContainerRef.current.scrollTop += pixelsPerSecond * delta;
      }

      animId = requestAnimationFrame(scrollLoop);
    };

    animId = requestAnimationFrame(scrollLoop);
    return () => cancelAnimationFrame(animId);
  }, [mode, isPlaying, settings.speed]);

  // Auto-esconder controles ao reproduzir
  const handleUserActivity = () => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying && mode === 'prompter') {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  };

  useEffect(() => {
    if (isPlaying && mode === 'prompter') {
      handleUserActivity();
    } else {
      setControlsVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }
  }, [isPlaying, mode]);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se estiver digitando no editor, não captura atalhos de navegação
      if (mode === 'editor' && (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'prompter') {
          setIsPlaying((prev) => !prev);
        } else {
          startPrompter();
        }
      } else if (e.code === 'Escape') {
        if (mode === 'prompter') {
          setMode('editor');
          setIsPlaying(false);
          setCountdown(null);
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, speed: Math.min(10, prev.speed + 1) }));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, speed: Math.max(1, prev.speed - 1) }));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop -= 150;
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += 150;
        }
      } else if (e.key.toLowerCase() === 'm') {
        setSettings((prev) => ({ ...prev, mirrorHorizontal: !prev.mirrorHorizontal }));
      } else if (e.key.toLowerCase() === 'r') {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const resetScroll = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Cores pré-definidas de alto contraste
  const textColors = [
    { label: 'Branco', value: '#ffffff' },
    { label: 'Amarelo Neon', value: '#facc15' },
    { label: 'Verde Neon', value: '#4ade80' },
    { label: 'Ciano', value: '#38bdf8' },
  ];

  const bgColors = [
    { label: 'Preto Total', value: '#000000' },
    { label: 'Grafite Noturno', value: '#0d0e12' },
    { label: 'Azul Escuro', value: '#0a101d' },
  ];

  return (
    <div
      className="min-h-screen text-zinc-100 flex flex-col font-sans select-none"
      style={{ backgroundColor: mode === 'prompter' ? settings.backgroundColor : '#09090b' }}
      onMouseMove={handleUserActivity}
    >
      {/* ============================================================== */}
      {/* MODO EDITOR */}
      {/* ============================================================== */}
      {mode === 'editor' && (
        <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between pb-6 border-b border-zinc-800/80 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
                🎙️
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  Teleprompter Pro
                </h1>
                <p className="text-xs text-zinc-400">
                  Pronto para gravações profissionais, câmeras e espelhamento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startPrompter}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer text-sm md:text-base"
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Teleprompter
              </button>
            </div>
          </header>

          {/* Grid Principal */}
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1">
            {/* Coluna Esquerda: Editor de Texto */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Barra de Ferramentas do Roteiro */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 backdrop-blur-md p-3.5 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Modelos:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setScript(tpl.content)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700/50"
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setScript('')}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Limpar texto
                </button>
              </div>

              {/* Área de Texto */}
              <div className="flex-1 relative flex flex-col">
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Cole ou digite seu roteiro aqui..."
                  className="w-full flex-1 min-h-[380px] p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-100 font-sans leading-relaxed text-base resize-none transition-all placeholder:text-zinc-600 shadow-inner"
                />

                {/* Métricas do Script */}
                <div className="flex items-center justify-between px-4 py-2.5 mt-2 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-xs text-zinc-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <strong className="text-zinc-200">{stats.words}</strong> palavras
                    </span>
                    <span>
                      <strong className="text-zinc-200">{stats.chars}</strong> caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Tempo estimado: <strong className="text-zinc-200">{stats.duration}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Painel de Ajustes e Visualização */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-zinc-900/60 backdrop-blur-md p-5 rounded-2xl border border-zinc-800 flex flex-col gap-5">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-sm font-semibold text-zinc-200">
                  <Settings2 className="w-4 h-4 text-indigo-400" />
                  Configurações de Exibição
                </div>

                {/* Tamanho da Fonte */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-indigo-400" /> Tamanho do Texto
                    </span>
                    <span className="font-mono text-zinc-200 font-semibold">{settings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="96"
                    value={settings.fontSize}
                    onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Velocidade da Rolagem */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" /> Velocidade de Rolagem
                    </span>
                    <span className="font-mono text-zinc-200 font-semibold">Nível {settings.speed}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.speed}
                    onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Largura de Leitura (Margens) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-400">Largura da Faixa de Leitura</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Estreita', val: 620 },
                      { label: 'Média', val: 850 },
                      { label: 'Ampla', val: 1100 },
                    ].map((w) => (
                      <button
                        key={w.label}
                        onClick={() => setSettings({ ...settings, maxWidth: w.val })}
                        className={`text-xs py-1.5 rounded-lg border transition-all cursor-pointer ${
                          settings.maxWidth === w.val
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                            : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alinhamento */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-400">Alinhamento do Texto</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'left', label: 'Esquerda', icon: AlignLeft },
                      { id: 'center', label: 'Centro', icon: AlignCenter },
                      { id: 'justify', label: 'Justificado', icon: AlignJustify },
                    ].map((align) => {
                      const Icon = align.icon;
                      return (
                        <button
                          key={align.id}
                          onClick={() => setSettings({ ...settings, textAlign: align.id as any })}
                          className={`flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-all cursor-pointer ${
                            settings.textAlign === align.id
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                              : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {align.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Paleta de Cores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-400" /> Cor do Texto
                    </span>
                    <div className="flex items-center gap-2">
                      {textColors.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setSettings({ ...settings, textColor: c.value })}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                          className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                            settings.textColor === c.value ? 'scale-110 border-white' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-zinc-400">Fundo</span>
                    <div className="flex items-center gap-2">
                      {bgColors.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setSettings({ ...settings, backgroundColor: c.value })}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                          className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                            settings.backgroundColor === c.value ? 'scale-110 border-indigo-500' : 'border-zinc-700 opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Espelhamento para Vidro (Beam Splitter Glass) */}
                <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-zinc-300">Espelhamento Óptico (Vidro Reflexivo)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, mirrorHorizontal: !settings.mirrorHorizontal })}
                      className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all cursor-pointer ${
                        settings.mirrorHorizontal
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      Espelho Horizontal {settings.mirrorHorizontal ? '(Ativo)' : ''}
                    </button>

                    <button
                      onClick={() => setSettings({ ...settings, mirrorVertical: !settings.mirrorVertical })}
                      className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all cursor-pointer ${
                        settings.mirrorVertical
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      Espelho Vertical {settings.mirrorVertical ? '(Ativo)' : ''}
                    </button>
                  </div>
                </div>

                {/* Linha Guia & Contagem Regressiva */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, guideLine: !settings.guideLine })}
                    className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border transition-all cursor-pointer ${
                      settings.guideLine
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                        : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Guia de Foco {settings.guideLine ? 'Ligada' : 'Desligada'}
                  </button>

                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        countdownSeconds: settings.countdownSeconds === 3 ? 5 : settings.countdownSeconds === 5 ? 0 : 3,
                      })
                    }
                    className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl bg-zinc-800/40 border border-zinc-700/60 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Contagem: {settings.countdownSeconds}s
                  </button>
                </div>
              </div>

              {/* Dica de Atalhos de Teclado */}
              <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 text-xs text-zinc-400 flex flex-col gap-2">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-indigo-400" /> Atalhos Úteis na Gravação
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-400">
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">Espaço</kbd> Pausar / Rolar</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">↑ / ↓</kbd> Velocidade</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">← / →</kbd> Pular 5 seg</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">R</kbd> Voltar ao início</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">M</kbd> Espelho horizontal</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">Esc</kbd> Voltar ao editor</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO PROMPTER (TELA DE GRAVAÇÃO) */}
      {/* ============================================================== */}
      {mode === 'prompter' && (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col z-50">
          {/* Overlay de Contagem Regressiva */}
          {countdown !== null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="text-center animate-pulse">
                <div className="text-9xl font-black text-indigo-400 tracking-tighter">
                  {countdown === 0 ? 'Gravando!' : countdown}
                </div>
                <p className="text-zinc-400 text-lg mt-4">Prepare-se para falar...</p>
              </div>
            </div>
          )}

          {/* Linha Guia Óptica / Marcador de Olhar */}
          {settings.guideLine && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-20 flex items-center justify-between px-6"
              style={{ top: '38%', transform: 'translateY(-50%)' }}
            >
              <div className="w-4 h-4 border-l-2 border-b-2 border-indigo-400/80 -rotate-45" />
              <div className="flex-1 mx-4 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
              <div className="w-4 h-4 border-r-2 border-t-2 border-indigo-400/80 -rotate-45" />
            </div>
          )}

          {/* Área Rolante do Texto */}
          <div
            ref={scrollContainerRef}
            className="flex-1 w-full h-full overflow-y-auto teleprompter-scroller relative"
            style={{
              paddingTop: '38vh',
              paddingBottom: '60vh',
            }}
          >
            <div
              className={`mx-auto transition-transform duration-200 px-6 ${
                settings.mirrorHorizontal && settings.mirrorVertical
                  ? 'mirror-both'
                  : settings.mirrorHorizontal
                  ? 'mirror-h'
                  : settings.mirrorVertical
                  ? 'mirror-v'
                  : ''
              }`}
              style={{
                maxWidth: `${settings.maxWidth}px`,
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                color: settings.textColor,
                textAlign: settings.textAlign,
              }}
            >
              {script.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-8 font-medium tracking-normal select-none">
                  {paragraph || '\u00A0'}
                </p>
              ))}
            </div>
          </div>

          {/* Barra de Controle Flutuante (HUD) */}
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
              controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2 bg-zinc-950/90 backdrop-blur-xl px-4 py-2.5 rounded-full border border-zinc-800 shadow-2xl shadow-black/80">
              {/* Voltar ao Editor */}
              <button
                onClick={() => {
                  setMode('editor');
                  setIsPlaying(false);
                }}
                title="Voltar ao Editor (Esc)"
                className="p-2.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="h-6 w-[1px] bg-zinc-800 mx-1" />

              {/* Reiniciar */}
              <button
                onClick={resetScroll}
                title="Voltar ao Topo (R)"
                className="p-2.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Botão Play / Pause Principal */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                title="Reproduzir / Pausar (Espaço)"
                className={`p-3.5 rounded-full transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
              </button>

              {/* Velocidade */}
              <div className="flex items-center gap-1.5 px-2 bg-zinc-900 rounded-full border border-zinc-800/80">
                <button
                  onClick={() => setSettings((s) => ({ ...s, speed: Math.max(1, s.speed - 1) }))}
                  className="px-2 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="text-xs font-mono font-bold text-amber-400 min-w-[28px] text-center">
                  {settings.speed}x
                </span>
                <button
                  onClick={() => setSettings((s) => ({ ...s, speed: Math.min(10, s.speed + 1) }))}
                  className="px-2 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  +
                </button>
              </div>

              {/* Tamanho da Fonte */}
              <div className="flex items-center gap-1.5 px-2 bg-zinc-900 rounded-full border border-zinc-800/80">
                <button
                  onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(24, s.fontSize - 4) }))}
                  className="px-2 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  A-
                </button>
                <span className="text-xs font-mono font-bold text-indigo-400 min-w-[32px] text-center">
                  {settings.fontSize}
                </span>
                <button
                  onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(96, s.fontSize + 4) }))}
                  className="px-2 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  A+
                </button>
              </div>

              {/* Espelho Horizontal */}
              <button
                onClick={() => setSettings((s) => ({ ...s, mirrorHorizontal: !s.mirrorHorizontal }))}
                title="Espelho Horizontal (M)"
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  settings.mirrorHorizontal ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>

              {/* Tela Cheia */}
              <button
                onClick={toggleFullscreen}
                title="Tela Cheia (F)"
                className="p-2.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
