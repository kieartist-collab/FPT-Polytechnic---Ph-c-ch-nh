
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RESTORATION_TAGS, ImageState, Tag, HistoryItem, Gender, AgeRange, GENDER_OPTIONS, AGE_OPTIONS } from './types';
import { restoreImage, analyzeAndSuggestPrompts, analyzeStyleReference } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';
import Cropper from './components/Cropper';
import Annotator from './components/Annotator';



const LOADING_MESSAGES = [
  { p: 0, text: "Khởi tạo mạng neural..." },
  { p: 15, text: "Quét dữ liệu pixel gốc..." },
  { p: 30, text: "Phân tích cấu trúc khuôn mặt..." },
  { p: 45, text: "Loại bỏ nhiễu kỹ thuật số..." },
  { p: 60, text: "Tái tạo chi tiết bị mất..." },
  { p: 75, text: "Cân bằng màu sắc & ánh sáng..." },
  { p: 90, text: "Hoàn thiện kết xuất..." },
];

const ADVANCED_PRESETS = [
  {
    label: 'Chân dung siêu thực',
    value: 'A breathtaking, hyper-realistic portrait restoration. Emphasize ultra-detailed facial features, lifelike skin pores, natural subsurface scattering, and expressive, crystal-clear eyes. Preserve the exact historical identity and bone structure.'
  },
  {
    label: 'Lên màu da chân thực',
    value: 'Intelligently colorize the vintage black-and-white portrait with historically accurate, vibrant, and rich tones. Ensure skin tones are warm, natural, and appropriate for the subject\'s ethnicity. Avoid color bleeding.'
  },
  {
    label: 'Chi tiết tóc & nếp nhăn',
    value: 'Dramatically enhance the micro-details of the subject\'s hair and facial lines. Sharpen individual hair strands and vintage hairstyles. Preserve natural wrinkles, age spots, and character-defining marks.'
  },
  {
    label: 'Chi tiết mắt & Ánh nhìn',
    value: 'Enhance the intricate details in the eyes, such as the iris patterns, reflections, and eyelash texture. Restore the catchlights to bring life and soul back into the subject\'s gaze.'
  },
  {
    label: 'Trang phục chân dung cổ',
    value: 'Meticulously restore the textures of vintage portrait attire. Bring out the tactile qualities of old suits, lace collars, military uniforms, or traditional dresses. Ensure seams and fabrics are historically authentic.'
  },
  {
    label: 'Nụ cười & Răng tự nhiên',
    value: 'Carefully restore smiles and teeth. Ensure individual teeth are naturally defined, appropriately shaped, and have a realistic off-white tone. Preserve the unique, natural dental structure of the subject.'
  },
  {
    label: 'Khử nhiễu & Xóa xước mặt',
    value: 'Flawlessly reconstruct areas of the face that are torn, scratched, or water-damaged. Intelligently synthesize textures that perfectly match the surrounding skin without leaving traces of physical damage.'
  },
  {
    label: 'Ánh sáng studio cổ điển',
    value: 'Recreate the soft, dramatic lighting typical of vintage portrait studios. Balance shadows and highlights to create depth, recovering blown-out highlights on the face and softening harsh shadows.'
  },
  {
    label: 'Bảo tồn nét mặt gốc',
    value: 'Strictly preserve the original facial geometry, micro-expressions, and emotional nuance. The restoration must capture the exact soul and personality of the ancestor as captured in the original moment.'
  },
  {
    label: 'Kết cấu da người lớn tuổi',
    value: 'Recreate authentic, age-appropriate skin textures for elderly subjects. Do not airbrush away their lived experience. Ensure the skin reflects light naturally with a healthy, lifelike matte finish.'
  }
];

const NEGATIVE_PRESETS = [
  {
    label: 'Mất bản sắc khuôn mặt',
    value: 'Do not alter the fundamental bone structure, facial proportions, or identity of the subject. Avoid asymmetrical eyes, unnatural jawlines, or any AI hallucinations that make the person look like a different individual.'
  },
  {
    label: 'Da nhựa/Cà láng',
    value: 'Avoid excessive skin smoothing, plastic-like textures, or modern beauty filters. Do not remove natural age lines, pores, or character-defining facial marks. The skin must not look like a mannequin.'
  },
  {
    label: 'Mắt vô hồn/Lác',
    value: 'Avoid dead, glassy, or cross-eyed looks. Do not generate unnatural catchlights, mismatched pupil sizes, or overly bright whites of the eyes that look demonic or artificial.'
  },
  {
    label: 'Răng sứ giả tạo',
    value: 'Strictly avoid generating fused, unseparated, or excessively numerous teeth. Do not create unnatural, glowing white teeth that look like modern veneers. Teeth must maintain natural human dental anatomy.'
  },
  {
    label: 'Tóc bết/Nhựa',
    value: 'Prevent hair from looking like solid plastic blocks, overly smooth helmets, or chaotic, disconnected strands. Avoid unnatural hair colors or excessive shine.'
  },
  {
    label: 'Màu da sai lệch',
    value: 'Prevent unnatural neon hues or historically inaccurate palettes. Skin tones must not look overly orange, pink, or lifeless. Avoid patchy colorization or color bleeding onto clothing.'
  },
  {
    label: 'Ảo giác chi tiết mặt',
    value: 'Strictly prohibit the generation of facial elements that were not in the original photo. Do not add extra eyelashes, morphed ears, or strange blemishes. Maintain absolute faithfulness to the original face.'
  },
  {
    label: 'Trang phục hiện đại hóa',
    value: 'Do not modernize or alter historical clothing elements. Vintage attire must retain its period-accurate appearance. Do not hallucinate modern logos, zippers, or inappropriate fabrics.'
  },
  {
    label: 'Viền sáng quanh người',
    value: 'Avoid harsh, jagged edges, ringing artifacts, or glowing halos around the portrait subject caused by excessive sharpening. The silhouette against the background must remain natural.'
  },
  {
    label: 'Xóa nhòa nếp nhăn',
    value: 'Do not erase the natural signs of aging. Do not make an elderly person look decades younger. Preserve the dignity and character of the subject\'s actual age at the time the photo was taken.'
  }
];



const App: React.FC = () => {
  const [state, setState] = useState<ImageState>({
    original: null,
    cropped: null,
    restored: null,
    mask: null,
    history: [],
    filename: 'image',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  
  const [positivePrompt, setPositivePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isPromptDirty, setIsPromptDirty] = useState(false);
  const [isSuggesting, setIsLoadingSuggesting] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<{positive: string, negative: string} | null>(null);

  // New state for Style Reference
  const [styleRefImage, setStyleRefImage] = useState<string | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [gender, setGender] = useState<Gender>('unspecified');
  const [age, setAge] = useState<AgeRange>('young_adult');

  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0].text);
  const progressInterval = useRef<any>(null);


  
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (leftPanelRef.current) {
        const x = e.clientX;
        const y = e.clientY;
        leftPanelRef.current.style.setProperty('--mouse-x', `${x}px`);
        leftPanelRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const analyzeImage = async (imageSrc: string, currentTags: string[] = []) => {
    setIsLoadingSuggesting(true);
    setSuggestedPrompts(null);
    try {
      const result = await analyzeAndSuggestPrompts(
        imageSrc,
        currentTags
      );
      
      setGender(result.gender);
      setAge(result.age);

      setSuggestedPrompts({
        positive: result.positive,
        negative: result.negative
      });
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError("AI không phản hồi. Có thể do API Key hoặc lỗi mạng.");
    } finally {
      setIsLoadingSuggesting(false);
    }
  };



  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setState({ 
        original: result, 
        cropped: result, 
        restored: null,
        mask: null,
        history: [],
        filename: fileName.split('.')[0]
      });
      setError(null);
      setSelectedTags([]);
      setGender('unspecified'); 
      setAge('young_adult');
      setPositivePrompt('');
      setNegativePrompt('');
      setStyleRefImage(null);
      setIsPromptDirty(false);
      setSuggestedPrompts(null);
      analyzeImage(result, []); 
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Handler for Style Reference Upload
  const handleStyleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setStyleRefImage(result);
        setIsAnalyzingStyle(true);
        setError(null);

        try {
          // Analyze style via Gemini
          const analysis = await analyzeStyleReference(result);
          setPositivePrompt(prev => {
             // Append or Replace? User said "system will auto fill". Let's replace for clarity, or append with newline.
             // Strategy: Replace to respect the "Reference Style" intention fully.
             return analysis.positive; 
          });
          setNegativePrompt(analysis.negative);
          setIsPromptDirty(true);
        } catch (err) {
          setError("Lỗi khi phân tích ảnh tham chiếu. Vui lòng thử lại.");
        } finally {
          setIsAnalyzingStyle(false);
          // Reset file input so user can re-upload same file if needed
          if (styleInputRef.current) styleInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeStyleRef = () => {
    setStyleRefImage(null);
    setPositivePrompt('');
    setNegativePrompt('');
    setIsPromptDirty(false);
  };

  const toggleTag = (tagLabel: string) => {
    const tag = RESTORATION_TAGS.find(t => t.label === tagLabel);
    if (!tag) return;
    setSelectedTags(prev => {
      const isSelected = prev.includes(tagLabel);
      return isSelected ? prev.filter(t => t !== tagLabel) : [...prev, tagLabel];
    });
    setIsPromptDirty(true);
  };

  const startProgressSimulation = () => {
    setProgress(0);
    setLoadingText(LOADING_MESSAGES[0].text);
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        let increment = 0;
        if (prev < 30) increment = Math.random() * 5;
        else if (prev < 60) increment = Math.random() * 2;
        else if (prev < 80) increment = Math.random() * 1;
        else if (prev < 95) increment = 0.2;
        const next = Math.min(prev + increment, 95);
        const msg = LOADING_MESSAGES.slice().reverse().find(m => next >= m.p);
        if (msg) setLoadingText(msg.text);
        return next;
      });
    }, 200);
  };

  const stopProgressSimulation = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  const handleRestore = async () => {
    if (!state.cropped) return;
    setIsLoading(true);
    setError(null);
    setIsPromptDirty(false);
    startProgressSimulation();
    try {
      const result = await restoreImage(
        state.cropped,
        positivePrompt,
        negativePrompt,
        selectedTags, 
        { gender, age },
        undefined,
        state.mask
      );
      stopProgressSimulation();
      setProgress(100);
      setLoadingText("Xử lý hoàn tất - Đang tải dữ liệu...");
      await new Promise(resolve => setTimeout(resolve, 600));
      if (result) {
        const newHistoryItem: HistoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          image: result,
          timestamp: Date.now(),
          tags: [...selectedTags],
          positivePrompt: positivePrompt,
          negativePrompt: negativePrompt
        };
        setState(prev => ({ 
          ...prev, 
          restored: result,
          history: [newHistoryItem, ...prev.history]
        }));
      }
    } catch (err: any) {
      let detailedError = err.message || JSON.stringify(err);
      if (detailedError.includes('403') || detailedError.includes('API key not valid')) {
        setError("LỖI API KEY: Key không hợp lệ. Vui lòng liên hệ quản trị viên.");
      } else if (detailedError.includes('429') || detailedError.includes('Quota')) {
        setError("QUÁ TẢI (429): Bạn đang gửi yêu cầu quá nhanh. Hãy đợi 1-2 phút.");
      } else if (detailedError.includes('503')) {
         setError("MÁY CHỦ BẬN (503): Google AI đang bảo trì hoặc quá tải.");
      } else {
        setError(`LỖI HỆ THỐNG: ${detailedError.substring(0, 100)}...`);
      }
    } finally {
      setIsLoading(false);
      stopProgressSimulation();
      setProgress(0);
    }
  };

  const handleApplyResultAsInput = async () => {
    if (!state.restored) return;
    setIsLoading(true);
    setLoadingText("Đang cập nhật dữ liệu đầu vào...");
    try {
      const newBaseImage = state.restored;
      setState(prev => ({ ...prev, cropped: newBaseImage, restored: null, mask: null }));
      setSelectedTags([]); 
      analyzeImage(newBaseImage, []);
    } catch (e) {
      setError("Lỗi khi áp dụng kết quả.");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleReloadOriginal = () => {
    if (!state.original) return;
    setState(prev => ({
      ...prev,
      cropped: prev.original,
      restored: null,
      mask: null
    }));
    setSelectedTags([]);
    setError(null);
    if (state.original) analyzeImage(state.original, []);
  };

  const selectFromHistory = (item: HistoryItem) => {
    setState(prev => ({ ...prev, restored: item.image }));
    setSelectedTags(item.tags);
    setPositivePrompt(item.positivePrompt);
    setNegativePrompt(item.negativePrompt);
    setIsPromptDirty(false);
    setError(null);
  };

  const handleDownload = async () => {
    const imageSource = state.restored || state.cropped;
    if (!imageSource) return;
    const link = document.createElement('a');
    link.href = imageSource;
    const originalName = state.filename || 'image';
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    link.download = `${nameWithoutExt}_restored.png`;
    link.click();
  };

  const reset = () => {
    setState({ original: null, cropped: null, restored: null, mask: null, history: [], filename: 'image' });
    setPositivePrompt('');
    setNegativePrompt('');
    setIsPromptDirty(false);
    setSuggestedPrompts(null);
    setSelectedTags([]);
    setError(null);
    setStyleRefImage(null);
    setGender('unspecified');
    setAge('young_adult');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePromptChange = (type: 'positive' | 'negative', value: string) => {
    if (type === 'positive') setPositivePrompt(value);
    else setNegativePrompt(value);
    setIsPromptDirty(true);
  };

  const handleAnnotateConfirm = (maskData: string | null) => {
    setState(prev => ({ ...prev, mask: maskData }));
    setIsAnnotating(false);
    setIsPromptDirty(true);
  };

  const handleClearMask = (e: React.MouseEvent) => {
    e.stopPropagation();
    setState(prev => ({ ...prev, mask: null }));
    setIsPromptDirty(true);
  };

  const handlePresetClick = (promptValue: string) => {
    setPositivePrompt(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${promptValue}` : promptValue;
    });
    setIsPromptDirty(true);
  };

  const handleNegativePresetClick = (promptValue: string) => {
    setNegativePrompt(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${promptValue}` : promptValue;
    });
    setIsPromptDirty(true);
  };

  const renderAnalysisSection = () => (
    <div className="mb-5 relative">
      <div className="flex justify-between items-center mb-3 border-b border-[#0767B1]/20 pb-1">
        <h3 className="text-xs font-heading font-bold text-[#0767B1] flex items-center gap-2">
          <span className="text-[10px] opacity-50">[01]</span> Phân tích đặc điểm
        </h3>
        <span className="text-[9px] font-bold text-[#F16F24] border border-[#F16F24]/30 bg-[#F16F24]/5 px-1.5 py-0.5 rounded">Tự động</span>
      </div>
      
      {isSuggesting && (
         <div className="absolute inset-0 bg-[#030912]/80 z-20 flex items-center justify-center backdrop-blur-sm rounded-lg">
           <span className="text-[10px] text-[#11AF4B] font-bold animate-pulse">Đang phân tích ảnh...</span>
         </div>
      )}

      <div className="mb-3">
         <label className="text-[9px] font-bold text-[#0767B1]/60 mb-1 block">Giới tính</label>
         <div className="flex gap-2">
           {GENDER_OPTIONS.map((opt) => (
             <button key={opt.value} onClick={() => {setGender(opt.value); setIsPromptDirty(true);}} className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition-all duration-300 ${gender === opt.value ? 'bg-[#11AF4B] text-white border-[#11AF4B]' : 'bg-black/20 text-[#0767B1] border-[#0767B1]/20 hover:border-[#11AF4B]'}`}> {opt.label} </button>
           ))}
         </div>
      </div>
      <div className="mb-3">
        <label className="text-[9px] font-bold text-[#0767B1]/60 mb-1 block">Độ tuổi ước tính</label>
        <div className="grid grid-cols-2 gap-1.5">
          {AGE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => {setAge(opt.value); setIsPromptDirty(true);}} className={`py-1 px-2 rounded text-[9px] font-bold border transition-all duration-300 text-center ${age === opt.value ? 'bg-[#11AF4B]/20 text-[#11AF4B] border-[#11AF4B]' : 'bg-black/20 text-[#0767B1] border-[#0767B1]/20 hover:border-[#11AF4B]'}`}> {opt.label} </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTagGroup = (category: 'restore' | 'correction', title: string, step: number) => {
    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3 border-b border-[#0767B1]/20 pb-1">
          <h3 className="text-xs font-heading font-bold text-[#0767B1] flex items-center gap-2">
            <span className="text-[10px] opacity-50">[{step.toString().padStart(2, '0')}]</span> {title}
          </h3>
        </div>
        <div className="grid gap-2 grid-cols-2">
          {RESTORATION_TAGS.filter(t => t.category === category).map(tag => {
             const isSelected = selectedTags.includes(tag.label);
             return (
              <button key={tag.id} onClick={() => toggleTag(tag.label)} className={`px-3 py-2 rounded-lg text-[10px] transition-all duration-300 font-bold border-l-2 text-left tracking-tight leading-tight relative overflow-hidden ${isSelected ? 'bg-[#11AF4B]/10 border-[#11AF4B] text-[#11AF4B]' : 'bg-black/20 border-[#0767B1]/30 text-[#0767B1] hover:border-[#11AF4B]'}`}>
                {tag.label}
                {isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#11AF4B] rounded-full shadow-[0_0_5px_#11AF4B]"></div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#02060c] text-slate-300">
      <div className="flex-1 h-full flex flex-col relative overflow-hidden" ref={leftPanelRef} style={{ '--mouse-x': '50%', '--mouse-y': '50%' } as React.CSSProperties}>
        <div className="absolute inset-0 bg-[#02060c] pointer-events-none"></div>
        <div className="absolute w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(7,103,177,0.15)_0%,transparent_70%)] pointer-events-none rounded-full blur-3xl" style={{ top: 'calc(var(--mouse-y) - 400px)', left: 'calc(var(--mouse-x) - 400px)', transition: 'top 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(7,103,177,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(7,103,177,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
        <header className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto"> <h1 className="font-heading font-black text-xl md:text-2xl text-[#F16F24] tracking-wider filter drop-shadow-lg"> FPT Polytechnic - Hà Nội </h1> </div>
          <div className="flex gap-4 pointer-events-auto">
             {state.original && !isLoading && (
               <div className="flex gap-2">
                 <button onClick={handleReloadOriginal} title="Nạp lại ảnh gốc" className="p-4 bg-[#0767B1]/10 hover:bg-[#0767B1] text-[#0767B1] hover:text-white border border-[#0767B1]/20 rounded-xl transition-all duration-300 shadow-lg hover:scale-105">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                 </button>
                 <button onClick={reset} title="Xóa & Chọn Ảnh Mới" className="p-4 bg-[#F16F24]/10 hover:bg-[#F16F24] text-[#F16F24] hover:text-white border border-[#F16F24]/20 rounded-xl transition-all duration-300 group shadow-lg hover:scale-105"> 
                   <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> 
                 </button>
               </div>
             )}
             {state.original && !isLoading && ( <button onClick={handleDownload} className="px-8 py-4 bg-[#11AF4B] hover:bg-[#0e963f] text-white font-heading font-black rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(17,175,75,0.3)] flex items-center gap-3 hover:scale-105"> <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> <span>Xuất ảnh hoàn thiện</span> </button> )}
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4 pt-20 pb-[100px] relative z-10">
          {!state.original ? (
            <div 
              className={`max-w-lg w-full text-center group cursor-pointer p-8 rounded-3xl border-2 transition-all duration-300 ${isDragging ? 'border-[#11AF4B] bg-[#11AF4B]/10' : 'border-transparent hover:border-[#0767B1]/30 hover:bg-[#0767B1]/5'}`} 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="relative w-32 h-32 mx-auto mb-4 transition-transform duration-500 group-hover:scale-110">
                 <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isDragging ? 'bg-[#11AF4B] opacity-40' : 'bg-[#11AF4B]/10'}`}></div>
                 <div className={`absolute inset-2 border-2 border-dashed rounded-full animate-reverse-spin ${isDragging ? 'border-[#11AF4B]' : 'border-[#0767B1]/40'}`}></div>
                 <div className={`absolute inset-6 rounded-full flex items-center justify-center border transition-all ${isDragging ? 'bg-[#11AF4B]/20 border-[#11AF4B]' : 'bg-[#0767B1]/5 border-[#0767B1]/30'}`}> <svg className={`w-12 h-12 transition-colors ${isDragging ? 'text-[#11AF4B]' : 'text-[#11AF4B]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> </div>
              </div>
              <h2 className={`text-2xl font-heading font-black mb-3 tracking-widest uppercase transition-colors ${isDragging ? 'text-[#11AF4B]' : 'text-white group-hover:text-[#11AF4B]'}`}>
                {isDragging ? 'Thả ảnh vào đây' : 'Yêu cầu tải ảnh'}
              </h2>
              <p className="text-[#0767B1] font-bold uppercase tracking-[0.2em] text-xs">
                {isDragging ? 'Để tự động tải lên' : 'Kéo thả hoặc nhấp để chọn ảnh cũ'}
              </p>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            </div>
          ) : (
            <div className="w-auto h-auto max-w-[calc(100vw-440px-40px)] mx-auto relative border border-[#0767B1]/30 rounded-3xl p-1 bg-[#02060c]/40 backdrop-blur-md shadow-2xl overflow-hidden animate-in zoom-in duration-300 inline-flex flex-col">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#11AF4B] z-30"></div>
               <ComparisonSlider before={state.cropped!} after={state.restored} mask={state.mask} />
            </div>
          )}
          
          {/* FLOATING TOOLBAR - Bám dính bên phải nội dung (Right Side) */}
          {!isLoading && (state.restored || state.cropped || state.original) && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
              
              {/* NHÓM MASK & CLEAR MASK */}
              <div className="flex items-center gap-1">
                 {/* Nút Annotate/Mask */}
                 <button onClick={() => setIsAnnotating(true)} className={`w-12 h-12 flex items-center justify-center rounded-xl border border-[#0767B1]/30 transition-all shadow-xl hover:scale-110 group relative ${state.mask ? 'bg-[#11AF4B] text-white border-[#11AF4B]' : 'bg-[#0767B1]/80 hover:bg-[#0767B1] text-white'}`}>
                    {state.mask ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    )}
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1 bg-black/80 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                       {state.mask ? 'Đã chọn vùng' : 'Vẽ vùng chọn'}
                    </div>
                 </button>

                 {/* Nút Xóa Mask (Chỉ hiện khi có mask) */}
                 {state.mask && (
                    <button onClick={handleClearMask} className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl border border-red-500 transition-all shadow-xl hover:scale-110 group relative">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       <div className="absolute right-12 top-1/2 -translate-y-1/2 px-3 py-1 bg-black/80 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Xóa vùng chọn
                       </div>
                    </button>
                 )}
              </div>

              {/* NÚT CROP */}
              <button onClick={() => setIsCropping(true)} className="w-12 h-12 flex items-center justify-center bg-[#0767B1]/80 hover:bg-[#0767B1] text-white rounded-xl border border-[#0767B1]/30 transition-all shadow-xl hover:scale-110 group relative"> 
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" /></svg> 
                <div className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1 bg-black/80 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                   Cắt ảnh (Crop)
                </div>
              </button>

            </div>
          )}

        </main>
        {isLoading && (
          <div className="absolute bottom-10 left-0 right-0 z-[60] h-16 bg-[#02060c] border-t border-[#0767B1]/40 flex flex-col justify-center animate-in slide-in-from-bottom duration-300">
             <div className="relative flex justify-between items-end px-6 mb-2">
               <div className="flex flex-col"> <span className="text-[10px] text-[#0767B1] font-black uppercase mb-1">Trạng thái hệ thống</span> <span className="text-sm font-heading font-black text-[#11AF4B] tracking-wide animate-pulse">{loadingText}</span> </div>
               <div className="flex flex-col items-end"> <span className="text-[10px] text-[#0767B1] font-black uppercase mb-1">Tiến trình</span> <span className="text-2xl font-heading font-black text-white">{Math.round(progress)}%</span> </div>
             </div>
             <div className="relative w-full h-1.5 bg-[#0767B1]/20"> <div className="h-full bg-[#11AF4B] shadow-[0_0_15px_#11AF4B] transition-all duration-200" style={{ width: `${progress}%` }}></div> </div>
          </div>
        )}
        {state.history.length > 0 && !isLoading && (
          <div className="absolute bottom-10 left-0 right-0 h-24 bg-[#02060c]/90 border-t border-[#0767B1]/20 p-2 flex items-center gap-6 overflow-x-auto no-scrollbar z-50">
            <div className="flex gap-4 items-center pl-4">
              <div className="flex flex-col justify-center pr-6 border-r border-[#0767B1]/10 shrink-0 h-full"> <span className="text-[10px] font-heading font-black text-[#11AF4B] mb-1">Lịch sử</span> <span className="text-[12px] text-[#0767B1] font-black">SL: {state.history.length.toString().padStart(2, '0')}</span> </div>
              {state.history.map((item) => ( <button key={item.id} onClick={() => selectFromHistory(item)} className={`relative h-16 aspect-square rounded-lg overflow-hidden border transition-all shrink-0 ${state.restored === item.image ? 'border-[#11AF4B] scale-105 shadow-[0_0_15px_rgba(17,175,75,0.3)] z-10' : 'border-[#0767B1]/20 opacity-50 hover:opacity-100 hover:border-[#11AF4B]'}`}> <img src={item.image} className="w-full h-full object-cover" /> <div className="absolute inset-x-0 bottom-0 bg-[#11AF4B]/90 py-0.5 text-center"> <span className="text-[8px] font-black text-white uppercase leading-none block">{formatTime(item.timestamp)}</span> </div> </button> ))}
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#4c1d95] z-[100] flex items-center justify-between px-4 border-t border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"> <span className="text-white/80 font-bold text-[10px] font-heading">© 2026. Bản quyền thuộc về FPT Polytechnic</span> <span className="text-white/80 font-bold text-[10px] font-heading">Bộ môn Thiết kế đồ họa | Đỗ Trung Kiên - kiendt37 | 090 222 2612</span> </div>
      </div>
      <aside className="w-[440px] h-full bg-[#030912] border-l border-[#0767B1]/20 flex flex-col relative z-40 pt-4 pb-4">
        <div className="p-5 border-b border-[#0767B1]/10 bg-black/20 flex flex-col"> <h2 className="text-sm font-heading font-black text-[#11AF4B] flex items-center gap-3"> <div className="w-2 h-2 bg-[#11AF4B] rounded-full animate-pulse shadow-[0_0_8px_#11AF4B]"></div> Hệ thống điều khiển AI </h2> </div>
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar space-y-6">
          {/* PHẦN 1: PHÂN TÍCH ĐẶC ĐIỂM (Tự động + User Edit) */}
          {renderAnalysisSection()}
          
          {/* PHẦN 2: PHỤC HỒI CHI TIẾT VẬT LÝ */}
          {renderTagGroup('restore', 'Phục hồi chi tiết vật lý', 2)}
          
          {/* PHẦN 3: PHỤC HỒI MÀU SẮC */}
          {renderTagGroup('correction', 'Phục hồi màu sắc & nâng cao', 3)}
          
          {/* PHẦN 4: TỰ VIẾT PROMPT (ƯU TIÊN CAO NHẤT) */}
          <section>
             <div className="flex justify-between items-center mb-3 border-b border-[#0767B1]/20 pb-1"> 
               <div className="flex items-center gap-2"> 
                 <span className="text-[11px] font-heading text-[#0767B1] opacity-50">[04]</span> 
                 <h3 className="text-xs font-heading font-bold text-[#0767B1]">Tùy chỉnh nâng cao</h3> 
               </div> 
               <span className="text-[8px] font-bold text-[#11AF4B] border border-[#11AF4B]/30 bg-[#11AF4B]/5 px-1.5 py-0.5 rounded animate-pulse">Ưu tiên cao nhất</span>
             </div>
             
             <div className="space-y-4">
                 {/* STYLE REFERENCE UPLOAD */}
                 <div className="bg-[#0767B1]/5 border border-[#0767B1]/20 rounded-xl p-3">
                    <label className="text-[10px] text-[#F16F24] font-bold mb-2 block uppercase tracking-wide flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       Upload ảnh tham chiếu phong cách
                    </label>
                    {!styleRefImage ? (
                      <div 
                        className="border-2 border-dashed border-[#0767B1]/30 rounded-lg p-4 text-center cursor-pointer hover:bg-[#0767B1]/10 hover:border-[#11AF4B] transition-all group relative"
                        onClick={() => styleInputRef.current?.click()}
                      >
                         <input type="file" ref={styleInputRef} className="hidden" accept="image/*" onChange={handleStyleRefUpload} />
                         {isAnalyzingStyle ? (
                           <span className="text-[10px] text-[#11AF4B] font-bold animate-pulse">Đang phân tích AI...</span>
                         ) : (
                           <>
                             <p className="text-[9px] text-[#0767B1]/70 group-hover:text-[#11AF4B] font-bold mb-1">Nhấn để tải ảnh mẫu</p>
                             <p className="text-[8px] text-[#0767B1]/40">Hệ thống sẽ copy màu sắc & ánh sáng</p>
                           </>
                         )}
                      </div>
                    ) : (
                       <div className="relative rounded-lg overflow-hidden border border-[#11AF4B] group">
                          <img src={styleRefImage} className="w-full h-24 object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Reference Style" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-[10px] text-white font-bold bg-[#11AF4B] px-2 py-1 rounded">Đã áp dụng</span>
                             <button onClick={removeStyleRef} className="bg-red-500 text-white p-1 rounded hover:bg-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                          {isAnalyzingStyle && (
                             <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                <span className="text-[10px] text-[#11AF4B] font-bold animate-pulse">Đang phân tích AI...</span>
                             </div>
                          )}
                       </div>
                    )}
                 </div>

                 <div className="relative"> 
                   <label className="text-[10px] text-[#11AF4B] font-bold mb-2 block">Positive Prompt (Mô tả chi tiết mong muốn)</label>
                   {/* POSITIVE PRESETS LIST */}
                   <div className="flex flex-wrap gap-2 mb-2">
                      {ADVANCED_PRESETS.map((preset, index) => (
                        <button 
                          key={index}
                          onClick={() => handlePresetClick(preset.value)}
                          className="px-2 py-1.5 rounded border border-[#0767B1]/30 bg-[#0767B1]/10 text-[#0767B1] text-[9px] font-bold hover:bg-[#11AF4B] hover:text-white hover:border-[#11AF4B] transition-all"
                          title={preset.value.substring(0, 100) + '...'}
                        >
                          {preset.label}
                        </button>
                      ))}
                   </div>
                   <textarea value={positivePrompt} onChange={(e) => handlePromptChange('positive', e.target.value)} placeholder="Nhập mô tả chi tiết để ghi đè các cài đặt trên..." className="w-full h-48 p-3 bg-black/40 border border-[#11AF4B]/30 rounded-xl focus:border-[#11AF4B] outline-none resize-none text-[11px] text-[#11AF4B] font-medium" /> 
                 </div>

                 <div className="relative"> 
                   <label className="text-[10px] text-red-400 font-bold mb-2 block">Negative Prompt (Loại bỏ chi tiết thừa)</label> 
                   {/* NEGATIVE PRESETS LIST */}
                   <div className="flex flex-wrap gap-2 mb-2">
                      {NEGATIVE_PRESETS.map((preset, index) => (
                        <button 
                          key={index}
                          onClick={() => handleNegativePresetClick(preset.value)}
                          className="px-2 py-1.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-[9px] font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                          title={preset.value.substring(0, 100) + '...'}
                        >
                          {preset.label}
                        </button>
                      ))}
                   </div>
                   <textarea value={negativePrompt} onChange={(e) => handlePromptChange('negative', e.target.value)} placeholder="Những gì bạn KHÔNG muốn xuất hiện..." className="w-full h-40 p-3 bg-black/40 border border-red-500/30 rounded-xl focus:border-red-500 outline-none resize-none text-[11px] text-red-400 font-medium" /> 
                 </div>
             </div>
          </section>



          {error && <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-[11px] font-bold animate-pulse">{error}</div>}
        </div>
        <div className="bg-[#02060c] border-t border-[#0767B1]/20 flex flex-col">
          <div className="p-4 space-y-3">
            {state.restored && !isLoading && ( <button onClick={handleApplyResultAsInput} className="w-full py-3 rounded-xl text-xs font-heading font-black border-2 border-[#F16F24] text-[#F16F24] bg-[#F16F24]/10 hover:bg-[#F16F24] hover:text-white transition-all flex items-center justify-center gap-2"> <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Sử dụng kết quả để tiếp tục </button> )}
            <button 
                onClick={handleRestore} 
                disabled={isLoading || !state.original} 
                className={`w-full py-3 rounded-xl text-sm font-heading font-black border-2 transition-all relative overflow-hidden ${isLoading || !state.original ? 'bg-[#0767B1]/10 text-[#0767B1]/50' : isPromptDirty ? 'bg-white text-[#11AF4B] border-[#11AF4B] animate-pulse shadow-[0_0_15px_rgba(17,175,75,0.5)]' : 'bg-[#11AF4B] border-[#11AF4B] text-white hover:bg-white hover:text-[#11AF4B]'}`}
            > 
                {isLoading ? "Đang xử lý..." : isPromptDirty ? "Áp dụng & Phục chế" : (state.restored ? "Phục chế lại" : "Bắt đầu phục chế")} 
            </button>
          </div>

        </div>
      </aside>
      
      {/* CROPPER */}
      {isCropping && (state.restored || state.cropped || state.original) && ( 
        <Cropper 
          image={state.restored || state.cropped || state.original || ''} 
          onCropComplete={(cropped) => { setState(prev => ({ ...prev, cropped, restored: null, mask: null })); setIsCropping(false); analyzeImage(cropped, selectedTags); }} 
          onCancel={() => setIsCropping(false)} 
        /> 
      )}
      
      {/* ANNOTATOR */}
      {isAnnotating && (state.cropped || state.original) && (
        <Annotator
          image={state.cropped || state.original || ''}
          onConfirm={handleAnnotateConfirm}
          onCancel={() => setIsAnnotating(false)}
        />
      )}

      <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @keyframes reverse-spin { from { transform: rotate(360deg); } to { transform: rotate(0deg); } } .animate-reverse-spin { animation: reverse-spin 10s linear infinite; } `}</style>
    </div>
  );
};

export default App;
