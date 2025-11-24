
import React, { useState, useEffect } from 'react';
import { Settings, PAPER_SIZES, ASPECT_RATIOS, AspectRatio, Preset } from '../types';
import { LayoutGrid, Printer, Type, Image as ImageIcon, Save, Trash2, FolderOpen } from 'lucide-react';

interface SidebarProps {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  onExport: () => void;
  isExporting: boolean;
  presets: Preset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  settings, 
  updateSettings, 
  onExport, 
  isExporting,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset
}) => {
  // Local state for inputs to allow empty values while typing
  const [rowsInput, setRowsInput] = useState(settings.rows.toString());
  const [colsInput, setColsInput] = useState(settings.cols.toString());
  
  // Preset States
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');

  // Sync local state when external settings change (e.g. on load)
  useEffect(() => {
    setRowsInput(settings.rows.toString());
  }, [settings.rows]);

  useEffect(() => {
    setColsInput(settings.cols.toString());
  }, [settings.cols]);

  const handleNumericInput = (
    value: string, 
    setter: React.Dispatch<React.SetStateAction<string>>, 
    field: keyof Settings
  ) => {
    setter(value); // Update local input state immediately
    
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed > 0) {
      updateSettings({ [field]: parsed });
    }
  };

  const handleBlur = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    currentSetting: number
  ) => {
    if (value === '' || isNaN(parseInt(value)) || parseInt(value) <= 0) {
        setter(currentSetting.toString());
    }
  }

  const handleSavePresetClick = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName);
      setNewPresetName('');
      setIsSavingPreset(false);
    }
  }

  return (
    <div className="w-full md:w-80 bg-white border-r h-screen overflow-y-auto flex flex-col shadow-xl z-20 no-scrollbar">
      <div className="p-6 border-b bg-gray-50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
           <Printer className="text-indigo-600" />
           Polaroid Studio
        </h1>
      </div>

      {/* PRESETS SECTION */}
      <div className="p-4 bg-indigo-50 border-b border-indigo-100">
         <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1">
               <FolderOpen size={14} /> Presets Salvos
            </span>
            {!isSavingPreset && (
              <button 
                onClick={() => setIsSavingPreset(true)}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Save size={14} /> Novo
              </button>
            )}
         </div>

         {isSavingPreset ? (
           <div className="space-y-2 animate-fade-in">
             <input 
               type="text" 
               placeholder="Nome do preset..." 
               value={newPresetName}
               onChange={(e) => setNewPresetName(e.target.value)}
               className="w-full text-xs p-2 rounded border border-indigo-200 focus:outline-none focus:border-indigo-400"
               autoFocus
             />
             <div className="flex gap-2">
                <button 
                  onClick={handleSavePresetClick}
                  disabled={!newPresetName.trim()}
                  className="flex-1 bg-indigo-600 text-white text-xs py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Salvar
                </button>
                <button 
                  onClick={() => setIsSavingPreset(false)}
                  className="flex-1 bg-white text-gray-600 text-xs py-1.5 rounded border hover:bg-gray-50"
                >
                  Cancelar
                </button>
             </div>
           </div>
         ) : (
           <div className="flex gap-2">
             <select 
               value={selectedPresetId}
               onChange={(e) => {
                 setSelectedPresetId(e.target.value);
                 if (e.target.value) onLoadPreset(e.target.value);
               }}
               className="flex-1 text-xs p-2 rounded border border-gray-300 bg-white focus:outline-none"
             >
               <option value="">Carregar configuração...</option>
               {presets.map(p => (
                 <option key={p.id} value={p.id}>{p.name}</option>
               ))}
             </select>
             {selectedPresetId && (
               <button 
                 onClick={() => {
                   onDeletePreset(selectedPresetId);
                   setSelectedPresetId('');
                 }}
                 className="p-2 text-red-500 hover:bg-red-50 bg-white border rounded"
                 title="Excluir preset selecionado"
               >
                 <Trash2 size={14} />
               </button>
             )}
           </div>
         )}
      </div>

      <div className="flex-1 p-6 space-y-8">
        
        {/* Layout Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
            <LayoutGrid size={18} />
            <h2>Layout da Página</h2>
          </div>
          <div className="space-y-4">
             <div>
               <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho do Papel</label>
               <select 
                 value={settings.paperSize}
                 onChange={(e) => updateSettings({ paperSize: e.target.value as any })}
                 className="w-full mt-1 p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               >
                 {Object.entries(PAPER_SIZES).map(([key, size]) => (
                   <option key={key} value={key}>{size.name}</option>
                 ))}
               </select>
             </div>

             {settings.paperSize === 'Custom' && (
               <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                     <label className="text-xs font-medium text-gray-500">Largura (mm)</label>
                     <input 
                       type="number" 
                       value={settings.customPaperWidth}
                       onChange={(e) => updateSettings({ customPaperWidth: parseInt(e.target.value) || 0 })}
                       className="w-full mt-1 p-1 border rounded text-sm text-center"
                     />
                  </div>
                  <div>
                     <label className="text-xs font-medium text-gray-500">Altura (mm)</label>
                     <input 
                       type="number" 
                       value={settings.customPaperHeight}
                       onChange={(e) => updateSettings({ customPaperHeight: parseInt(e.target.value) || 0 })}
                       className="w-full mt-1 p-1 border rounded text-sm text-center"
                     />
                  </div>
               </div>
             )}

             <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-xs font-medium text-gray-500 uppercase">Linhas</label>
                   <input 
                     type="number" 
                     min="1" 
                     max="10" 
                     value={rowsInput}
                     onChange={(e) => handleNumericInput(e.target.value, setRowsInput, 'rows')}
                     onBlur={() => handleBlur(rowsInput, setRowsInput, settings.rows)}
                     className="w-full mt-1 p-2 border rounded-lg bg-gray-50 text-sm"
                   />
                </div>
                <div>
                   <label className="text-xs font-medium text-gray-500 uppercase">Colunas</label>
                   <input 
                     type="number" 
                     min="1" 
                     max="10" 
                     value={colsInput}
                     onChange={(e) => handleNumericInput(e.target.value, setColsInput, 'cols')}
                     onBlur={() => handleBlur(colsInput, setColsInput, settings.cols)}
                     className="w-full mt-1 p-2 border rounded-lg bg-gray-50 text-sm"
                   />
                </div>
             </div>
             
             {/* Margins */}
             <div className="pt-2 space-y-3 border-t border-dashed border-gray-200">
                 <div>
                   <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-gray-500 uppercase">Margem Horizontal</label>
                        <span className="text-xs text-gray-500">{settings.paddingHorizontalMm}mm</span>
                   </div>
                   <input 
                     type="range" 
                     min="0" 
                     max="60" 
                     value={settings.paddingHorizontalMm}
                     onChange={(e) => updateSettings({ paddingHorizontalMm: parseInt(e.target.value) })}
                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"
                   />
                 </div>
                 
                 <div>
                   <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-gray-500 uppercase">Margem Vertical</label>
                        <span className="text-xs text-gray-500">{settings.paddingVerticalMm}mm</span>
                   </div>
                   <input 
                     type="range" 
                     min="0" 
                     max="60" 
                     value={settings.paddingVerticalMm}
                     onChange={(e) => updateSettings({ paddingVerticalMm: parseInt(e.target.value) })}
                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"
                   />
                 </div>
             </div>

             <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Orientação:</span>
                <div className="flex gap-2">
                   <button 
                     onClick={() => updateSettings({ orientation: 'portrait' })}
                     className={`px-3 py-1 text-xs rounded-md border ${settings.orientation === 'portrait' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white text-gray-600'}`}
                   >
                     Retrato
                   </button>
                   <button 
                     onClick={() => updateSettings({ orientation: 'landscape' })}
                     className={`px-3 py-1 text-xs rounded-md border ${settings.orientation === 'landscape' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white text-gray-600'}`}
                   >
                     Paisagem
                   </button>
                </div>
             </div>
          </div>
        </section>

        {/* Photo Style Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
            <ImageIcon size={18} />
            <h2>Estilo da Foto</h2>
          </div>
          
          <div className="space-y-4">
             <div>
               <label className="text-xs font-medium text-gray-500 uppercase">Formato</label>
               <select 
                 value={settings.style}
                 onChange={(e) => updateSettings({ style: e.target.value as any })}
                 className="w-full mt-1 p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               >
                 <option value="polaroid">Polaroid Clássica</option>
                 <option value="minimal">Borda Fina (Minimalista)</option>
                 <option value="borderless">Sem Borda (Preencher)</option>
               </select>
             </div>

             {settings.style === 'polaroid' && (
                <div>
                   <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-gray-500 uppercase">Espaço da Legenda</label>
                        <span className="text-xs text-gray-500">{settings.captionSpaceMm}mm</span>
                   </div>
                   <input 
                     type="range" 
                     min="10" 
                     max="60" 
                     value={settings.captionSpaceMm}
                     onChange={(e) => updateSettings({ captionSpaceMm: parseInt(e.target.value) })}
                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"
                   />
                </div>
             )}

             <div>
               <label className="text-xs font-medium text-gray-500 uppercase">Proporção da Imagem</label>
               <div className="grid grid-cols-4 gap-2 mt-1">
                 {Object.keys(ASPECT_RATIOS).map((ratio) => (
                   <button
                     key={ratio}
                     onClick={() => updateSettings({ aspectRatio: ratio as AspectRatio })}
                     className={`py-1 text-xs rounded border ${settings.aspectRatio === ratio ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                   >
                     {ratio}
                   </button>
                 ))}
               </div>
             </div>
             
             <div>
               <label className="text-xs font-medium text-gray-500 uppercase">Espaçamento entre fotos (mm)</label>
               <input 
                 type="range" 
                 min="0" 
                 max="30" 
                 value={settings.gapMm}
                 onChange={(e) => updateSettings({ gapMm: parseInt(e.target.value) })}
                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
               />
               <div className="text-right text-xs text-gray-500">{settings.gapMm}mm</div>
             </div>
          </div>
        </section>

        {/* Typography Section (Only if Polaroid) */}
        {settings.style === 'polaroid' && (
          <section className="animate-fade-in">
             <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold">
               <Type size={18} />
               <h2>Legendas</h2>
             </div>
             
             <div className="space-y-3">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox"
                   checked={settings.showCaptions}
                   onChange={(e) => updateSettings({ showCaptions: e.target.checked })}
                   className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                 />
                 <span className="text-sm text-gray-700">Exibir legendas</span>
               </label>

               {settings.showCaptions && (
                 <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Fonte</label>
                    <select 
                      value={settings.fontFamily}
                      onChange={(e) => updateSettings({ fontFamily: e.target.value as any })}
                      className="w-full mt-1 p-2 border rounded-lg bg-gray-50 text-sm"
                    >
                      <option value="Inter">Moderna (Sans-serif)</option>
                      <option value="Shadows Into Light">Manuscrita (Caneta)</option>
                      <option value="Permanent Marker">Marcador (Grosso)</option>
                    </select>
                 </div>
               )}
             </div>
          </section>
        )}
      </div>

      <div className="p-6 border-t bg-gray-50">
        <button 
          onClick={onExport}
          disabled={isExporting}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isExporting ? (
             <span className="animate-pulse">Gerando PDF...</span>
          ) : (
             <>
               <Printer size={20} />
               Exportar para PDF
             </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
