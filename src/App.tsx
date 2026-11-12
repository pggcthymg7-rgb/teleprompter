import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Sliders,
  Video,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  Type,
  Gauge,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Download,
  Share2,
  ChevronRight,
  SwitchCamera,
  Mic,
  MicOff,
  Layers,
  CircleAlert
} from 'lucide-react';
import { DEFAULT_SETTINGS, TeleprompterSettings } from './types';
import { TEMPLATES } from './templates';

// Feedback tátil nativo
const triggerHaptic = (duration = 15) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignora em navegadores sem suporte
    }
  }
};

export default function App() {
  // Aba ativa da Tab Bar: 'script' | 'record' | 'settings'
  const [activeTab, setActiveTab] = useState<'script' | 'record' | 'settings'>('script');

  // Estado do Roteiro
  const [script, setScript] = useState<string>(() => {
    return localStorage.getItem('teleprompter_script') || TEMPLATES[0].content;
  });

  // Configurações
  const [settings, setSettings] = useState<TeleprompterSettings>(() => {
    const saved = localStorage.getItem('teleprompter_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Estados de Câmera e Gravação
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Estados de Rolagem do Prompter
  const [isPrompterPlaying, setIsPrompterPlaying] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Bottom Sheets / Modais Apple
  const [showTemplatesSheet, setShowTemplatesSheet] = useState<boolean>(false);
  const [showExportSheet, setShowExportSheet] = useState<boolean>(false);
  const [showQuickSettingsSheet, setShowQuickSettingsSheet] = useState<boolean>(false);

  // Refs de mídia e animação
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const recordingTimerRef = useRef<any>(null);

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

  // ==============================================================
  // GERENCIAMENTO DA CÂMERA (getUserMedia)
  // ==============================================================
  const startCamera = async () => {
    setCameraError(null);
    try {
      // Parar stream anterior se existir
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: settings.cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: settings.audioEnabled,
      });

      setCameraStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err);
      setCameraError(
        'Permissão de câmera ou microfone necessária. Por favor, autorize nas configurações do seu navegador para gravar.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  // Iniciar/Parar câmera dependendo da aba ativa
  useEffect(() => {
    if (activeTab === 'record') {
      startCamera();
    } else {
      if (!isRecording) {
        stopCamera();
      }
    }
    return () => {
      // Cleanup no unmount
      if (cameraStream && !isRecording) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeTab, settings.cameraFacing, settings.audioEnabled]);

  // Reconectar stream ao elemento de vídeo quando estiver pronto
  useEffect(() => {
    if (videoPreviewRef.current && cameraStream) {
      videoPreviewRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, activeTab]);

  // Alternar entre câmera frontal e traseira
  const toggleCameraFacing = () => {
    triggerHaptic(20);
    setSettings((prev) => ({
      ...prev,
      cameraFacing: prev.cameraFacing === 'user' ? 'environment' : 'user',
    }));
  };

  // ==============================================================
  // GRAVAÇÃO DE VÍDEO (MediaRecorder)
  // ==============================================================
  const startRecordingFlow = () => {
    triggerHaptic(25);
    if (!cameraStream) {
      startCamera();
      return;
    }

    if (settings.countdownSeconds > 0) {
      setCountdown(settings.countdownSeconds);
    } else {
      beginActualRecording();
    }
  };

  // Contagem regressiva
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        triggerHaptic(10);
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      beginActualRecording();
    }
  }, [countdown]);

  const beginActualRecording = () => {
    if (!cameraStream) return;
    triggerHaptic(40);
    recordedChunksRef.current = [];

    // Escolher codec compatível
    const mimeType = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';

    try {
      const recorder = new MediaRecorder(cameraStream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/mp4',
        });
        const url = URL.createObjectURL(finalBlob);
        setRecordedBlob(finalBlob);
        setRecordedVideoUrl(url);
        setShowExportSheet(true);
      };

      recorder.start(1000); // chunk a cada 1s
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPrompterPlaying(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Falha ao iniciar gravador:', e);
      alert('Não foi possível iniciar o gravador de vídeo neste navegador.');
    }
  };

  const stopRecording = () => {
    triggerHaptic(35);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setIsPrompterPlaying(false);
  };

  // Formatar tempo de gravação (00:00)
  const formattedRecordTime = useMemo(() => {
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [recordingSeconds]);

  // ==============================================================
  // ROLAGEM CONTÍNUA DO TELEPROMPTER
  // ==============================================================
  useEffect(() => {
    if (!isPrompterPlaying || activeTab !== 'record') return;

    let animId: number;
    let lastTime = performance.now();

    const scrollLoop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (scrollContainerRef.current) {
        const pixelsPerSecond = settings.speed * 26;
        scrollContainerRef.current.scrollTop += pixelsPerSecond * delta;
      }

      animId = requestAnimationFrame(scrollLoop);
    };

    animId = requestAnimationFrame(scrollLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPrompterPlaying, activeTab, settings.speed]);

  // Baixar / Exportar Vídeo
  const handleDownloadVideo = () => {
    if (!recordedVideoUrl) return;
    triggerHaptic(20);
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `teleprompter-video-${Date.now()}.${recordedBlob?.type.includes('mp4') ? 'mp4' : 'webm'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Compartilhar nativo (iOS Web Share API)
  const handleShareVideo = async () => {
    if (!recordedBlob) return;
    triggerHaptic(20);
    if (navigator.share && navigator.canShare) {
      const file = new File(
        [recordedBlob],
        `video-gravado.${recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`,
        { type: recordedBlob.type }
      );
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Meu Vídeo Gravado no Teleprompter',
          });
          return;
        } catch {
          // Usuário cancelou ou erro
        }
      }
    }
    handleDownloadVideo();
  };

  // Tela cheia
  const toggleFullscreen = () => {
    triggerHaptic(15);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f2f2f7] flex flex-col font-sans select-none antialiased">
      {/* ============================================================== */}
      {/* ABA 1: ROTEIRO (APPLE HIG INSET GROUPED & LARGE TITLE) */}
      {/* ============================================================== */}
      {activeTab === 'script' && (
        <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 safe-top tabbar-padding animate-in fade-in duration-200">
          {/* Header com Large Title estilo iOS */}
          <header className="flex items-end justify-between pt-4 pb-5">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93]">
                Estúdio de Gravação
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mt-0.5">
                Roteiro
              </h1>
            </div>

            <button
              onClick={() => {
                triggerHaptic(15);
                setShowTemplatesSheet(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1c1c1e] border border-white/10 text-xs font-semibold text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modelos</span>
            </button>
          </header>

          {/* Cartão de Escrita Apple Inset Grouped */}
          <div className="ios-inset-group flex-1 flex flex-col p-5 shadow-2xl relative min-h-[380px]">
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Digite ou cole seu roteiro aqui..."
              className="w-full flex-1 bg-transparent border-0 outline-none focus:outline-none text-white text-lg md:text-xl font-normal leading-relaxed resize-none placeholder:text-zinc-600"
            />

            {/* Barra de Status no rodapé do roteiro */}
            <div className="pt-4 mt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#8e8e93]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Tempo estimado: <strong className="text-white font-medium">{stats.duration}</strong>
                </span>
                <span>•</span>
                <span>
                  <strong className="text-white font-medium">{stats.words}</strong> palavras
                </span>
              </div>

              <button
                onClick={() => {
                  triggerHaptic(10);
                  setScript('');
                }}
                className="text-zinc-500 hover:text-red-400 text-xs py-1 px-2 cursor-pointer transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Botão de Ação Primária Apple (Leva para Câmera) */}
          <div className="mt-5">
            <button
              onClick={() => {
                triggerHaptic(25);
                setActiveTab('record');
              }}
              className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer min-h-[50px]"
            >
              <span>Abrir Câmera e Gravar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: CÂMERA & GRAVAÇÃO AO VIVO (COM VÍDEO REAL & PROMPTER) */}
      {/* ============================================================== */}
      {activeTab === 'record' && (
        <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex flex-col z-30">
          {/* Câmera em Segundo Plano (Live Video Feed) */}
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
              settings.cameraFacing === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Película de Fundo Escurecida com Opacidade Ajustável */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{ backgroundColor: `rgba(0, 0, 0, ${settings.overlayOpacity})` }}
          />

          {/* Alerta caso câmera não esteja disponível */}
          {cameraError && (
            <div className="absolute top-16 left-4 right-4 z-40 p-4 rounded-2xl bg-red-950/90 border border-red-500/40 text-white text-xs flex items-start gap-3 backdrop-blur-xl">
              <CircleAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-1">Acesso à Câmera Bloqueado</strong>
                {cameraError}
              </div>
            </div>
          )}

          {/* Top Bar da Câmera (Safe Area Top + SF Symbols) */}
          <div className="absolute top-0 left-0 right-0 z-30 safe-top px-4 py-3 flex items-center justify-between pointer-events-auto">
            {/* Indicador de Gravação / Tempo */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-md text-white font-mono text-xs font-bold shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>REC {formattedRecordTime}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{stats.duration} de leitura</span>
                </div>
              )}
            </div>

            {/* Ações Rápidas no Topo */}
            <div className="flex items-center gap-2">
              {/* Alternar Câmera Frontal / Traseira */}
              <button
                onClick={toggleCameraFacing}
                title="Inverter Câmera"
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              {/* Ajustes Rápidos no Estúdio */}
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setShowQuickSettingsSheet(true);
                }}
                title="Ajustes da Faixa de Leitura"
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <Sliders className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                title="Tela Cheia"
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Marcador Óptico de Olhar (Linha Guia Apple) */}
          {settings.guideLine && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-20 flex items-center justify-between px-6"
              style={{ top: '35%', transform: 'translateY(-50%)' }}
            >
              <div className="w-3 h-3 border-l-2 border-b-2 border-white/70 -rotate-45" />
              <div className="flex-1 mx-4 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="w-3 h-3 border-r-2 border-t-2 border-white/70 -rotate-45" />
            </div>
          )}

          {/* Contagem Regressiva 3-2-1 */}
          {countdown !== null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="text-center animate-pulse">
                <div className="text-9xl font-black text-white tracking-tighter">
                  {countdown === 0 ? 'FALE!' : countdown}
                </div>
                <p className="text-zinc-300 text-sm mt-4 font-medium uppercase tracking-wider">
                  Câmera ligada e gravando...
                </p>
              </div>
            </div>
          )}

          {/* Área Rolante do Teleprompter Sobre a Câmera */}
          <div
            ref={scrollContainerRef}
            className="flex-1 w-full h-full overflow-y-auto teleprompter-scroller relative z-20"
            style={{
              paddingTop: '35vh',
              paddingBottom: '55vh',
            }}
          >
            <div
              className={`mx-auto px-6 transition-transform duration-200 ${
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
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0,0,0,0.8)',
              }}
            >
              {script.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-8 font-semibold select-none">
                  {paragraph || '\u00A0'}
                </p>
              ))}
            </div>
          </div>

          {/* Shutter & Controles Inferiores Apple (Bottom HUD) */}
          <div className="absolute bottom-6 left-0 right-0 z-30 safe-bottom px-6 flex items-center justify-around pointer-events-auto">
            {/* Botão de Pausar / Rolar o Texto */}
            <button
              onClick={() => {
                triggerHaptic(15);
                setIsPrompterPlaying(!isPrompterPlaying);
              }}
              title={isPrompterPlaying ? 'Pausar Rolagem' : 'Iniciar Rolagem'}
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
            >
              {isPrompterPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* BOTÃO PRINCIPAL DE GRAVAÇÃO (Apple Camera Shutter) */}
            <div className="flex flex-col items-center">
              <button
                onClick={isRecording ? stopRecording : startRecordingFlow}
                className={`ios-record-button ${isRecording ? 'recording' : ''}`}
                title={isRecording ? 'Parar Gravação' : 'Iniciar Gravação de Vídeo'}
              >
                <div className="ios-record-inner" />
              </button>
              <span className="text-[11px] font-medium text-zinc-300 mt-2 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md">
                {isRecording ? 'Toque para Finalizar' : 'Gravar Vídeo'}
              </span>
            </div>

            {/* Reiniciar Texto ao Topo */}
            <button
              onClick={() => {
                triggerHaptic(15);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              title="Voltar ao início do roteiro"
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: AJUSTES DO ESTÚDIO (APPLE INSET GROUPED LISTS) */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <div className="flex-1 max-w-3xl w-full mx-auto px-4 safe-top tabbar-padding animate-in fade-in duration-200">
          <header className="pt-4 pb-5">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93]">
              Preferências
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mt-0.5">
              Ajustes do Estúdio
            </h1>
          </header>

          <div className="flex flex-col gap-6">
            {/* Seção 1: Câmera e Gravação */}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93] px-3 mb-2 block">
                Câmera & Vídeo
              </span>
              <div className="ios-inset-group">
                {/* Câmera Frontal / Traseira */}
                <div className="ios-row">
                  <div>
                    <div className="text-sm font-medium text-white">Posição da Câmera</div>
                    <div className="text-xs text-[#8e8e93]">Alternar entre selfie e câmera principal</div>
                  </div>
                  <button
                    onClick={toggleCameraFacing}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>{settings.cameraFacing === 'user' ? 'Frontal (Selfie)' : 'Traseira'}</span>
                  </button>
                </div>

                {/* Gravar Áudio */}
                <div className="ios-row">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                      {settings.audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Gravar Microfone</div>
                      <div className="text-xs text-[#8e8e93]">Captura de voz junto ao vídeo</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic(15);
                      setSettings((s) => ({ ...s, audioEnabled: !s.audioEnabled }));
                    }}
                    className={`ios-switch ${settings.audioEnabled ? 'active' : ''}`}
                  >
                    <div className="ios-switch-knob" />
                  </button>
                </div>

                {/* Opacidade do Fundo Escuro Sobre a Câmera */}
                <div className="ios-row flex-col items-start gap-2 py-3">
                  <div className="flex justify-between w-full items-center">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-zinc-400" />
                      <span>Contraste da Faixa de Leitura</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {Math.round(settings.overlayOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.85"
                    step="0.05"
                    value={settings.overlayOpacity}
                    onChange={(e) => setSettings({ ...settings, overlayOpacity: Number(e.target.value) })}
                    className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Ritmo & Leitura */}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93] px-3 mb-2 block">
                Leitura & Ritmo
              </span>
              <div className="ios-inset-group">
                {/* Velocidade de Rolagem */}
                <div className="ios-row flex-col items-start gap-2 py-3">
                  <div className="flex justify-between w-full items-center">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      <span>Velocidade de Rolagem</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      {settings.speed}x
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 w-full mt-1">
                    {[
                      { label: 'Calmo', val: 2 },
                      { label: 'Normal', val: 3 },
                      { label: 'Ágil', val: 5 },
                      { label: 'Rápido', val: 7 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          triggerHaptic(10);
                          setSettings({ ...settings, speed: p.val });
                        }}
                        className={`text-xs py-2 rounded-xl transition-all cursor-pointer font-medium min-h-[44px] flex items-center justify-center ${
                          settings.speed === p.val
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'bg-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tamanho da Fonte */}
                <div className="ios-row flex-col items-start gap-2 py-3">
                  <div className="flex justify-between w-full items-center">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <Type className="w-4 h-4 text-blue-400" />
                      <span>Tamanho da Fonte</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">
                      {settings.fontSize}px
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 w-full mt-1">
                    {[
                      { label: 'P', val: 32 },
                      { label: 'M', val: 40 },
                      { label: 'G', val: 52 },
                      { label: 'GG', val: 68 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          triggerHaptic(10);
                          setSettings({ ...settings, fontSize: p.val });
                        }}
                        className={`text-xs py-2 rounded-xl transition-all cursor-pointer font-medium min-h-[44px] flex items-center justify-center ${
                          settings.fontSize === p.val
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'bg-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 3: Espelhamento Óptico para Vidro */}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93] px-3 mb-2 block">
                Vidro Óptico (Beam Splitter)
              </span>
              <div className="ios-inset-group">
                <div className="ios-row">
                  <div>
                    <div className="text-sm font-medium text-white">Espelho Horizontal</div>
                    <div className="text-xs text-[#8e8e93]">Inverte para leitura em vidro de teleprompter físico</div>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic(15);
                      setSettings((s) => ({ ...s, mirrorHorizontal: !s.mirrorHorizontal }));
                    }}
                    className={`ios-switch ${settings.mirrorHorizontal ? 'active' : ''}`}
                  >
                    <div className="ios-switch-knob" />
                  </button>
                </div>

                <div className="ios-row">
                  <div>
                    <div className="text-sm font-medium text-white">Linha Guia de Olhar</div>
                    <div className="text-xs text-[#8e8e93]">Marcador visual alinhado à lente da câmera</div>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic(15);
                      setSettings((s) => ({ ...s, guideLine: !s.guideLine }));
                    }}
                    className={`ios-switch ${settings.guideLine ? 'active' : ''}`}
                  >
                    <div className="ios-switch-knob" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* APPLE TRANSLUCENT TAB BAR (83pt iOS Standard Pinned at Bottom) */}
      {/* ============================================================== */}
      {activeTab !== 'record' && (
        <nav className="ios-tab-bar">
          <button
            onClick={() => {
              triggerHaptic(10);
              setActiveTab('script');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[44px] min-w-[64px] ${
              activeTab === 'script' ? 'text-white' : 'text-[#8e8e93] hover:text-zinc-300'
            }`}
          >
            <FileText className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] font-medium">Roteiro</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('record');
            }}
            className="flex flex-col items-center justify-center gap-1 text-white transition-all cursor-pointer min-h-[44px] min-w-[64px] active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              <Video className="w-5 h-5 fill-current" />
            </div>
            <span className="text-[11px] font-semibold text-white">Gravar</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(10);
              setActiveTab('settings');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[44px] min-w-[64px] ${
              activeTab === 'settings' ? 'text-white' : 'text-[#8e8e93] hover:text-zinc-300'
            }`}
          >
            <Sliders className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] font-medium">Ajustes</span>
          </button>
        </nav>
      )}

      {/* ============================================================== */}
      {/* BOTTOM SHEET 1: MODELOS DE ROTEIRO (APPLE ACTION SHEET) */}
      {/* ============================================================== */}
      {showTemplatesSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowTemplatesSheet(false)}
          />
          <div className="ios-bottom-sheet w-full max-w-lg mx-auto p-6 z-10 animate-in slide-in-from-bottom duration-300 safe-bottom">
            <div className="ios-sheet-handle" />
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Modelos Prontos</h3>
                <p className="text-xs text-[#8e8e93]">Escolha um roteiro para carregar no editor</p>
              </div>
              <button
                onClick={() => setShowTemplatesSheet(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 mt-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    triggerHaptic(15);
                    setScript(tpl.content);
                    setShowTemplatesSheet(false);
                  }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-left transition-all cursor-pointer min-h-[44px] active:scale-[0.98]"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{tpl.title}</div>
                    <div className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{tpl.content}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BOTTOM SHEET 2: EXPORTAR / REVER VÍDEO GRAVADO (APPLE MODAL) */}
      {/* ============================================================== */}
      {showExportSheet && recordedVideoUrl && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="ios-bottom-sheet w-full max-w-lg mx-auto p-6 z-10 animate-in slide-in-from-bottom duration-300 safe-bottom">
            <div className="ios-sheet-handle" />
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Vídeo Gravado</h3>
                <p className="text-xs text-[#8e8e93]">Duração: {formattedRecordTime}</p>
              </div>
              <button
                onClick={() => setShowExportSheet(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Player de Prévia do Vídeo Gravado */}
            <div className="w-full h-64 rounded-2xl bg-black border border-white/15 overflow-hidden my-3 relative shadow-inner">
              <video
                src={recordedVideoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Ações de Download e Compartilhar */}
            <div className="flex flex-col gap-2.5 mt-4">
              <button
                onClick={handleDownloadVideo}
                className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <Download className="w-4 h-4" />
                <span>Salvar Vídeo no Aparelho</span>
              </button>

              <button
                onClick={handleShareVideo}
                className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar (AirDrop / Mensagens)</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic(10);
                  setShowExportSheet(false);
                  if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                }}
                className="text-xs text-zinc-400 hover:text-white py-2 transition-colors cursor-pointer"
              >
                Gravar Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BOTTOM SHEET 3: AJUSTES RÁPIDOS NA TELA DA CÂMERA */}
      {/* ============================================================== */}
      {showQuickSettingsSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowQuickSettingsSheet(false)}
          />
          <div className="ios-bottom-sheet w-full max-w-lg mx-auto p-6 z-10 animate-in slide-in-from-bottom duration-300 safe-bottom">
            <div className="ios-sheet-handle" />
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-bold text-white">Ajustes Rápidos de Leitura</h3>
              <button
                onClick={() => setShowQuickSettingsSheet(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Velocidade Stepper */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" /> Velocidade: {settings.speed}x
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setSettings((s) => ({ ...s, speed: Math.max(1, s.speed - 1) }));
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 text-white font-bold text-base flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
                  >
                    -
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setSettings((s) => ({ ...s, speed: Math.min(10, s.speed + 1) }));
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 text-white font-bold text-base flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tamanho Stepper */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-400" /> Tamanho: {settings.fontSize}px
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setSettings((s) => ({ ...s, fontSize: Math.max(24, s.fontSize - 4) }));
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 text-white font-bold text-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setSettings((s) => ({ ...s, fontSize: Math.min(84, s.fontSize + 4) }));
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 text-white font-bold text-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Espelho Horizontal */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <FlipHorizontal className="w-4 h-4" /> Espelho Óptico (Vidro)
                </span>
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setSettings((s) => ({ ...s, mirrorHorizontal: !s.mirrorHorizontal }));
                  }}
                  className={`ios-switch ${settings.mirrorHorizontal ? 'active' : ''}`}
                >
                  <div className="ios-switch-knob" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
