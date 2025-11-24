import React, { useState, useRef, useEffect } from 'react';
import { Photo, AspectRatio, ASPECT_RATIOS } from '../types';
import { X, Check, Move } from 'lucide-react';

interface CropModalProps {
  photo: Photo;
  aspectRatio: AspectRatio;
  onSave: (id: string, crop: { x: number; y: number; width: number; height: number }) => void;
  onClose: () => void;
}

const CropModal: React.FC<CropModalProps> = ({ photo, aspectRatio, onSave, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Crop state in normalized coordinates (0-1)
  const [crop, setCrop] = useState(photo.crop);
  const [imageLoaded, setImageLoaded] = useState(false);
  const targetRatio = ASPECT_RATIOS[aspectRatio];

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState(photo.crop);

  // Initialize crop if it's invalid (e.g. newly added photo) or re-center if switching ratio
  useEffect(() => {
    if (imageRef.current && imageLoaded) {
        const img = imageRef.current;
        
        // Calculate a default centered crop that fits the aspect ratio
        let newW = 1;
        let newH = 1;
        
        const imgRatio = img.naturalWidth / img.naturalHeight;

        if (imgRatio > targetRatio) {
            // Image is wider than target
            newH = 1;
            newW = (img.naturalHeight * targetRatio) / img.naturalWidth;
        } else {
            // Image is taller than target
            newW = 1;
            newH = (img.naturalWidth / targetRatio) / img.naturalHeight;
        }
        
        // If the current crop doesn't match the target ratio roughly, reset it
        // Or if it's the default 0,0,0,0 or 1,1,0,0 full crop that might need aspect adjustment
        const currentRatio = (crop.width * img.naturalWidth) / (crop.height * img.naturalHeight);
        
        // Simple check if ratios diverge significantly (0.05 tolerance)
        // This ensures that if we open an existing crop that matches the ratio, we keep it.
        // But if the user changed the global aspect ratio setting, we reset the crop.
        if (Math.abs(currentRatio - targetRatio) > 0.05 || crop.width === 0) {
             setCrop({
                 width: newW,
                 height: newH,
                 x: (1 - newW) / 2,
                 y: (1 - newH) / 2
             });
        }
    }
  }, [targetRatio, photo.url, imageLoaded]);

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

    // Delta in pixels
    const deltaXPixels = e.clientX - dragStart.x;
    const deltaYPixels = e.clientY - dragStart.y;

    // Convert Delta to normalized units (0-1)
    // We need the actual displayed dimensions of the image to normalize properly.
    
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

    const deltaX = deltaXPixels / displayW;
    const deltaY = deltaYPixels / displayH;

    if (isDragging) {
        let newX = startCrop.x + deltaX;
        let newY = startCrop.y + deltaY;

        // Clamp
        newX = Math.max(0, Math.min(newX, 1 - crop.width));
        newY = Math.max(0, Math.min(newY, 1 - crop.height));

        setCrop(prev => ({ ...prev, x: newX, y: newY }));
    } 
    else if (isResizing) {
        // Resize logic: maintain aspect ratio
        let newWidth = startCrop.width + deltaX;
        let newHeight = newWidth * (imgAspect / targetRatio);

        // Clamp Maximums (cannot go outside 1.0 boundary)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onMouseMove={handleMouseMove}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
              <h3 className="font-semibold text-gray-800">Recortar Imagem</h3>
              <p className="text-xs text-gray-500">Arraste a caixa para mover, puxe o canto azul para redimensionar.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden bg-gray-900 relative flex items-center justify-center p-4 select-none">
            
            <div 
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center"
            >
               <img 
                 ref={imageRef}
                 src={photo.url} 
                 alt="Crop target"
                 className="max-w-full max-h-full object-contain pointer-events-none"
                 onLoad={() => setImageLoaded(true)}
               />

               {/* Only render overlay when image is loaded and ref is available to avoid layout glitches */}
               {imageLoaded && imageRef.current && (
                <div 
                    className="absolute"
                    style={{
                        width: imageRef.current.width,
                        height: imageRef.current.height,
                    }}
                >
                    {/* Dark Overlay */}
                    <div className="absolute bg-black/60 inset-0 pointer-events-none"></div>

                    {/* The Crop Box */}
                    <div 
                        className="absolute outline outline-2 outline-white cursor-move group hover:outline-indigo-400"
                        style={{
                            left: `${crop.x * 100}%`,
                            top: `${crop.y * 100}%`,
                            width: `${crop.width * 100}%`,
                            height: `${crop.height * 100}%`,
                            backgroundImage: `url(${photo.url})`,
                            backgroundSize: `${(1/crop.width)*100}% ${(1/crop.height)*100}%`,
                            backgroundPosition: `${(crop.x / (1 - crop.width)) * 100}% ${(crop.y / (1 - crop.height)) * 100}%`,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                            background: 'transparent',
                            zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, 'drag')}
                    >
                         {/* Grid Lines */}
                         <div className="w-full h-full opacity-30 pointer-events-none border border-white/30">
                            <div className="absolute top-1/3 w-full border-t border-white/50"></div>
                            <div className="absolute top-2/3 w-full border-t border-white/50"></div>
                            <div className="absolute left-1/3 h-full border-l border-white/50"></div>
                            <div className="absolute left-2/3 h-full border-l border-white/50"></div>
                         </div>

                         {/* Resize Handle - Bottom Right */}
                         <div 
                           className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full cursor-se-resize flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-20"
                           onMouseDown={(e) => handleMouseDown(e, 'resize')}
                         >
                            <Move size={12} className="text-white" />
                         </div>
                    </div>
                </div>
               )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white rounded-b-xl flex justify-between items-center">
           <div className="text-sm text-gray-500">
              Proporção bloqueada em: <span className="font-bold text-gray-700">{aspectRatio}</span>
           </div>
           <div className="flex gap-3">
             <button 
               onClick={onClose}
               className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
             >
               Cancelar
             </button>
             <button 
               onClick={() => onSave(photo.id, crop)}
               className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"
             >
               <Check size={18} />
               Aplicar Recorte
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CropModal;