
export interface HistoryItem {
  id: string;
  image: string;
  timestamp: number;
  tags: string[];
  positivePrompt: string;
  negativePrompt: string;
}

export interface ImageState {
  original: string | null;
  cropped: string | null;
  restored: string | null;
  mask: string | null; // New field for the painted mask
  history: HistoryItem[];
  filename?: string; 
}

export interface AspectRatio {
  label: string;
  value: number;
}

export interface Tag {
  id: string;
  label: string;
  prompt: string;
  category: 'restore' | 'correction' | 'style';
  thumbnail?: string;
}

export type Gender = 'male' | 'female' | 'unspecified';
export type AgeRange = 'baby' | 'child' | 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'senior' | 'elderly';

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'unspecified', label: 'Không rõ' },
];

export const AGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: 'baby', label: '0-2 tuổi' },
  { value: 'child', label: '3-10 tuổi' },
  { value: 'teen', label: '11-18 tuổi' },
  { value: 'young_adult', label: '19-30 tuổi' },
  { value: 'adult', label: '31-50 tuổi' },
  { value: 'middle_aged', label: '51-70 tuổi' },
  { value: 'senior', label: '70-85 tuổi' },
  { value: 'elderly', label: '> 85 tuổi' },
];

export const ASPECT_RATIOS: AspectRatio[] = [
  { label: '3:4', value: 3/4 },
  { label: '4:3', value: 4/3 },
  { label: '16:9', value: 16/9 },
  { label: '9:16', value: 9/16 },
  { label: '2:3', value: 2/3 },
  { label: '3:2', value: 3/2 },
  { label: 'Gốc', value: 0 },
];

export const RESTORATION_TAGS: Tag[] = [
  // PHẦN 1: PHỤC HỒI CHI TIẾT VẬT LÝ (8 Chức năng mới)
  { id: 'restore_face_details', label: 'Chi tiết khuôn mặt', prompt: 'Restore fine facial details such as skin texture, pores, wrinkles, and subtle transitions in skin tone. Maintain natural aging signs while enhancing clarity.', category: 'restore' },
  { id: 'restore_eyes', label: 'Mắt và lông mày', prompt: 'Enhance the clarity of eyes, eyelashes, and eyebrows, including the iris texture and the natural shine of the eye, ensuring a realistic look without over-sharpening.', category: 'restore' },
  { id: 'restore_hair', label: 'Tóc và viền tóc', prompt: 'Refine the details of hair texture, hairline, and fine strands, bringing back natural light reflections and subtle curls or straightness without over-exaggerating.', category: 'restore' },
  { id: 'restore_lips', label: 'Môi và vân môi', prompt: 'Restore the fine details of lips, including natural lines and slight variations in tone, avoiding over-smoothing or distorting the shape of the lips.', category: 'restore' },
  { id: 'restore_clothing', label: 'Trang phục và vải', prompt: 'Recover small fabric details, such as texture, stitching, patterns, and subtle folds, while preserving the original fabric’s characteristics without altering colors.', category: 'restore' },
  { id: 'restore_accessories', label: 'Trang sức và phụ kiện', prompt: 'Enhance small details in jewelry and accessories, like engravings and reflections, ensuring the restored items look realistic without creating artificial shine.', category: 'restore' },
  { id: 'restore_bg_local', label: 'Chi tiết nền cục bộ', prompt: 'Restore small background details that were lost or blurred, such as fine textures on walls, curtains, or trees, without altering the overall composition or focus.', category: 'restore' },
  { id: 'restore_text_symbols', label: 'Chữ viết và ký hiệu', prompt: 'Recover small handwritten text, logos, or symbols in old photographs, enhancing clarity and legibility without changing the surrounding image or colors.', category: 'restore' },

  // PHẦN 2: PHỤC HỒI MÀU SẮC & NÂNG CAO (Đã rút gọn label)
  
  // Nhóm 1: Sửa lỗi (Fixes)
  { id: 'remove_blemishes', label: 'Xóa xước và vết bẩn', prompt: 'Remove unwanted watermarks, scratches, or any blemishes from old images. Seamlessly reconstruct the affected areas, ensuring that textures and background elements blend naturally with the surrounding parts.', category: 'correction' },
  { id: 'denoise', label: 'Giảm nhiễu hạt', prompt: 'Reduce noise in old images while preserving fine details and textures. Smooth out graininess without sacrificing the overall quality or clarity of key elements like faces and objects.', category: 'correction' },
  { id: 'sharpen_blur', label: 'Làm nét ảnh mờ', prompt: 'Sharpen blurry photos by focusing on key details such as edges and textures, enhancing clarity without introducing noise or artifacts. Pay close attention to subtle features like hair, eyes, and fabric details.', category: 'correction' },
  { id: 'reconstruct_missing', label: 'Tái tạo phần thiếu', prompt: 'Reconstruct missing or damaged portions of the image by intelligently guessing what the lost sections might have looked like, based on the surrounding context, ensuring the restored areas match the original composition.', category: 'correction' },

  // Nhóm 2: Màu sắc (Color)
  { id: 'auto_color', label: 'Tự động lên màu', prompt: 'Automatically colorize black-and-white images by predicting the most realistic color palette based on the content. Ensure consistency and vibrancy in each region of the image, keeping it as natural as possible.', category: 'correction' },
  { id: 'restore_faded', label: 'Khôi phục màu phai', prompt: 'Restore faded or washed-out colors to match the original vibrancy. Focus on enhancing both bright and muted areas, ensuring the restored color palette is balanced and authentic.', category: 'correction' },
  { id: 'contrast_brightness', label: 'Cân bằng sáng tối', prompt: 'Adjust the brightness and contrast of old images to bring out hidden details, ensuring that the lighting feels true to the original, while maintaining natural shadows and highlights.', category: 'correction' },
  { id: 'lighting_shadows', label: 'Xử lý bóng đổ', prompt: 'Fine-tune the lighting and shadows in old photos to restore depth and dimensionality. Enhance the play of light and dark areas without overexposing or underexposing any part of the image.', category: 'correction' },

  // Nhóm 3: Chi tiết nâng cao (Advanced Detail)
  { id: 'skin_detail', label: 'Làm mịn da mặt', prompt: 'Enhance and restore the natural skin tones in portrait photographs, correcting any color imbalances, and ensuring that facial features appear smooth yet detailed without looking artificial.', category: 'correction' },
  { id: 'face_detail_adv', label: 'Chi tiết mặt nâng cao', prompt: 'Restore the intricate details of faces in old portraits, focusing on delicate elements like eyes, eyebrows, lips, and skin texture. Ensure that each feature is enhanced without distorting the natural expression.', category: 'correction' },
  { id: 'clothing_texture', label: 'Chất liệu quần áo', prompt: 'Revive the original colors and textures of clothing in photographs, restoring the vibrancy of fabrics and patterns, while ensuring the restored details look realistic and match the context.', category: 'correction' },
  { id: 'recover_lost_details', label: 'Khôi phục chi tiết mất', prompt: 'Recover fine details that were lost due to damage or deterioration, like intricate textures in clothing, small objects, or delicate features in the background. Ensure these elements blend seamlessly with the restored areas.', category: 'correction' },

  // Nhóm 4: Môi trường & Xử lý đặc biệt (Environment & Special Fixes)
  { id: 'remove_stains', label: 'Khử ố vàng và mốc', prompt: 'Analyze and remove localized discoloration, yellowing, water stains, or mold spots common in aged paper photos. Correct color casts caused by chemical aging while preserving the original intent and vintage paper texture.', category: 'correction' },
  { id: 'bg_restore', label: 'Làm rõ nền ảnh', prompt: 'Restore the background of old images, bringing back subtle textures and colors while maintaining harmony with the main subject. Ensure that the background complements the overall look without clashing.', category: 'correction' },
  { id: 'dehaze_clarity', label: 'Làm trong và khử mù', prompt: 'Remove the hazy, milky, or foggy layer often found in old vintage photos. Enhance global contrast and micro-contrast to reveal hidden details in the mid-tones and shadows, making the image look crisp, transparent, and deep.', category: 'correction' },
  { id: 'high_res_upscale', label: 'Nâng cấp độ phân giải', prompt: 'Upscale old photos to a higher resolution, maintaining the clarity and fine details. Use advanced algorithms to preserve image sharpness, texture, and clarity while reducing pixelation, ensuring the photo looks modern and crisp.', category: 'correction' },
];
