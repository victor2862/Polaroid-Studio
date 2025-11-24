import React from 'react';
import { Photo, Settings, PAPER_SIZES, ASPECT_RATIOS } from '../types';
import { Trash2, Crop } from 'lucide-react';

interface GridPreviewProps {
  photos: Photo[];
  settings: Settings;
  onRemove: (id: string) => void;
  onCrop: (photo: Photo) => void;
  onUpdateCaption: (id: string, text: string) => void;
}

const GridPreview: React.FC<GridPreviewProps> = ({ 
  photos, 
  settings, 
  onRemove, 
  onCrop, 
  onUpdateCaption, 
}) => {
  // 1. Determine Paper Dimensions in MM
  let paperWidthMm = 0;
  let paperHeightMm = 0;

  if (settings.paperSize === 'Custom') {
    paperWidthMm = settings.customPaperWidth;
    paperHeightMm = settings.customPaperHeight;
  } else {
    const paper = PAPER_SIZES[settings.paperSize];
    paperWidthMm = paper.widthMm;
    paperHeightMm = paper.heightMm;
  }

  // Handle Orientation manually
  const isPortrait = settings.orientation === 'portrait';
  const dim1 = Math.min(paperWidthMm, paperHeightMm);
  const dim2 = Math.max(paperWidthMm, paperHeightMm);
  const finalDocW = isPortrait ? dim1 : dim2;
  const finalDocH = isPortrait ? dim2 : dim1;

  // 2. Set Scale for Screen (Pixels per MM)
  const SCREEN_SCALE = 3.0; // 1mm = 3px

  // 3. Calculate Layout Constants (Matches pdfService.ts EXACTLY)
  const { rows, cols, gapMm, paddingHorizontalMm, paddingVerticalMm, aspectRatio } = settings;
  const ratioValue = ASPECT_RATIOS[aspectRatio];

  const availableWidth = finalDocW - (paddingHorizontalMm * 2) - (gapMm * (cols - 1));
  const availableHeight = finalDocH - (paddingVerticalMm * 2) - (gapMm * (rows - 1));
  
  const cellWidthMm = availableWidth / cols;
  const cellHeightMm = availableHeight / rows;

  const itemsPerPage = rows * cols;
  const totalPages = Math.ceil(Math.max(photos.length, 1) / itemsPerPage);
  
  // Render pages
  const pages = [];
  for(let p = 0; p < totalPages; p++) {
      pages.push(p);
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8 overflow-auto min-h-full bg-gray-200">
      {pages.map(pageIdx => (
          <div 
            key={pageIdx}
            className="bg-white shadow-2xl relative transition-all duration-300 ring-1 ring-gray-300"
            style={{
                width: `${finalDocW * SCREEN_SCALE}px`,
                height: `${finalDocH * SCREEN_SCALE}px`,
                minWidth: `${finalDocW * SCREEN_SCALE}px`, 
                minHeight: `${finalDocH * SCREEN_SCALE}px`,
            }}
          >
             {/* Render Grid Cells for this Page */}
             {Array.from({length: itemsPerPage}).map((_, idx) => {
                 const photoIdx = pageIdx * itemsPerPage + idx;
                 const photo = photos[photoIdx];
                 
                 // Calculate Position
                 const row = Math.floor(idx / cols);
                 const col = idx % cols;
                 
                 const xMm = paddingHorizontalMm + col * (cellWidthMm + gapMm);
                 const yMm = paddingVerticalMm + row * (cellHeightMm + gapMm);
                 
                 const styleObj = {
                     position: 'absolute' as const,
                     left: `${xMm * SCREEN_SCALE}px`,
                     top: `${yMm * SCREEN_SCALE}px`,
                     width: `${cellWidthMm * SCREEN_SCALE}px`,
                     height: `${cellHeightMm * SCREEN_SCALE}px`,
                 };

                 if (!photo) {
                     return (
                         <div key={`empty-${pageIdx}-${idx}`} style={styleObj} className="border-2 border-dashed border-gray-100 flex items-center justify-center">
                             <span className="text-gray-200 text-xs font-medium">Vazio</span>
                         </div>
                     );
                 }

                 return (
                     <div key={photo.id} style={styleObj}>
                         <PhotoCell 
                             photo={photo}
                             settings={settings}
                             widthMm={cellWidthMm}
                             heightMm={cellHeightMm}
                             scale={SCREEN_SCALE}
                             ratioValue={ratioValue}
                             onRemove={() => onRemove(photo.id)}
                             onCrop={() => onCrop(photo)}
                             onUpdateCaption={(text) => onUpdateCaption(photo.id, text)}
                         />
                     </div>
                 );
             })}
          </div>
      ))}
    </div>
  );
};

interface PhotoCellProps {
    photo: Photo;
    settings: Settings;
    widthMm: number;
    heightMm: number;
    scale: number;
    ratioValue: number;
    onRemove: () => void;
    onCrop: () => void;
    onUpdateCaption: (text: string) => void;
}

const PhotoCell: React.FC<PhotoCellProps> = ({ 
    photo, 
    settings, 
    widthMm,
    heightMm,
    scale, 
    ratioValue, 
    onRemove, 
    onCrop, 
    onUpdateCaption, 
}) => {
    
    // --- Layout Logic matching PDF Service ---
    
    let imgX = 0;
    let imgY = 0;
    let imgW = widthMm;
    let imgH = heightMm;

    let innerPadding = 0;
    let bottomPadding = 0;

    if (settings.style === 'polaroid') {
        innerPadding = widthMm * 0.06;
        bottomPadding = Math.max(20, heightMm * 0.20);
        
        imgX += innerPadding;
        imgY += innerPadding;
        imgW -= (innerPadding * 2);
        imgH -= (innerPadding + bottomPadding);
    } else if (settings.style === 'minimal') {
        innerPadding = 3;
        imgX += innerPadding;
        imgY += innerPadding;
        imgW -= (innerPadding * 2);
        imgH -= (innerPadding * 2);
    }

    // Fit Aspect Ratio Box inside Available Area
    const areaW = imgW;
    const areaH = imgH;
    
    let finalImgW = areaW;
    let finalImgH = areaH;

    if (areaW / areaH > ratioValue) {
        // Limited by Height
        finalImgH = areaH;
        finalImgW = areaH * ratioValue;
        imgX += (areaW - finalImgW) / 2;
    } else {
        // Limited by Width
        finalImgW = areaW;
        finalImgH = areaW / ratioValue;
        imgY += (areaH - finalImgH) / 2;
    }

    // CSS Conversions
    const cardStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: settings.backgroundColor,
        position: 'relative',
        boxShadow: settings.style === 'polaroid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
        border: (settings.style !== 'borderless' && settings.backgroundColor === '#ffffff') ? '1px solid #eee' : 'none'
    };

    const imageBoxStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${imgX * scale}px`,
        top: `${imgY * scale}px`,
        width: `${finalImgW * scale}px`,
        height: `${finalImgH * scale}px`,
        overflow: 'hidden',
        boxShadow: '0 0 1px rgba(0,0,0,0.2)'
    };
    
    // Calculate safely to avoid division by zero
    const bgScaleX = photo.crop.width > 0 ? 1 / photo.crop.width : 1;
    const bgScaleY = photo.crop.height > 0 ? 1 / photo.crop.height : 1;
    
    const bgPosX = photo.crop.width >= 1 ? 0 : (photo.crop.x / (1 - photo.crop.width)) * 100;
    const bgPosY = photo.crop.height >= 1 ? 0 : (photo.crop.y / (1 - photo.crop.height)) * 100;

    const cropStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundImage: `url(${photo.url})`,
        backgroundSize: `${bgScaleX * 100}% ${bgScaleY * 100}%`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundRepeat: 'no-repeat'
    };

    return (
        <div style={cardStyle} className="group">
            {/* The Image Area */}
            <div style={imageBoxStyle}>
                <div style={cropStyle} />
            </div>

            {/* Caption Area */}
            {settings.showCaptions && settings.style === 'polaroid' && (
                <div 
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: `${(heightMm - (imgY + finalImgH)) * scale}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 8px'
                    }}
                >
                   <textarea 
                     value={photo.caption}
                     onChange={(e) => onUpdateCaption(e.target.value)}
                     className="w-full text-center bg-transparent border-none resize-none focus:ring-0 p-1 outline-none overflow-hidden"
                     style={{
                        fontFamily: settings.fontFamily,
                        fontSize: '12px',
                        color: '#4b5563',
                        height: '100%',
                        lineHeight: '1.2'
                     }}
                     placeholder="Legenda"
                   />
                </div>
            )}

            {/* Hover Actions */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={(e) => { e.stopPropagation(); onCrop(); }}
                 className="p-1.5 bg-white text-gray-700 rounded-full shadow-md hover:text-indigo-600"
                 title="Recortar"
               >
                 <Crop size={14} />
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onRemove(); }}
                 className="p-1.5 bg-white text-gray-700 rounded-full shadow-md hover:text-red-600"
                 title="Remover"
               >
                 <Trash2 size={14} />
               </button>
            </div>
        </div>
    );
};

export default GridPreview;
