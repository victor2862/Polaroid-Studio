
export interface PaperSize {
  name: string;
  widthMm: number;
  heightMm: number;
}

export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9';

export interface Photo {
  id: string;
  url: string;
  file: File;
  caption: string;
  // New Crop data: normalized coordinates (0-1) representing the crop box relative to the original image
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  originalWidth?: number;
  originalHeight?: number;
}

export interface Settings {
  paperSize: 'A4' | 'Letter' | '4x6' | 'Custom';
  customPaperWidth: number;
  customPaperHeight: number;
  orientation: 'portrait' | 'landscape';
  rows: number;
  cols: number;
  gapMm: number;
  paddingHorizontalMm: number;
  paddingVerticalMm: number;
  style: 'polaroid' | 'minimal' | 'borderless';
  aspectRatio: AspectRatio;
  showCaptions: boolean;
  fontFamily: 'Inter' | 'Shadows Into Light' | 'Permanent Marker';
  backgroundColor: string;
  borderColor: string;
}

export const PAPER_SIZES: Record<string, PaperSize> = {
  A4: { name: 'A4', widthMm: 210, heightMm: 297 },
  Letter: { name: 'Letter', widthMm: 215.9, heightMm: 279.4 },
  '4x6': { name: '4"x6"', widthMm: 101.6, heightMm: 152.4 },
  'Custom': { name: 'Personalizado', widthMm: 210, heightMm: 297 },
};

export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
};
