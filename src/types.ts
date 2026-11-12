export interface TeleprompterSettings {
  fontSize: number; // in px: 24 to 72
  speed: number; // 1 to 10
  mirrorHorizontal: boolean;
  mirrorVertical: boolean;
  textColor: string;
  lineHeight: number;
  guideLine: boolean;
  maxWidth: number; // in px
  textAlign: 'left' | 'center' | 'justify';
  countdownSeconds: number;
  // Camera & Studio Settings
  cameraFacing: 'user' | 'environment';
  overlayOpacity: number; // 0.1 to 0.8 (opacidade do fundo escuro sobre o vídeo)
  audioEnabled: boolean;
  prompterPosition: 'top' | 'middle' | 'full'; // posição da faixa de leitura
}

export const DEFAULT_SETTINGS: TeleprompterSettings = {
  fontSize: 40,
  speed: 3,
  mirrorHorizontal: false,
  mirrorVertical: false,
  textColor: '#ffffff',
  lineHeight: 1.5,
  guideLine: true,
  maxWidth: 720,
  textAlign: 'center',
  countdownSeconds: 3,
  cameraFacing: 'user',
  overlayOpacity: 0.35,
  audioEnabled: true,
  prompterPosition: 'middle',
};
