import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sliders,
  FlipHorizontal,
  FlipVertical,
  Type,
  Gauge,
  Eye,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Video,
  X,
  AlignLeft,
  AlignCenter,
  AlignJustify
} from 'lucide-react';
import { DEFAULT_SETTINGS, TeleprompterSettings } from './types';
import { TEMPLATES } from './templates';

export default function App() {
  // Etapa atual: 'script' (Roteiro) | 'settings' (Ajustes & Estúdio) | 'prompter' (Gravação Ao Vivo)
  const [currentStep, setCurrentStep] = useState<'script' | 'settings' | 'prompter'>('script');

  const [script, setScript] = useState<string>(() => {
    return localStorage.getItem('teleprompter_script') || TEMPLATES[0].content;
  });

  const [settings, setSettings] = useState<TeleprompterSettings>(() => {
    const saved = localStorage.getItem('teleprompter_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Estados de reprodução no modo Prompter
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);

  // Estado para teste de rolagem no simulador da Etapa 2
  const [isPreviewScrolling, setIsPreviewScrolling] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<any>(null);

  // Persistência local
  useEffect(() => {
    localStorage.setItem('teleprompter_script', script);
  }, [script]);

  useEffect(() => {
    localStorage.setItem('teleprompter_settings', JSON.stringify(settings));
  }, [settings]);

  // Estatísticas de leitura
  const stats = useMemo(() => {
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    const chars = script.length;
    const minutes = Math.floor(words / 130);
    const seconds = Math.round(((words % 130) / 130) * 60);
    const duration = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;
    return { words, chars, duration };
  }, [script]);

  // Transição para modo de gravação
  const startRecording = () => {
    setCurrentStep('prompter');
    setIsPlaying(false);
    if (settings.countdownSeconds > 0) {
      setCountdown(settings.countdownSeconds);
    } else {
      setIsPlaying(true);
    }
  };

  // Contagem regressiva da gravação
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

  // Loop de rolagem no Prompter ao vivo
  useEffect(() => {
    if (currentStep !== 'prompter' || !isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const scrollLoop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (scrollContainerRef.current) {
        const pixelsPerSecond = settings.speed * 28;
        scrollContainerRef.current.scrollTop += pixelsPerSecond * delta;
      }

      animId = requestAnimationFrame(scrollLoop);
    };

    animId = requestAnimationFrame(scrollLoop);
    return () => cancelAnimationFrame(animId);
  }, [currentStep, isPlaying, settings.speed]);

  // Loop de rolagem no simulador da Etapa 2
  useEffect(() => {
    if (currentStep !== 'settings' || !isPreviewScrolling) return;

    let animId: number;
    let lastTime = performance.now();

    const previewLoop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (previewScrollRef.current) {
        const pixelsPerSecond = settings.speed * 28;
        previewScrollRef.current.scrollTop += pixelsPerSecond * delta;
      }

      animId = requestAnimationFrame(previewLoop);
    };

    animId = requestAnimationFrame(previewLoop);
    return () => cancelAnimationFrame(animId);
  }, [currentStep, isPreviewScrolling, settings.speed]);

  // Auto-ocultação do HUD flutuante no modo gravação
  const handleUserActivity = () => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying && currentStep === 'prompter') {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  };

  useEffect(() => {
    if (isPlaying && currentStep === 'prompter') {
      handleUserActivity();
    } else {
      setControlsVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }
  }, [isPlaying, currentStep]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentStep === 'script' && (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (currentStep === 'prompter') {
          setIsPlaying((prev) => !prev);
        } else if (currentStep === 'settings') {
          setIsPreviewScrolling((prev) => !prev);
        } else {
          startRecording();
        }
      } else if (e.code === 'Escape') {
        if (currentStep === 'prompter') {
          setCurrentStep('settings');
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
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop -= 150;
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop += 150;
      } else if (e.key.toLowerCase() === 'm') {
        setSettings((prev) => ({ ...prev, mirrorHorizontal: !prev.mirrorHorizontal }));
      } else if (e.key.toLowerCase() === 'r') {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
        if (previewScrollRef.current) previewScrollRef.current.scrollTop = 0;
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const textColors = [
    { label: 'Branco', value: '#ffffff' },
    { label: 'Amarelo Neon', value: '#facc15' },
    { label: 'Verde Neon', value: '#4ade80' },
    { label: 'Ciano', value: '#38bdf8' },
  ];

  return (
    <div
      className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col font-sans select-none antialiased"
      onMouseMove={handleUserActivity}
    >
      {/* ============================================================== */}
      {/* CABEÇALHO COM NAVEGAÇÃO EM ETAPAS (ESTILO APPLE HIG) */}
      {/* ============================================================== */}
      {currentStep !== 'prompter' && (
        <header className="sticky top-0 z-30 apple-glass border-b border-white/[0.08] px-4 md:px-8 py-3.5 transition-all">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Logotipo e Assinatura */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.25)]">
                🎙️
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Teleprompter <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300">iOS</span>
                </span>
              </div>
            </div>

            {/* Stepper / Segmented Control das 3 Etapas */}
            <nav className="flex items-center p-1 rounded-full bg-zinc-900/90 border border-white/[0.06] shadow-inner text-xs font-medium">
              <button
                onClick={() => setCurrentStep('script')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  currentStep === 'script'
                    ? 'apple-pill-active text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>1. Roteiro</span>
              </button>

              <button
                onClick={() => setCurrentStep('settings')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  currentStep === 'settings'
                    ? 'apple-pill-active text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>2. Ajustes</span>
              </button>

              <button
                onClick={startRecording}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-red-400" />
                <span>3. Gravação</span>
              </button>
            </nav>

            {/* Ação Primária da Etapa */}
            <div>
              {currentStep === 'script' && (
                <button
                  onClick={() => setCurrentStep('settings')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs md:text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  <span>Ajustes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 'settings' && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-semibold text-xs md:text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current text-black" />
                  <span>Gravar</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ============================================================== */}
      {/* ETAPA 1: ROTEIRO (FOCO TOTAL NA ESCRITA, SEM POLUIÇÃO) */}
      {/* ============================================================== */}
      {currentStep === 'script' && (
        <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-8 animate-in fade-in duration-300">
          <div className="flex flex-col gap-6 flex-1">
            {/* Título e Modelos Rápidos estilo Apple Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Seu Roteiro
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Digite ou cole o texto que será exibido no visor de leitura.
                </p>
              </div>

              {/* Modelos */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Modelos:
                </span>
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setScript(tpl.content)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] text-zinc-300 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Cartão de Escrita Apple Glass */}
            <div className="apple-glass-card rounded-3xl p-6 md:p-8 flex-1 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative">
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Cole ou digite aqui seu texto..."
                className="w-full flex-1 min-h-[380px] bg-transparent border-0 outline-none focus:outline-none text-zinc-100 text-lg md:text-xl font-normal leading-relaxed resize-none placeholder:text-zinc-700"
              />

              {/* Barra de Status estilo iOS no rodapé do editor */}
              <div className="pt-4 mt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Tempo de fala: <strong className="text-white font-medium">{stats.duration}</strong>
                  </span>
                  <span>
                    <strong className="text-white font-medium">{stats.words}</strong> palavras
                  </span>
                  <span className="hidden sm:inline">
                    <strong className="text-white font-medium">{stats.chars}</strong> caracteres
                  </span>
                </div>

                <button
                  onClick={() => setScript('')}
                  className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer text-xs"
                >
                  Limpar texto
                </button>
              </div>
            </div>

            {/* Botão de Avanço estilo Apple */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCurrentStep('settings')}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <span>Configurar Câmera e Estúdio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* ETAPA 2: AJUSTES & ESTÚDIO (CONTROLES AGRUPADOS + SIMULADOR AO VIVO) */}
      {/* ============================================================== */}
      {currentStep === 'settings' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna Esquerda: Cartões de Ajustes estilo iOS */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Ajustes de Leitura
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Defina a velocidade ideal da sua fala e o modo de espelhamento óptico.
                </p>
              </div>

              {/* Grupo 1: Velocidade da Fala */}
              <div className="apple-glass-card rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-zinc-300" />
                    <span className="text-sm font-semibold text-white">Velocidade de Rolagem</span>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-bold">
                    Nível {settings.speed}x
                  </span>
                </div>

                {/* Segmented presets rápidos */}
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-white/[0.04]">
                  {[
                    { label: 'Calmo', val: 2 },
                    { label: 'Padrão', val: 3 },
                    { label: 'Ágil', val: 5 },
                    { label: 'Rápido', val: 7 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setSettings({ ...settings, speed: preset.val })}
                      className={`text-xs py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                        settings.speed === preset.val
                          ? 'apple-pill-active text-white font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.speed}
                  onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
              </div>

              {/* Grupo 2: Tamanho da Fonte & Tipografia */}
              <div className="apple-glass-card rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-zinc-300" />
                    <span className="text-sm font-semibold text-white">Tamanho das Letras</span>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-bold">
                    {settings.fontSize}px
                  </span>
                </div>

                {/* Segmented presets rápidos */}
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-white/[0.04]">
                  {[
                    { label: 'Pequeno', val: 36 },
                    { label: 'Médio', val: 48 },
                    { label: 'Grande', val: 64 },
                    { label: 'Extra', val: 80 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setSettings({ ...settings, fontSize: preset.val })}
                      className={`text-xs py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                        settings.fontSize === preset.val
                          ? 'apple-pill-active text-white font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="24"
                  max="96"
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
              </div>

              {/* Grupo 3: Espelhamento Óptico (Vidro e Suporte) */}
              <div className="apple-glass-card rounded-2xl p-5 flex flex-col gap-3">
                <span className="text-sm font-semibold text-white">Espelhamento Óptico para Vidro</span>
                <p className="text-xs text-zinc-400">
                  Ative se estiver gravando através de vidro reflexivo (Beam Splitter) ou suporte de câmera.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setSettings({ ...settings, mirrorHorizontal: !settings.mirrorHorizontal })}
                    className={`flex items-center justify-center gap-2 text-xs py-2.5 px-3 rounded-xl border transition-all cursor-pointer ${
                      settings.mirrorHorizontal
                        ? 'bg-white text-black font-semibold border-white shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    <span>Espelho Horizontal {settings.mirrorHorizontal ? '✓' : ''}</span>
                  </button>

                  <button
                    onClick={() => setSettings({ ...settings, mirrorVertical: !settings.mirrorVertical })}
                    className={`flex items-center justify-center gap-2 text-xs py-2.5 px-3 rounded-xl border transition-all cursor-pointer ${
                      settings.mirrorVertical
                        ? 'bg-white text-black font-semibold border-white shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <FlipVertical className="w-4 h-4" />
                    <span>Espelho Vertical {settings.mirrorVertical ? '✓' : ''}</span>
                  </button>
                </div>
              </div>

              {/* Grupo 4: Guias, Largura e Cores */}
              <div className="apple-glass-card rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-zinc-300" />
                    <div>
                      <div className="text-sm font-semibold text-white">Linha Guia de Olhar</div>
                      <div className="text-[11px] text-zinc-400">Marcador óptico alinhado com a lente</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, guideLine: !settings.guideLine })}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.guideLine ? 'bg-white' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full transition-transform absolute top-0.5 ${
                        settings.guideLine ? 'translate-x-5 bg-black' : 'translate-x-0.5 bg-zinc-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Faixa de Leitura & Alinhamento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-zinc-400">Largura da Leitura</span>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-950/80 border border-white/[0.04]">
                      {[
                        { label: 'Estreita', val: 620 },
                        { label: 'Média', val: 850 },
                        { label: 'Larga', val: 1100 },
                      ].map((w) => (
                        <button
                          key={w.label}
                          onClick={() => setSettings({ ...settings, maxWidth: w.val })}
                          className={`text-xs py-1 rounded-lg transition-all cursor-pointer ${
                            settings.maxWidth === w.val
                              ? 'apple-pill-active text-white font-semibold'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-zinc-400">Alinhamento</span>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-950/80 border border-white/[0.04]">
                      {[
                        { id: 'left', icon: AlignLeft },
                        { id: 'center', icon: AlignCenter },
                        { id: 'justify', icon: AlignJustify },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSettings({ ...settings, textAlign: item.id as any })}
                            className={`flex items-center justify-center py-1 rounded-lg transition-all cursor-pointer ${
                              settings.textAlign === item.id
                                ? 'apple-pill-active text-white'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Cor do Texto de Alto Contraste */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-zinc-400">Cor do Texto</span>
                  <div className="flex items-center gap-2">
                    {textColors.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setSettings({ ...settings, textColor: c.value })}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          settings.textColor === c.value ? 'scale-125 border-white ring-2 ring-white/20' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Simulador de Enquadramento em Tempo Real */}
            <div className="lg:col-span-5 flex flex-col gap-4 sticky top-24">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Pré-visualização do Visor
                </span>
                <button
                  onClick={() => setIsPreviewScrolling(!isPreviewScrolling)}
                  className="text-xs flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 transition-all cursor-pointer"
                >
                  {isPreviewScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPreviewScrolling ? 'Pausar Teste' : 'Testar Rolagem'}</span>
                </button>
              </div>

              {/* Moldura do Dispositivo / Simulador de Vidro */}
              <div className="w-full h-[460px] rounded-3xl bg-[#09090b] border border-white/[0.1] shadow-2xl relative overflow-hidden flex flex-col">
                {/* Dynamic Island / Câmera superior simulada */}
                <div className="w-full h-8 bg-zinc-950/80 border-b border-white/[0.04] flex items-center justify-center relative">
                  <div className="w-20 h-3 rounded-full bg-black border border-white/[0.08]" />
                </div>

                {/* Linha guia no simulador */}
                {settings.guideLine && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-10 flex items-center justify-between px-3"
                    style={{ top: '38%', transform: 'translateY(-50%)' }}
                  >
                    <div className="w-2.5 h-2.5 border-l border-b border-indigo-400/80 -rotate-45" />
                    <div className="flex-1 mx-2 h-[1px] bg-indigo-500/30" />
                    <div className="w-2.5 h-2.5 border-r border-t border-indigo-400/80 -rotate-45" />
                  </div>
                )}

                {/* Conteúdo com os efeitos visuais reais aplicados */}
                <div
                  ref={previewScrollRef}
                  className="flex-1 overflow-y-auto teleprompter-scroller p-6"
                  style={{
                    paddingTop: '35%',
                    paddingBottom: '50%',
                  }}
                >
                  <div
                    className={`transition-transform duration-200 ${
                      settings.mirrorHorizontal && settings.mirrorVertical
                        ? 'mirror-both'
                        : settings.mirrorHorizontal
                        ? 'mirror-h'
                        : settings.mirrorVertical
                        ? 'mirror-v'
                        : ''
                    }`}
                    style={{
                      fontSize: `${Math.round(settings.fontSize * 0.45)}px`,
                      lineHeight: settings.lineHeight,
                      color: settings.textColor,
                      textAlign: settings.textAlign,
                    }}
                  >
                    {script.split('\n').map((p, i) => (
                      <p key={i} className="mb-4">
                        {p || '\u00A0'}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Rodapé da moldura */}
                <div className="p-3 bg-zinc-950/90 border-t border-white/[0.06] text-center text-[11px] text-zinc-400">
                  {settings.mirrorHorizontal ? 'Espelho Horizontal Ativo' : 'Visão Direta Padrão'} • {settings.speed}x
                </div>
              </div>

              {/* Botão de Gravar em Destaque */}
              <button
                onClick={startRecording}
                className="w-full py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-98 transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Play className="w-4 h-4 fill-current text-black" />
                <span>Iniciar Gravação Ao Vivo</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* ETAPA 3: GRAVAÇÃO AO VIVO (VISÃO CINEMÁTICA PURA + APPLE HUD) */}
      {/* ============================================================== */}
      {currentStep === 'prompter' && (
        <div className="fixed inset-0 w-screen h-screen bg-[#000000] overflow-hidden flex flex-col z-50">
          {/* Contagem regressiva minimalista */}
          {countdown !== null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md">
              <div className="text-center animate-pulse">
                <div className="text-9xl font-black text-white tracking-tighter">
                  {countdown === 0 ? 'GO!' : countdown}
                </div>
                <p className="text-zinc-400 text-sm mt-4 tracking-wide uppercase font-medium">
                  Inspire e comece a falar
                </p>
              </div>
            </div>
          )}

          {/* Marcador de Olhar / Linha Guia de Alta Precisão */}
          {settings.guideLine && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-20 flex items-center justify-between px-8"
              style={{ top: '38%', transform: 'translateY(-50%)' }}
            >
              <div className="w-4 h-4 border-l-2 border-b-2 border-white/60 -rotate-45" />
              <div className="flex-1 mx-6 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="w-4 h-4 border-r-2 border-t-2 border-white/60 -rotate-45" />
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
              className={`mx-auto px-8 transition-transform duration-200 ${
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
                <p key={idx} className="mb-10 font-medium tracking-normal select-none">
                  {paragraph || '\u00A0'}
                </p>
              ))}
            </div>
          </div>

          {/* Barra Flutuante Apple Dynamic Capsule (HUD) */}
          <div
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
              controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3 apple-glass px-4 py-2 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-white/10">
              {/* Voltar aos Ajustes */}
              <button
                onClick={() => {
                  setCurrentStep('settings');
                  setIsPlaying(false);
                }}
                title="Voltar aos Ajustes (Esc)"
                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="h-5 w-[1px] bg-white/10" />

              {/* Botão Play / Pause Principal */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                title="Reproduzir / Pausar (Espaço)"
                className={`p-3 rounded-full transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isPlaying
                    ? 'bg-amber-400 hover:bg-amber-300 text-black'
                    : 'bg-white hover:bg-zinc-200 text-black'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {/* Velocidade Stepper */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.05]">
                <button
                  onClick={() => setSettings((s) => ({ ...s, speed: Math.max(1, s.speed - 1) }))}
                  className="px-1.5 py-0.5 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="text-xs font-mono font-semibold text-white min-w-[28px] text-center">
                  {settings.speed}x
                </span>
                <button
                  onClick={() => setSettings((s) => ({ ...s, speed: Math.min(10, s.speed + 1) }))}
                  className="px-1.5 py-0.5 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  +
                </button>
              </div>

              {/* Tamanho Stepper */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.05]">
                <button
                  onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(24, s.fontSize - 4) }))}
                  className="px-1.5 py-0.5 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  A-
                </button>
                <span className="text-xs font-mono font-semibold text-white min-w-[30px] text-center">
                  {settings.fontSize}
                </span>
                <button
                  onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(96, s.fontSize + 4) }))}
                  className="px-1.5 py-0.5 text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
                >
                  +
                </button>
              </div>

              {/* Reiniciar */}
              <button
                onClick={() => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                title="Voltar ao Início (R)"
                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Espelho Horizontal */}
              <button
                onClick={() => setSettings((s) => ({ ...s, mirrorHorizontal: !s.mirrorHorizontal }))}
                title="Espelho Horizontal (M)"
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  settings.mirrorHorizontal ? 'bg-white text-black' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                title="Tela Cheia (F)"
                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
