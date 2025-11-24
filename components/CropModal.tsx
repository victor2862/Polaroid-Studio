
import React, { useState, useRef, useEffect } from 'react';
import { Photo, AspectRatio, ASPECT_RATIOS, PhotoAdjustments } from '../types';
import { X, Check, Move, Sun, Contrast, Droplet } from 'lucide-react';

interface CropModalProps {
  photo: Photo;
  aspectRatio: AspectRatio;
  onSave: (id: string, crop: { x: number; y: number; width: number; height: number }, adjustments: PhotoAdjustments) => void;
  onClose: () => void;
}

const CropModal: React.FC<CropModalProps> = ({ photo, aspectRatio, onSave, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // State
  const [crop, setCrop] = useState(photo.crop);
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(photo.adjustments || {
      brightness: 100,
      contrast: 100,
      saturation: 100,
  });

  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Since rotation is removed, display image is just the original URL
  const displayImageSrc = photo.url;
  
  const targetRatio = ASPECT_RATIOS[aspectRatio];

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState(crop);


  // Initialize default crop if needed when image loads
  useEffect(() => {
    if (imageRef.current && imageLoaded) {
        const img = imageRef.current;
        // Check if crop is valid (e.g. if width is 0 or uninitialized)
        if (crop.width <= 0) {
             resetCrop(img.naturalWidth, img.naturalHeight);
        }
    }
  }, [imageLoaded, targetRatio]);

  const resetCrop = (imgW: number, imgH: number) => {
      const imgRatio = imgW / imgH;
      let newW = 1;
      let newH = 1;

      if (imgRatio > targetRatio) {
          // Image wider than target
          newH = 1;
          newW = (imgH * targetRatio) / imgW;
      } else {
          // Image taller than target
          newW = 1;
          newH = (imgW / targetRatio) / imgH;
      }

      setCrop({
          width: newW,
          height: newH,
          x: (1 - newW) / 2,
          y: (1 - newH) / 2
      });
  };

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'drag') setIsDragging(true);
    if (action === 'resize') setIsResizing(true);
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartCrop({ ...crop });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!containerRef.current || !imageRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const imgNaturalW = imageRef.current.naturalWidth;
    const imgNaturalH = imageRef.current.naturalHeight;
    const imgAspect = imgNaturalW / imgNaturalH;

    // Calculate displayed image dimensions based on "contain" logic
    let displayW, displayH;
    const containerRatio = rect.width / rect.height;
    
    if (imgAspect > containerRatio) {
        displayW = rect.width;
        displayH = rect.width / imgAspect;
    } else {
        displayH = rect.height;
        displayW = rect.height * imgAspect;
    }

    const deltaX = (e.clientX - dragStart.x) / displayW;
    const deltaY = (e.clientY - dragStart.y) / displayH;

    if (isDragging) {
        let newX = startCrop.x + deltaX;
        let newY = startCrop.y + deltaY;

        // Clamp
        newX = Math.max(0, Math.min(newX, 1 - crop.width));
        newY = Math.max(0, Math.min(newY, 1 - crop.height));

        setCrop(prev => ({ ...prev, x: newX, y: newY }));
    } 
    else if (isResizing) {
        let newWidth = startCrop.width + deltaX;
        let newHeight = newWidth * (imgAspect / targetRatio);

        // Clamp Maximums
        if (startCrop.x + newWidth > 1) {
            newWidth = 1 - startCrop.x;
            newHeight = newWidth * (imgAspect / targetRatio);
        }
        if (startCrop.y + newHeight > 1) {
             newHeight = 1 - startCrop.y;
             newWidth = newHeight / (imgAspect / targetRatio);
        }
        // Clamp Minimums
        if (newWidth < 0.1) newWidth = 0.1;

        setCrop(prev => ({ ...prev, width: newWidth, height: newHeight }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Filter Styles for Preview
  const filterStyle = {
      filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onMouseMove={handleMouseMove}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex h-[85vh] overflow-hidden">
        
        {/* LEFT: Image Area */}
        <div className="flex-1 bg-gray-900 relative flex flex-col">
            <div className="p-4 flex justify-between items-center text-white/80 border-b border-white/10">
                <h3 className="font-semibold">Editar e Recortar</h3>
                <span className="text-xs uppercase tracking-wider bg-white/10 px-2 py-1 rounded">
                    {aspectRatio}
                </span>
            </div>

            <div className="flex-1 relative flex items-center justify-center p-6 select-none overflow-hidden">
                <div 
                    ref={containerRef}
                    className="relative w-full h-full flex items-center justify-center"
                >
                    <img 
                        ref={imageRef}
                        src={displayImageSrc} 
                        alt="Crop target"
                        className="max-w-full max-h-full object-contain pointer-events-none transition-all duration-200"
                        style={filterStyle}
                        onLoad={() => setImageLoaded(true)}
                    />

                    {imageLoaded && imageRef.current && (
                        <div 
                            className="absolute"
                            style={{
                                width: imageRef.current.width,
                                height: imageRef.current.height,
                            }}
                        >
                            {/* Dark Overlay */}
                            <div className="absolute bg-black/50 inset-0 pointer-events-none"></div>

                            {/* The Crop Box */}
                            <div 
                                className="absolute outline outline-2 outline-white cursor-move group hover:outline-indigo-400 shadow-2xl"
                                style={{
                                    left: `${crop.x * 100}%`,
                                    top: `${crop.y * 100}%`,
                                    width: `${crop.width * 100}%`,
                                    height: `${crop.height * 100}%`,
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                    zIndex: 10
                                }}
                                onMouseDown={(e) => handleMouseDown(e, 'drag')}
                            >
                                {/* Active Area Visualization (Clear with filters applied) */}
                                <div 
                                    className="absolute inset-0 w-full h-full overflow-hidden"
                                    style={{
                                        backgroundImage: `url(${displayImageSrc})`,
                                        backgroundSize: `${(1/crop.width)*100}% ${(1/crop.height)*100}%`,
                                        backgroundPosition: `${(crop.x / (1 - crop.width)) * 100}% ${(crop.y / (1 - crop.height)) * 100}%`,
                                        filter: filterStyle.filter
                                    }}
                                />

                                {/* Grid Lines */}
                                <div className="absolute inset-0 w-full h-full pointer-events-none">
                                    <div className="absolute top-1/3 w-full border-t border-white/40 shadow-sm"></div>
                                    <div className="absolute top-2/3 w-full border-t border-white/40 shadow-sm"></div>
                                    <div className="absolute left-1/3 h-full border-l border-white/40 shadow-sm"></div>
                                    <div className="absolute left-2/3 h-full border-l border-white/40 shadow-sm"></div>
                                </div>

                                {/* Resize Handle */}
                                <div 
                                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-indigo-600 rounded-full cursor-se-resize flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-30 ring-2 ring-white"
                                    onMouseDown={(e) => handleMouseDown(e, 'resize')}
                                >
                                    <Move size={12} className="text-white" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* RIGHT: Tools Sidebar */}
        <div className="w-80 bg-white border-l flex flex-col z-20">
            <div className="flex justify-between items-center p-4 border-b">
                 <h4 className="font-bold text-gray-800">Ajustes</h4>
                 <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                     <X size={20} className="text-gray-500" />
                 </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Brightness */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Sun size={14} /> Brilho
                         </label>
                         <span className="text-xs font-mono text-gray-600">{adjustments.brightness}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="200" 
                        value={adjustments.brightness}
                        onChange={(e) => setAdjustments(prev => ({...prev, brightness: parseInt(e.target.value)}))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                </div>

                {/* Contrast */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Contrast size={14} /> Contraste
                         </label>
                         <span className="text-xs font-mono text-gray-600">{adjustments.contrast}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="200" 
                        value={adjustments.contrast}
                        onChange={(e) => setAdjustments(prev => ({...prev, contrast: parseInt(e.target.value)}))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                </div>

                {/* Saturation */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Droplet size={14} /> Saturação
                         </label>
                         <span className="text-xs font-mono text-gray-600">{adjustments.saturation}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="200" 
                        value={adjustments.saturation}
                        onChange={(e) => setAdjustments(prev => ({...prev, saturation: parseInt(e.target.value)}))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                </div>

                <div className="pt-4 border-t">
                    <button 
                        onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100 })}
                        className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                        Resetar Ajustes
                    </button>
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
                 <button 
                   onClick={onClose}
                   className="flex-1 py-2.5 text-gray-600 font-medium hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={() => onSave(photo.id, crop, adjustments)}
                   className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                 >
                   <Check size={18} />
                   Concluir
                 </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default CropModal;