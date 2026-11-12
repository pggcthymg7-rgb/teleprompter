import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  CircleAlert,
  Camera,
  Trash2
} from 'lucide-react';
import { DEFAULT_SETTINGS, TeleprompterSettings } from './types';
import { TEMPLATES } from './templates';

// Feedback tátil nativo Apple
const triggerHaptic = (duration = 15) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignora em browsers sem suporte
    }
  }
};

export default function App() {
  // Aba ativa da Tab Bar nativa
  const [activeTab, setActiveTab] = useState<'script' | 'record' | 'settings'>('script');

  // Estado do Roteiro
  const [script, setScript] = useState<string>(() => {
    return localStorage.getItem('teleprompter_script') || TEMPLATES[0].content;
  });

  // Configurações persistidas
  const [settings, setSettings] = useState<TeleprompterSettings>(() => {
    const saved = localStorage.getItem('teleprompter_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Estados de Câmera e Gravação
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Estados do Teleprompter
  const [isPrompterPlaying, setIsPrompterPlaying] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Bottom Sheets / Modais Apple HIG
  const [showTemplatesSheet, setShowTemplatesSheet] = useState<boolean>(false);
  const [showExportSheet, setShowExportSheet] = useState<boolean>(false);
  const [showQuickSettingsSheet, setShowQuickSettingsSheet] = useState<boolean>(false);

  // Elementos e referências
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Salvar no localStorage
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
  // GERENCIAMENTO DA CÂMERA (Compatível com iOS Safari)
  // ==============================================================
  const initCamera = useCallback(
    async (facing?: 'user' | 'environment') => {
      const mode = facing || settings.cameraFacing;
      setCameraLoading(true);
      setCameraError(null);

      // Parar faixas antigas se houver
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      try {
        let stream: MediaStream;
        try {
          // Tentativa principal: vídeo + áudio
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: mode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: settings.audioEnabled,
          });
        } catch (audioErr) {
          console.warn('Falha com áudio, tentando apenas vídeo:', audioErr);
          // Fallback seguro: só vídeo se o mic estiver bloqueado
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        }

        setCameraStream(stream);

        // Atribuir ao elemento de vídeo
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          try {
            await videoPreviewRef.current.play();
          } catch (playErr) {
            console.warn('AutoPlay aguardando interação:', playErr);
          }
        }
      } catch (err: any) {
        console.error('Erro de permissão da câmera:', err);
        setCameraError(
          'Permissão de câmera necessária. No Safari do iPhone, toque no botão "aA" na barra de endereços > Ajustes do Site > Câmera e selecione "Permitir".'
        );
      } finally {
        setCameraLoading(false);
      }
    },
    [cameraStream, settings.cameraFacing, settings.audioEnabled]
  );

  // Vincular stream quando o ref estiver montado
  useEffect(() => {
    if (videoPreviewRef.current && cameraStream) {
      videoPreviewRef.current.srcObject = cameraStream;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [cameraStream, activeTab]);

  // Ação de transição para a aba de Gravar (inicia câmera no clique do usuário)
  const handleOpenRecordTab = async () => {
    triggerHaptic(20);
    setActiveTab('record');
    await initCamera();
  };

  // Alternar entre câmera frontal e traseira
  const toggleCameraFacing = async () => {
    triggerHaptic(20);
    const nextFacing = settings.cameraFacing === 'user' ? 'environment' : 'user';
    setSettings((prev) => ({ ...prev, cameraFacing: nextFacing }));
    await initCamera(nextFacing);
  };

  // ==============================================================
  // GRAVAÇÃO DE VÍDEO (MediaRecorder com suporte para iOS Safari)
  // ==============================================================
  const startRecordingFlow = () => {
    triggerHaptic(25);
    if (!cameraStream) {
      initCamera();
      return;
    }

    if (settings.countdownSeconds > 0) {
      setCountdown(settings.countdownSeconds);
    } else {
      beginActualRecording();
    }
  };

  // Contagem regressiva com haptic
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

    // Detecção do codec ideal
    let mimeType = '';
    const possibleTypes = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    for (const type of possibleTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    try {
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(cameraStream, options);

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

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPrompterPlaying(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Falha ao iniciar gravador:', e);
      alert('Não foi possível iniciar o gravador de vídeo neste aparelho.');
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

  // Tempo formatado 00:00
  const formattedRecordTime = useMemo(() => {
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [recordingSeconds]);

  // ==============================================================
  // LOOP DE ROLAGEM SUAVE DO PROMPTER
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

  // Exportar / Baixar Vídeo Gravado
  const handleDownloadVideo = () => {
    if (!recordedVideoUrl) return;
    triggerHaptic(20);
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `video-teleprompter-${Date.now()}.${recordedBlob?.type.includes('mp4') ? 'mp4' : 'webm'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Compartilhar nativo no iOS
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
          // Cancelado pelo usuário
        }
      }
    }
    handleDownloadVideo();
  };

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
      {/* ABA 1: ROTEIRO (APPLE HIG LARGE TITLE & INSET GROUPED) */}
      {/* ============================================================== */}
      {activeTab === 'script' && (
        <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 safe-top tabbar-padding animate-in fade-in duration-200">
          {/* Large Title Bar no padrão iOS */}
          <header className="flex items-center justify-between pt-3 pb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Roteiro
              </h1>
              <span className="text-xs text-[#8e8e93]">
                {stats.words} palavras • ~{stats.duration} de fala
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setShowTemplatesSheet(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1c1c1e] border border-white/10 text-xs font-semibold text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Modelos</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic(10);
                  setScript('');
                }}
                title="Limpar texto"
                className="w-10 h-10 rounded-full bg-[#1c1c1e] border border-white/10 text-zinc-400 hover:text-red-400 flex items-center justify-center active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Cartão de Escrita Apple Inset Grouped */}
          <div className="ios-inset-group flex-1 flex flex-col p-4 md:p-5 shadow-2xl relative min-h-[360px]">
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Digite ou cole seu roteiro aqui..."
              className="w-full flex-1 bg-transparent border-0 outline-none focus:outline-none text-white text-base md:text-lg font-normal leading-relaxed resize-none placeholder:text-zinc-600"
            />
          </div>

          {/* Botão de Avanço Rápido para a Câmera */}
          <div className="mt-4">
            <button
              onClick={handleOpenRecordTab}
              className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer min-h-[50px]"
            >
              <Video className="w-5 h-5 fill-current" />
              <span>Abrir Câmera e Gravar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: CÂMERA & GRAVAÇÃO AO VIVO (COM FEED REAL DO SAFARI) */}
      {/* ============================================================== */}
      {activeTab === 'record' && (
        <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex flex-col z-30">
          {/* Elemento de Vídeo Real da Câmera (Com todos os atributos do iOS) */}
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
              settings.cameraFacing === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Película de Fundo Escurecida para Contraste do Texto */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{ backgroundColor: `rgba(0, 0, 0, ${settings.overlayOpacity})` }}
          />

          {/* Tela de Ativação caso a câmera ainda não tenha iniciado */}
          {!cameraStream && !cameraLoading && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-xl text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 text-white">
                <Camera className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Câmera Pronta para Gravar</h2>
              <p className="text-xs text-[#8e8e93] max-w-xs mb-6">
                Toque no botão abaixo para ativar a câmera e o microfone no seu aparelho.
              </p>
              <button
                onClick={() => initCamera()}
                className="px-6 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-xl cursor-pointer min-h-[48px] flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Ativar Câmera Agora</span>
              </button>
            </div>
          )}

          {/* Alerta de Permissão Bloqueada */}
          {cameraError && (
            <div className="absolute top-16 left-4 right-4 z-40 p-4 rounded-2xl bg-red-950/95 border border-red-500/40 text-white text-xs flex items-start gap-3 backdrop-blur-xl shadow-2xl">
              <CircleAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-1 text-red-200">Permissão Necessária</strong>
                {cameraError}
                <button
                  onClick={() => initCamera()}
                  className="mt-2 block text-xs underline font-semibold text-white cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {/* Barra Superior da Câmera (Safe Area Top + SF Symbols) */}
          <div className="absolute top-0 left-0 right-0 z-30 safe-top px-4 py-3 flex items-center justify-between pointer-events-auto">
            {/* Indicador de Gravação REC */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-md text-white font-mono text-xs font-bold shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>REC {formattedRecordTime}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{stats.duration}</span>
                </div>
              )}
            </div>

            {/* Ações Rápidas no Topo */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCameraFacing}
                title="Inverter Câmera"
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  triggerHaptic(15);
                  setShowQuickSettingsSheet(true);
                }}
                title="Ajustes Rápidos"
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <Sliders className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                title="Tela Cheia"
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Marcador Óptico de Olhar Apple HIG */}
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
                  {countdown === 0 ? 'GO!' : countdown}
                </div>
                <p className="text-zinc-300 text-sm mt-4 font-semibold uppercase tracking-wider">
                  Gravando Vídeo...
                </p>
              </div>
            </div>
          )}

          {/* Texto Rolante do Teleprompter Sobre o Vídeo */}
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
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0,0,0,0.85)',
              }}
            >
              {script.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-8 font-semibold select-none">
                  {paragraph || '\u00A0'}
                </p>
              ))}
            </div>
          </div>

          {/* Shutter Apple & Controles Inferiores da Câmera */}
          <div className="absolute bottom-6 left-0 right-0 z-30 safe-bottom px-6 flex items-center justify-around pointer-events-auto">
            {/* Play/Pause Rolagem */}
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

            {/* BOTÃO PRINCIPAL DE GRAVAÇÃO (Shutter Apple Camera) */}
            <div className="flex flex-col items-center">
              <button
                onClick={isRecording ? stopRecording : startRecordingFlow}
                className={`ios-record-button ${isRecording ? 'recording' : ''}`}
                title={isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
              >
                <div className="ios-record-inner" />
              </button>
              <span className="text-[11px] font-medium text-zinc-300 mt-2 bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                {isRecording ? 'Toque para Finalizar' : 'Gravar Vídeo'}
              </span>
            </div>

            {/* Reiniciar Texto ao Início */}
            <button
              onClick={() => {
                triggerHaptic(15);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              title="Voltar ao início do texto"
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
        <div className="flex-1 max-w-2xl w-full mx-auto px-4 safe-top tabbar-padding animate-in fade-in duration-200">
          <header className="pt-3 pb-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Ajustes
            </h1>
            <span className="text-xs text-[#8e8e93]">
              Configure o estúdio de acordo com a sua câmera
            </span>
          </header>

          <div className="flex flex-col gap-6">
            {/* Seção 1: Câmera e Microfone */}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93] px-3 mb-2 block">
                Câmera & Áudio
              </span>
              <div className="ios-inset-group">
                <div className="ios-row">
                  <div>
                    <div className="text-sm font-medium text-white">Lente da Câmera</div>
                    <div className="text-xs text-[#8e8e93]">Alternar entre frontal e traseira</div>
                  </div>
                  <button
                    onClick={toggleCameraFacing}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>{settings.cameraFacing === 'user' ? 'Frontal (Selfie)' : 'Traseira'}</span>
                  </button>
                </div>

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

                <div className="ios-row flex-col items-start gap-2 py-3">
                  <div className="flex justify-between w-full items-center">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-zinc-400" />
                      <span>Película de Contraste Sobre o Vídeo</span>
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

            {/* Seção 3: Vidro Óptico & Guias */}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#8e8e93] px-3 mb-2 block">
                Vidro Óptico (Beam Splitter)
              </span>
              <div className="ios-inset-group">
                <div className="ios-row">
                  <div>
                    <div className="text-sm font-medium text-white">Espelho Horizontal</div>
                    <div className="text-xs text-[#8e8e93]">Inverte para leitura em vidro reflexivo</div>
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
                    <div className="text-xs text-[#8e8e93]">Marcador óptico alinhado à lente</div>
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
      {/* TRANSLUCENT TAB BAR APPLE (83pt Pinned na parte inferior) */}
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
            onClick={handleOpenRecordTab}
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
          <div className="fixed inset-0" onClick={() => setShowTemplatesSheet(false)} />
          <div className="ios-bottom-sheet w-full max-w-lg mx-auto p-6 z-10 animate-in slide-in-from-bottom duration-300 safe-bottom">
            <div className="ios-sheet-handle" />
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Modelos Prontos</h3>
                <p className="text-xs text-[#8e8e93]">Escolha um roteiro para carregar</p>
              </div>
              <button
                onClick={() => setShowTemplatesSheet(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 mt-1">
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

            {/* Player do Vídeo Gravado */}
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
            <div className="flex flex-col gap-2.5 mt-3">
              <button
                onClick={handleDownloadVideo}
                className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <Download className="w-4 h-4" />
                <span>Salvar no Rolo da Câmera / Baixar</span>
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
                className="text-xs text-zinc-400 hover:text-white py-2 transition-colors cursor-pointer text-center"
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
          <div className="fixed inset-0" onClick={() => setShowQuickSettingsSheet(false)} />
          <div className="ios-bottom-sheet w-full max-w-lg mx-auto p-6 z-10 animate-in slide-in-from-bottom duration-300 safe-bottom">
            <div className="ios-sheet-handle" />
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-bold text-white">Ajustes Rápidos</h3>
              <button
                onClick={() => setShowQuickSettingsSheet(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Velocidade Stepper */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
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
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
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
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
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
