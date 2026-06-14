
import React, { useState, useCallback } from 'react';
import EasyCropper from 'react-easy-crop';
import { ASPECT_RATIOS } from '../types';

interface CropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

const Cropper: React.FC<CropperProps> = ({ image, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(ASPECT_RATIOS[0].value);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async () => {
    try {
      const img = await createImage(image);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
      onCropComplete(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#02060c]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8">
      <div className="relative w-full max-w-5xl h-[60vh] rounded-3xl overflow-hidden border border-[#0767B1]/40 shadow-[0_0_50px_rgba(7,103,177,0.15)] group">
        <EasyCropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect === 0 ? undefined : aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropAreaComplete}
          onZoomChange={onZoomChange}
        />
        <div className="absolute inset-0 border-2 border-[#11AF4B]/20 pointer-events-none group-hover:border-[#11AF4B]/50 transition-colors duration-500"></div>
      </div>

      <div className="w-full max-w-5xl mt-8 space-y-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => setAspect(ratio.value)}
              className={`px-5 py-2.5 rounded-lg text-xs font-heading font-bold transition-all duration-300 border hover:scale-105 ${
                aspect === ratio.value 
                  ? 'bg-[#0767B1] text-white border-[#0767B1] shadow-[0_0_15px_rgba(7,103,177,0.4)]' 
                  : 'bg-black/40 text-[#0767B1] border-[#0767B1]/20 hover:border-[#0767B1] hover:text-white'
              }`}
            >
              TỶ LỆ {ratio.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex justify-center items-center gap-6">
          <span className="text-[11px] font-heading font-bold text-[#0767B1] uppercase tracking-widest">Độ Phóng Đại</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full max-w-sm accent-[#F16F24] cursor-pointer"
          />
        </div>

        <div className="flex justify-center gap-6 pt-4">
          <button
            onClick={onCancel}
            className="px-10 py-4 bg-transparent text-[#F16F24] border border-[#F16F24]/30 rounded-xl font-heading font-bold hover:bg-[#F16F24] hover:text-white transition-all duration-300 hover:shadow-[0_0_20px_rgba(241,111,36,0.3)] uppercase tracking-widest text-xs"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={getCroppedImg}
            className="px-12 py-4 bg-[#11AF4B] text-white rounded-xl font-heading font-bold hover:bg-[#0e963f] transition-all duration-300 shadow-[0_0_25px_rgba(17,175,75,0.3)] hover:shadow-[0_0_35px_rgba(17,175,75,0.5)] hover:scale-105 uppercase tracking-widest text-xs"
          >
            Xác Nhận Vùng Cắt
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cropper;
