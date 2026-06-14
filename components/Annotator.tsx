
import React, { useRef, useEffect, useState } from 'react';

interface AnnotatorProps {
  image: string;
  onConfirm: (maskImage: string | null) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const Annotator: React.FC<AnnotatorProps> = ({ image, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  // Thông tin về kích thước ảnh gốc
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

  // Load ảnh và setup canvas kích thước thật
  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      if (canvasRef.current) {
        canvasRef.current.width = img.naturalWidth;
        canvasRef.current.height = img.naturalHeight;
        renderCanvas([], null); // Khởi tạo nền đen
      }
    };
  }, [image]);

  // Vẽ lại canvas mỗi khi danh sách hình chữ nhật thay đổi
  useEffect(() => {
    renderCanvas(rects, currentRect);
  }, [rects, currentRect, imgDims]);

  const renderCanvas = (savedRects: Rect[], curr: Rect | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Xóa toàn bộ và tô nền đen (Mask nền)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Vẽ các hình chữ nhật đã lưu (Màu trắng)
    ctx.fillStyle = 'white';
    savedRects.forEach(r => {
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });

    // 3. Vẽ hình chữ nhật đang kéo (Màu trắng + Viền xanh để dễ nhìn)
    if (curr) {
      ctx.fillStyle = 'white';
      ctx.fillRect(curr.x, curr.y, curr.w, curr.h);
      
      // Vẽ viền hướng dẫn
      ctx.strokeStyle = '#11AF4B';
      ctx.lineWidth = canvas.width / 200; // Độ dày viền tương đối theo ảnh
      ctx.strokeRect(curr.x, curr.y, curr.w, curr.h);
    }
  };

  // Hàm tính toán tọa độ chuột chuẩn xác dựa trên vị trí hiển thị thực tế của ảnh (object-contain)
  const getImageCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || imgDims.w === 0) return null;

    const rect = container.getBoundingClientRect();
    
    // Tọa độ chuột trên màn hình
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Tọa độ chuột trong container
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    // Tính toán vùng hiển thị thực của ảnh (object-contain logic)
    const containerRatio = rect.width / rect.height;
    const imageRatio = imgDims.w / imgDims.h;

    let displayW, displayH, offsetX, offsetY;

    if (imageRatio > containerRatio) {
      // Ảnh rộng hơn container: khít chiều ngang, thừa chiều dọc
      displayW = rect.width;
      displayH = rect.width / imageRatio;
      offsetX = 0;
      offsetY = (rect.height - displayH) / 2;
    } else {
      // Ảnh cao hơn container: khít chiều dọc, thừa chiều ngang
      displayH = rect.height;
      displayW = rect.height * imageRatio;
      offsetX = (rect.width - displayW) / 2;
      offsetY = 0;
    }

    // Map tọa độ chuột vào tọa độ ảnh gốc
    const rawX = (mouseX - offsetX) * (imgDims.w / displayW);
    const rawY = (mouseY - offsetY) * (imgDims.h / displayH);

    return {
      x: Math.max(0, Math.min(imgDims.w, rawX)),
      y: Math.max(0, Math.min(imgDims.h, rawY))
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getImageCoords(e);
    if (!coords) return;
    
    setIsDragging(true);
    setStartPos(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const coords = getImageCoords(e);
    if (!coords) return;

    // Tính toán width/height, hỗ trợ kéo ngược chiều
    const w = coords.x - startPos.x;
    const h = coords.y - startPos.y;

    // Chuẩn hóa rect (x, y luôn là góc trên trái)
    const newRect = {
      x: w < 0 ? coords.x : startPos.x,
      y: h < 0 ? coords.y : startPos.y,
      w: Math.abs(w),
      h: Math.abs(h)
    };
    
    setCurrentRect(newRect);
  };

  const handleMouseUp = () => {
    if (isDragging && currentRect && currentRect.w > 0 && currentRect.h > 0) {
      setRects(prev => [...prev, currentRect]);
    }
    setIsDragging(false);
    setCurrentRect(null);
  };

  const handleUndo = () => {
    setRects(prev => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    // Nếu không có vùng chọn nào, trả về null để App hiểu là đã xóa mask
    if (rects.length === 0) {
      onConfirm(null);
      return;
    }

    if (canvasRef.current) {
      // Khi xuất ảnh, đảm bảo không còn viền hướng dẫn màu xanh
      renderCanvas(rects, null); 
      const maskData = canvasRef.current.toDataURL('image/png');
      onConfirm(maskData);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#02060c]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4">
      <div className="absolute top-6 text-center pointer-events-none">
        <h3 className="text-[#11AF4B] font-heading font-black text-xl mb-1 uppercase tracking-widest">Chế Độ Chọn Vùng (Mask)</h3>
        <p className="text-[#0767B1] text-xs font-bold uppercase">Kéo chuột để vẽ hình chữ nhật bao quanh vùng cần xử lý</p>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl h-[60vh] flex items-center justify-center border border-[#0767B1]/30 rounded-2xl overflow-hidden bg-black/50 shadow-2xl cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Ảnh nền hiển thị để user biết mình đang vẽ lên đâu */}
        <img 
          src={image} 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
          alt="Reference" 
        />
        
        {/* Canvas mask phủ lên trên */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-60"
          style={{ mixBlendMode: 'screen' }} 
        />
      </div>

      <div className="w-full max-w-4xl mt-6 flex justify-between items-center bg-black/40 p-4 rounded-xl border border-[#0767B1]/20">
        <div className="flex gap-4">
           <button onClick={onCancel} className="px-6 py-3 rounded-lg border border-[#F16F24]/30 text-[#F16F24] hover:bg-[#F16F24] hover:text-white font-heading font-bold text-xs uppercase transition-all">Hủy Bỏ</button>
           <button onClick={() => setRects([])} className="px-6 py-3 rounded-lg border border-[#0767B1]/30 text-[#0767B1] hover:bg-[#0767B1] hover:text-white font-heading font-bold text-xs uppercase transition-all">Xóa Hết</button>
        </div>

        <div className="flex gap-4">
           <button 
             onClick={handleUndo} 
             disabled={rects.length === 0}
             className={`px-6 py-3 rounded-lg border font-heading font-bold text-xs uppercase transition-all flex items-center gap-2 ${rects.length === 0 ? 'border-[#0767B1]/10 text-[#0767B1]/30 cursor-not-allowed' : 'border-[#0767B1]/30 text-[#0767B1] hover:bg-[#0767B1] hover:text-white'}`}
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
             Hoàn tác
           </button>
           <button onClick={handleConfirm} className="px-8 py-3 rounded-lg bg-[#11AF4B] text-white hover:bg-[#0e963f] font-heading font-black text-xs uppercase shadow-[0_0_20px_rgba(17,175,75,0.4)] transition-all hover:scale-105 flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
             {rects.length === 0 ? 'Xác Nhận (Xóa Mask)' : `Xác Nhận (${rects.length} vùng)`}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Annotator;
