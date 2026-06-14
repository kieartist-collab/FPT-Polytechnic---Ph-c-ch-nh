
import React, { useState, useRef, useEffect } from 'react';

interface ComparisonSliderProps {
  before: string;
  after: string | null;
  mask?: string | null;
}

type ViewMode = 'before' | 'slider' | 'after';

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ before, after, mask }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState<ViewMode>('before');
  const [isHovering, setIsHovering] = useState(false);
  
  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null); // Ref to the transformed content
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!after) {
      setViewMode('before');
    } else {
      setViewMode('slider');
    }
  }, [after]);

  // --- ZOOM LOGIC ---
  const handleZoom = (delta: number) => {
    setScale(prev => {
      const newScale = Math.max(1, Math.min(prev + delta, 8)); // Max zoom 8x, Min 1x
      if (newScale === 1) setPosition({ x: 0, y: 0 }); // Reset pos if zoomed out
      return newScale;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation(); // Cho phép scroll trang nếu chưa zoom, nhưng ở đây ta prevent để zoom ảnh
    if (e.ctrlKey || scale > 1) {
       // Nếu đang giữ Ctrl hoặc đã zoom thì ưu tiên zoom ảnh
       // Tuy nhiên để UX tốt, ta cứ cho wheel là zoom
    }
    const delta = -e.deltaY * 0.002;
    handleZoom(delta * 5); // Tốc độ zoom
  };

  // --- PANNING & SLIDER LOGIC ---
  
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    dragStartRef.current = { x: clientX, y: clientY };
    startPosRef.current = { ...position };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    if (isDragging && scale > 1) {
      // PANNING MODE (Chỉ khi đã zoom)
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      
      // Giới hạn vùng kéo (Optional: có thể thêm logic boundary)
      setPosition({
        x: startPosRef.current.x + dx / scale, // Chia scale để cảm giác kéo thật tay hơn
        y: startPosRef.current.y + dy / scale
      });
    } else if (!isDragging && viewMode === 'slider') {
      // SLIDER MODE (Chỉ khi không kéo ảnh)
      if (!isHovering) setIsHovering(true);
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const positionRaw = (x / rect.width) * 100;
      const clampedPos = Math.min(Math.max(positionRaw, 0), 100);
      setSliderPos(clampedPos);
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsDragging(false);
    if (scale === 1) setSliderPos(50);
  };

  return (
    <div className="relative w-full h-auto flex flex-col gap-2 select-none group/wrapper">
      
      {/* --- HEADER CONTROLS (View Mode) --- */}
      <div className="flex justify-center gap-2 mb-1 z-30 pointer-events-none">
        <div className="bg-[#02060c]/80 backdrop-blur-xl border border-[#0767B1]/30 p-1.5 rounded-xl flex gap-1 shadow-[0_0_20px_rgba(7,103,177,0.15)] pointer-events-auto">
          {[
            { id: 'before', label: 'Ảnh Gốc', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { id: 'slider', label: 'So Sánh', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
            { id: 'after', label: 'Kết Quả AI', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
          ].map((mode) => {
             const isDisabled = !after && mode.id !== 'before';
             return (
               <button 
                key={mode.id}
                onClick={() => !isDisabled && setViewMode(mode.id as ViewMode)}
                disabled={isDisabled}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 font-bold text-[11px] ${
                  isDisabled 
                    ? 'opacity-30 cursor-not-allowed grayscale bg-transparent text-[#0767B1]' 
                    : viewMode === mode.id 
                      ? 'bg-[#11AF4B] text-white shadow-[0_0_15px_rgba(17,175,75,0.4)] hover:scale-105' 
                      : 'text-[#0767B1] hover:text-[#11AF4B] hover:bg-[#11AF4B]/10 hover:scale-105'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} /></svg>
                <span className="font-heading uppercase">{mode.label}</span>
              </button>
             );
          })}
        </div>
      </div>

      {/* --- MAIN VIEWPORT (Overflow Hidden) --- */}
      <div 
        className={`relative overflow-hidden rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-[#0767B1]/30 bg-[#02060c]/60 
          ${isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-col-resize'}`}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(7,103,177,0.1),transparent)] opacity-50 pointer-events-none"></div>

        {/* --- TRANSFORMED CONTENT CONTAINER --- */}
        <div 
          ref={containerRef}
          style={{ 
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)',
            transformOrigin: 'center center'
          }}
          className="relative w-full h-full flex items-center justify-center will-change-transform"
        >
          {/* SPACER IMAGE (Định hình kích thước) */}
          <img 
              src={before} 
              alt="Spacer"
              className="block w-auto h-auto max-h-[calc(100vh-180px)] max-w-full opacity-0 pointer-events-none relative z-0"
          />

          {/* CONTENT LAYERS */}
          <div className="absolute inset-0 grid place-items-center w-full h-full z-10">
            
            {viewMode === 'before' && (
              <>
                <img src={before} alt="Original" className="col-start-1 row-start-1 max-w-full max-h-full w-auto h-auto object-contain block select-none pointer-events-none" />
                {mask && (
                  <img src={mask} alt="Mask" className="col-start-1 row-start-1 max-w-full max-h-full w-auto h-auto object-contain z-20 pointer-events-none opacity-60 mix-blend-screen block select-none" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))' }} />
                )}
              </>
            )}

            {viewMode === 'slider' && after && (
              <div className="col-start-1 row-start-1 relative w-full h-full flex items-center justify-center">
                <div className="relative w-full h-full"> 
                   <img src={after} alt="After" className="absolute inset-0 w-full h-full object-contain block select-none pointer-events-none" />
                   
                   <div 
                     className="absolute inset-0 w-full h-full z-10"
                     style={{ 
                       clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                       transition: isHovering && !isDragging ? 'none' : 'clip-path 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                     }}
                   >
                     <img src={before} alt="Before" className="w-full h-full object-contain block select-none pointer-events-none" />
                   </div>
    
                   {/* Thanh Slider */}
                   <div 
                     className="absolute top-0 bottom-0 w-[2px] bg-[#F16F24] shadow-[0_0_15px_#F16F24] z-20 pointer-events-none"
                     style={{ 
                       left: `${sliderPos}%`,
                       transition: isHovering && !isDragging ? 'none' : 'left 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                     }}
                   >
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-[#02060c] rounded-full shadow-[0_0_20px_#F16F24] flex items-center justify-center border-2 border-[#F16F24] scale-[1] group-hover/wrapper:scale-100 md:scale-[1]">
                       <div className="flex gap-1">
                         <div className="w-0.5 md:w-1 h-3 bg-[#F16F24] rounded-full animate-pulse"></div>
                         <div className="w-0.5 md:w-1 h-5 bg-[#F16F24] rounded-full"></div>
                         <div className="w-0.5 md:w-1 h-3 bg-[#F16F24] rounded-full animate-pulse"></div>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            )}

            {viewMode === 'after' && after && (
              <img src={after} alt="Restored Raw" className="col-start-1 row-start-1 max-w-full max-h-full w-auto h-auto object-contain block select-none pointer-events-none" />
            )}
          </div>
        </div>

        {/* --- ZOOM CONTROLS (Floating Bottom Center) --- */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
           <div className="bg-[#02060c]/80 backdrop-blur-md border border-[#0767B1]/30 p-1 rounded-xl flex items-center shadow-2xl">
              <button 
                onClick={() => handleZoom(-0.5)} 
                className="w-8 h-8 flex items-center justify-center text-[#0767B1] hover:bg-[#0767B1]/20 hover:text-white rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              
              <button 
                onClick={handleResetZoom}
                className="px-3 h-8 flex items-center justify-center text-[10px] font-heading font-black text-[#11AF4B] border-x border-[#0767B1]/20 mx-1 hover:bg-[#11AF4B]/10 rounded transition-colors w-16"
                title="Xem 100% (Vừa màn hình)"
              >
                {Math.round(scale * 100)}%
              </button>
              
              <button 
                onClick={() => handleZoom(0.5)}
                className="w-8 h-8 flex items-center justify-center text-[#0767B1] hover:bg-[#0767B1]/20 hover:text-white rounded-lg transition-colors"
                title="Phóng to"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
           </div>
        </div>

        {/* --- INFO BADGE (Top Left) --- */}
        <div className="absolute top-4 left-4 pointer-events-none z-30 opacity-60 hover:opacity-100 transition-opacity">
          <div className="bg-black/60 backdrop-blur-md border border-[#0767B1]/30 px-3 py-1.5 rounded text-[10px] font-heading font-bold uppercase text-[#0767B1]">
            <span className="text-[#11AF4B] mr-1">
              {viewMode === 'before' ? (mask ? 'ẢNH GỐC + MASK' : 'ẢNH GỐC') : viewMode === 'slider' ? 'CHẾ ĐỘ SO SÁNH' : 'KẾT QUẢ AI'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonSlider;
