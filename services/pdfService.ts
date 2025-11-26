
import { jsPDF } from "jspdf";
import { Photo, Settings, PAPER_SIZES, ASPECT_RATIOS } from "../types";

export const generatePDF = async (photos: Photo[], settings: Settings) => {
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

  // Handle Orientation manually because jsPDF orientation flip can be confusing with custom sizes
  // We define the physical paper dimensions based on the requested orientation
  const isPortrait = settings.orientation === 'portrait';
  
  // If portrait, width is smallest. If landscape, width is largest.
  // We normalize the inputs first.
  const dim1 = Math.min(paperWidthMm, paperHeightMm);
  const dim2 = Math.max(paperWidthMm, paperHeightMm);

  const finalDocW = isPortrait ? dim1 : dim2;
  const finalDocH = isPortrait ? dim2 : dim1;

  const doc = new jsPDF({
    orientation: settings.orientation,
    unit: "mm",
    format: [finalDocW, finalDocH], 
  });

  const { rows, cols, gapMm, paddingHorizontalMm, paddingVerticalMm, style, aspectRatio, showCaptions, captionSpaceMm, captionFontSize } = settings;
  const ratioValue = ASPECT_RATIOS[aspectRatio];

  // Calculate grid cell dimensions
  const availableWidth = finalDocW - (paddingHorizontalMm * 2) - (gapMm * (cols - 1));
  const availableHeight = finalDocH - (paddingVerticalMm * 2) - (gapMm * (rows - 1));
  
  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;

  const itemsPerPage = rows * cols;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const pageIndex = Math.floor(i / itemsPerPage);
    const itemIndex = i % itemsPerPage;
    const row = Math.floor(itemIndex / cols);
    const col = itemIndex % cols;

    if (itemIndex === 0 && pageIndex > 0) {
      doc.addPage();
    }

    const x = paddingHorizontalMm + col * (cellWidth + gapMm);
    const y = paddingVerticalMm + row * (cellHeight + gapMm);

    // Draw Card Background
    // Check if background is transparent
    const isTransparent = settings.backgroundColor === '#ffffff00' || settings.backgroundColor === 'transparent';
    
    if (!isTransparent) {
        doc.setFillColor(settings.backgroundColor);
        
        // Draw background/border logic
        if (style !== 'borderless') {
          doc.rect(x, y, cellWidth, cellHeight, "F");
          // Optional minimal border for contrast if background is white
          if (settings.backgroundColor.toLowerCase() === '#ffffff' || settings.backgroundColor.toLowerCase() === '#fff') {
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.1);
            doc.rect(x, y, cellWidth, cellHeight, "S");
          }
        }
    }

    // Calculate Image Placement within Cell
    let imgX = x;
    let imgY = y;
    let imgW = cellWidth;
    let imgH = cellHeight;
    
    // Inner padding for styles
    let innerPadding = 0;
    let bottomPadding = 0;

    if (style === 'polaroid') {
      innerPadding = cellWidth * 0.05; // 5% side margin
      // Use configured caption space
      bottomPadding = captionSpaceMm || 25; 
      
      // Reduce drawing area for image
      imgX += innerPadding;
      imgY += innerPadding;
      imgW -= (innerPadding * 2);
      imgH -= (innerPadding + bottomPadding);
      
    } else if (style === 'minimal') {
      innerPadding = 3; // 3mm border
      imgX += innerPadding;
      imgY += innerPadding;
      imgW -= (innerPadding * 2);
      imgH -= (innerPadding * 2);
    } 
    
    // Fit the aspect ratio box into this available [imgW, imgH] area.
    const areaH = imgH;
    const areaW = imgW;
    
    let finalImgW = areaW;
    let finalImgH = areaH;
    
    if (areaW / areaH > ratioValue) {
        // Area is wider than target ratio: Height is constraint
        finalImgH = areaH;
        finalImgW = areaH * ratioValue;
        // Center horizontally
        imgX += (areaW - finalImgW) / 2;
    } else {
        // Area is taller than target ratio: Width is constraint
        finalImgW = areaW;
        finalImgH = areaW / ratioValue;
        // Center vertically inside the image area
        imgY += (areaH - finalImgH) / 2;
    }

    // --- IMAGE PROCESSING ---
    
    const imgObj = new Image();
    imgObj.src = photo.url;
    
    await new Promise<void>((resolve) => {
        if(imgObj.complete) resolve();
        imgObj.onload = () => resolve();
        imgObj.onerror = () => resolve(); 
    });

    if (imgObj.width > 0) {
        // Step A: Create "Filtered" Canvas
        // Since rotation is removed, we only need to apply filters.
        
        const adj = photo.adjustments || { brightness: 100, contrast: 100, saturation: 100 };
        const transformCanvas = document.createElement('canvas');
        const tCtx = transformCanvas.getContext('2d');
        
        if (tCtx) {
            transformCanvas.width = imgObj.width;
            transformCanvas.height = imgObj.height;

            // Apply Filters
            // Note: ctx.filter is supported in modern browsers. 
            tCtx.filter = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;

            tCtx.drawImage(imgObj, 0, 0);
            
            // Step B: Crop from the Filtered Canvas
            // photo.crop {x, y, w, h} is relative to this canvas size
            
            const cropCanvas = document.createElement('canvas');
            // High res for print
            const printScale = 4; 
            const finalPixelW = finalImgW * 3.78 * printScale; 
            const finalPixelH = finalImgH * 3.78 * printScale;
            
            cropCanvas.width = finalPixelW;
            cropCanvas.height = finalPixelH;
            const cCtx = cropCanvas.getContext('2d');
            
            if (cCtx) {
                const sw = transformCanvas.width;
                const sh = transformCanvas.height;
                
                const sx = photo.crop.x * sw;
                const sy = photo.crop.y * sh;
                const sWidth = photo.crop.width * sw;
                const sHeight = photo.crop.height * sh;

                cCtx.drawImage(
                    transformCanvas, 
                    sx, sy, sWidth, sHeight,
                    0, 0, finalPixelW, finalPixelH
                );

                const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.95);
                doc.addImage(croppedDataUrl, 'JPEG', imgX, imgY, finalImgW, finalImgH);
            }
        }
    }

    // Add Caption
    if (showCaptions && photo.caption && style === 'polaroid') {
       // Use configured font size
       doc.setFontSize(captionFontSize || 10);
       
       if (settings.fontFamily.includes('Marker') || settings.fontFamily.includes('Shadows')) {
           doc.setFont("courier", "bolditalic"); 
       } else {
           doc.setFont("helvetica");
       }
       
       doc.setTextColor(50, 50, 50);
       
       const textAreaTop = y + cellHeight - bottomPadding;
       const textAreaHeight = bottomPadding;
       const textCenterY = textAreaTop + (textAreaHeight / 2) + 1; 
       
       doc.text(photo.caption, x + cellWidth / 2, textCenterY, { align: 'center', maxWidth: cellWidth - 10 });
    }
  }

  doc.save("polaroids.pdf");
};

export const generatePNG = async (photos: Photo[], settings: Settings) => {
  // 1. Calculate Dimensions (duplicated from PDF logic)
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

  const isPortrait = settings.orientation === 'portrait';
  const dim1 = Math.min(paperWidthMm, paperHeightMm);
  const dim2 = Math.max(paperWidthMm, paperHeightMm);
  const finalDocW = isPortrait ? dim1 : dim2;
  const finalDocH = isPortrait ? dim2 : dim1;

  // Scale: 4 pixels per mm -> ~100 pixels per inch (~400 DPI equivalent) for high quality
  const SCALE = 8;
  const widthPx = Math.ceil(finalDocW * SCALE);
  const heightPx = Math.ceil(finalDocH * SCALE);

  const { rows, cols, gapMm, paddingHorizontalMm, paddingVerticalMm, style, aspectRatio, showCaptions, captionSpaceMm, captionFontSize } = settings;
  const ratioValue = ASPECT_RATIOS[aspectRatio];

  const availableWidth = finalDocW - (paddingHorizontalMm * 2) - (gapMm * (cols - 1));
  const availableHeight = finalDocH - (paddingVerticalMm * 2) - (gapMm * (rows - 1));
  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;

  const itemsPerPage = rows * cols;
  const totalPages = Math.ceil(Math.max(photos.length, 1) / itemsPerPage);

  for (let p = 0; p < totalPages; p++) {
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // 1. Fill Background
    // If transparent is selected, we simply don't fill the background. Canvas is transparent by default.
    if (settings.backgroundColor !== '#ffffff00') {
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, widthPx, heightPx);
    }

    // Loop items for this page
    const startIdx = p * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, photos.length);

    for (let i = startIdx; i < endIdx; i++) {
        const photo = photos[i];
        const itemIndex = i % itemsPerPage;
        const row = Math.floor(itemIndex / cols);
        const col = itemIndex % cols;
        
        const xMm = paddingHorizontalMm + col * (cellWidth + gapMm);
        const yMm = paddingVerticalMm + row * (cellHeight + gapMm);
        
        // Convert to Pixels
        const x = xMm * SCALE;
        const y = yMm * SCALE;
        const w = cellWidth * SCALE;
        const h = cellHeight * SCALE;

        // Draw Card Background / Border
        if (style !== 'borderless') {
          if (settings.backgroundColor !== '#ffffff00') {
             ctx.fillStyle = settings.backgroundColor;
             ctx.fillRect(x, y, w, h);
             
             if (settings.backgroundColor.toLowerCase() === '#ffffff' || settings.backgroundColor.toLowerCase() === '#fff') {
                ctx.strokeStyle = '#e6e6e6';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, w, h);
             }
          }
        }

        // Calculate Image Placement
        let imgX = x;
        let imgY = y;
        let imgW = w;
        let imgH = h;
        
        let innerPaddingMm = 0;
        let bottomPaddingMm = 0;

        if (style === 'polaroid') {
            innerPaddingMm = cellWidth * 0.05;
            bottomPaddingMm = captionSpaceMm || 25;
            
            imgX += innerPaddingMm * SCALE;
            imgY += innerPaddingMm * SCALE;
            imgW -= (innerPaddingMm * 2) * SCALE;
            imgH -= (innerPaddingMm + bottomPaddingMm) * SCALE;
        } else if (style === 'minimal') {
            innerPaddingMm = 3;
            imgX += innerPaddingMm * SCALE;
            imgY += innerPaddingMm * SCALE;
            imgW -= (innerPaddingMm * 2) * SCALE;
            imgH -= (innerPaddingMm * 2) * SCALE;
        }

        const ratio = ratioValue;
        const areaW = imgW;
        const areaH = imgH;
        let finalImgW = areaW;
        let finalImgH = areaH;

        if (areaW / areaH > ratio) {
            finalImgH = areaH;
            finalImgW = areaH * ratio;
            imgX += (areaW - finalImgW) / 2;
        } else {
            finalImgW = areaW;
            finalImgH = areaW / ratio;
            imgY += (areaH - finalImgH) / 2;
        }

        // --- DRAW IMAGE ---
        const imgObj = new Image();
        imgObj.src = photo.url;
        await new Promise<void>(resolve => {
             if (imgObj.complete) resolve();
             else { imgObj.onload = () => resolve(); imgObj.onerror = () => resolve(); }
        });

        if (imgObj.width > 0) {
            // Apply Filters via Temp Canvas
            const adj = photo.adjustments || { brightness: 100, contrast: 100, saturation: 100 };
            const tempC = document.createElement('canvas');
            tempC.width = imgObj.width;
            tempC.height = imgObj.height;
            const tCtx = tempC.getContext('2d');
            if (tCtx) {
                tCtx.filter = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
                tCtx.drawImage(imgObj, 0, 0);

                // Source Coords
                const sx = photo.crop.x * tempC.width;
                const sy = photo.crop.y * tempC.height;
                const sWidth = photo.crop.width * tempC.width;
                const sHeight = photo.crop.height * tempC.height;

                ctx.save();
                // Create a clipping path for the image area to ensure no bleed
                ctx.beginPath();
                ctx.rect(imgX, imgY, finalImgW, finalImgH);
                ctx.clip();
                
                ctx.drawImage(tempC, sx, sy, sWidth, sHeight, imgX, imgY, finalImgW, finalImgH);
                ctx.restore();
            }
        }

        // --- CAPTION ---
        if (showCaptions && photo.caption && style === 'polaroid') {
            ctx.fillStyle = '#323232';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Heuristic for font size: base set by user (e.g. 12px) 
            // We need to scale it up because the canvas is high res (SCALE = 8)
            // 1pt ~ 1.33px. 
            const userFontSize = captionFontSize || 12;
            // Let's approximate a scaling factor.
            // Screen scale is approx 3. Print scale is 8.
            // If user sees 12px on screen, in print it should be proportionally readable.
            const fontSizePx = userFontSize * (SCALE / 3.0) * 1.5; // Adjust multiplier for readability
            
            ctx.font = `${fontSizePx}px "${settings.fontFamily}", sans-serif`;
            if (settings.fontFamily === 'Shadows Into Light') {
                ctx.font = `${fontSizePx * 1.2}px "Shadows Into Light", cursive`;
            } else if (settings.fontFamily === 'Permanent Marker') {
                ctx.font = `${fontSizePx}px "Permanent Marker", cursive`;
            } else if (settings.fontFamily === 'Inter') {
                ctx.font = `${fontSizePx}px "Inter", sans-serif`;
            }

            const textAreaTop = y + h - (bottomPaddingMm * SCALE);
            const textAreaHeight = bottomPaddingMm * SCALE;
            const textCenterY = textAreaTop + (textAreaHeight / 2);
            
            // Simple text wrap or truncation could go here, but for now we center text
            ctx.fillText(photo.caption, x + w / 2, textCenterY, w - 20);
        }
    }

    // Download PNG
    const link = document.createElement('a');
    link.download = `polaroid-page-${p + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
