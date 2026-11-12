export interface TeleprompterSettings {
  fontSize: number; // in px, e.g. 36 to 96
  speed: number; // 1 to 10
  mirrorHorizontal: boolean;
  mirrorVertical: boolean;
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
  guideLine: boolean;
  maxWidth: number; // in px or percent
  textAlign: 'left' | 'center' | 'justify';
  countdownSeconds: number;
}

export const DEFAULT_SETTINGS: TeleprompterSettings = {
  fontSize: 48,
  speed: 3,
  mirrorHorizontal: false,
  mirrorVertical: false,
  textColor: '#ffffff',
  backgroundColor: '#0a0a0c',
  lineHeight: 1.6,
  guideLine: true,
  maxWidth: 850,
  textAlign: 'center',
  countdownSeconds: 3,
};
