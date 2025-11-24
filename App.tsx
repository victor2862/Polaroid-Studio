
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Photo, ASPECT_RATIOS } from './types';
import Sidebar from './components/Sidebar';
import GridPreview from './components/GridPreview';
import CropModal from './components/CropModal';
import { generatePDF } from './services/pdfService';
import { Plus, ImagePlus } from 'lucide-react';

const simpleId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_SETTINGS: Settings = {
  paperSize: 'A4',
  customPaperWidth: 210,
  customPaperHeight: 297,
  orientation: 'portrait',
  rows: 3,
  cols: 2,
  gapMm: 10,
  paddingHorizontalMm: 15,
  paddingVerticalMm: 15,
  style: 'polaroid',
  aspectRatio: '1:1',
  showCaptions: true,
  fontFamily: 'Shadows Into Light',
  backgroundColor: '#ffffff',
  borderColor: '#eeeeee',
};

// Helper to calculate a centered crop that fills the target aspect ratio (Object-fit: cover equivalent)
const calculateCrop = (imgWidth: number, imgHeight: number, targetRatio: number) => {
    const imgRatio = imgWidth / imgHeight;
    let w = 1;
    let h = 1;
    let x = 0;
    let y = 0;
    
    // Tolerance for floating point precision
    if (Math.abs(imgRatio - targetRatio) < 0.01) {
        return { x: 0, y: 0, width: 1, height: 1 };
    }

    if (imgRatio > targetRatio) {
        // Image is wider than target.
        // Height is the constraint (100% height).
        // Width should be cropped to match ratio.
        h = 1;
        w = targetRatio / imgRatio;
        x = (1 - w) / 2;
        y = 0;
    } else {
        // Image is taller than target.
        // Width is the constraint (100% width).
        // Height should be cropped.
        w = 1;
        h = imgRatio / targetRatio;
        x = 0;
        y = (1 - h) / 2;
    }
    return { x, y, width: w, height: h };
};

const App: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [cropPhotoId, setCropPhotoId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings from local storage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('polaroidStudioSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge with initial to ensure new fields (like separate paddings) exist if loading old config
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  // Save settings to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('polaroidStudioSettings', JSON.stringify(settings));
  }, [settings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const targetRatio = ASPECT_RATIOS[settings.aspectRatio];

      // Process files to get dimensions and calculate initial crop
      const processedPhotos = await Promise.all(files.map(async (file) => {
        const url = URL.createObjectURL(file);
        const id = simpleId();
        
        return new Promise<Photo>((resolve) => {
            const img = new Image();
            img.onload = () => {
                // Calculate optimal centered crop
                const crop = calculateCrop(img.width, img.height, targetRatio);
                
                resolve({
                    id,
                    url,
                    file,
                    caption: '',
                    crop,
                    originalWidth: img.width,
                    originalHeight: img.height
                });
            };
            img.onerror = () => {
                 // Fallback
                 resolve({
                    id,
                    url,
                    file,
                    caption: '',
                    crop: { x: 0, y: 0, width: 1, height: 1 },
                    originalWidth: 100,
                    originalHeight: 100
                });
            };
            img.src = url;
        });
      }));

      setPhotos(prev => [...prev, ...processedPhotos]);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    // If aspect ratio changes, recalculate crops for all photos to prevent distortion
    if (newSettings.aspectRatio && newSettings.aspectRatio !== settings.aspectRatio) {
       const ratio = ASPECT_RATIOS[newSettings.aspectRatio];
       setPhotos(prev => prev.map(p => {
           if (p.originalWidth && p.originalHeight) {
               return { 
                 ...p, 
                 crop: calculateCrop(p.originalWidth, p.originalHeight, ratio) 
               };
           }
           return p;
       }));
    }
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const updatePhotoCrop = (id: string, crop: { x: number; y: number; width: number; height: number }) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, crop } : p));
    setCropPhotoId(null);
  };

  const updateCaption = (id: string, text: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption: text } : p));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setTimeout(async () => {
        try {
            await generatePDF(photos, settings);
        } catch (error) {
            console.error("Export failed", error);
            alert("Falha ao exportar PDF. Tente novamente.");
        } finally {
            setIsExporting(false);
        }
    }, 100);
  };

  const photoToCrop = photos.find(p => p.id === cropPhotoId);

  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      
      {/* Settings Sidebar */}
      <Sidebar 
        settings={settings} 
        updateSettings={updateSettings} 
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
        
        {/* Toolbar / Header */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-4">
             <div className="text-sm text-gray-500">
               {photos.length} fotos adicionadas • Página {Math.ceil(photos.length / (settings.rows * settings.cols))}
             </div>
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            Adicionar Fotos
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-auto relative">
          {photos.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
               <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                 <ImagePlus size={48} className="text-gray-400" />
               </div>
               <h3 className="text-xl font-semibold text-gray-600 mb-2">Comece sua coleção</h3>
               <p className="max-w-md text-center mb-8">Adicione fotos para começar a criar seu layout de impressão. Arraste e solte ou use o botão acima.</p>
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="px-8 py-3 bg-white border border-gray-300 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
               >
                 Selecionar Imagens
               </button>
            </div>
          ) : (
             <GridPreview 
               photos={photos} 
               settings={settings} 
               onRemove={removePhoto} 
               onCrop={(photo) => setCropPhotoId(photo.id)}
               onUpdateCaption={updateCaption}
             />
          )}
        </div>
      </main>

      {/* Modals */}
      {photoToCrop && (
        <CropModal 
          photo={photoToCrop} 
          aspectRatio={settings.aspectRatio} 
          onSave={updatePhotoCrop} 
          onClose={() => setCropPhotoId(null)} 
        />
      )}
    </div>
  );
};

export default App;
