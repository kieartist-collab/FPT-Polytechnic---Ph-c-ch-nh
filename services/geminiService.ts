
import { GoogleGenAI } from "@google/genai";
import { Gender, AgeRange, RESTORATION_TAGS } from "../types";

// Hàm dọn dẹp và chuẩn hóa API Key để tránh lỗi Header ISO-8859-1 (loại bỏ dính dấu cách, dấu nháy, ký tự ẩn hoặc Tiếng Việt)
const cleanApiKey = (key?: string): string => {
  if (!key) return '';
  let trimmed = key.trim();
  
  // Loại bỏ dấu nháy đơn/kép bọc ngoài không dùng Regex
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1);
  } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    trimmed = trimmed.slice(1, -1);
  }
  
  trimmed = trimmed.trim();
  
  // Lọc lấy các ký tự hợp lệ cho Google Gemini API Key (chữ, số, gạch dưới, gạch ngang và dấu chấm .)
  // Hoàn toàn không dùng Regex để ngăn ngừa lỗi biên dịch của Babel/Vite
  const validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.";
  let result = "";
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (validChars.indexOf(char) !== -1) {
      result += char;
    }
  }
  return result;
};

// Hàm khởi tạo AI nhận key động
const getAI = (apiKey?: string) => {
  const defaultEnvKey = (
    import.meta.env?.VITE_GEMINI_API_KEY || 
    (typeof process !== "undefined" ? process.env?.API_KEY : "") || 
    ""
  ).trim();
  const sanitizedKey = cleanApiKey(apiKey) || cleanApiKey(defaultEnvKey);
  return new GoogleGenAI({ apiKey: sanitizedKey });
};

// Hàm mới: Phân tích phong cách nghệ thuật từ ảnh tham chiếu (Style Reference)
export const analyzeStyleReference = async (
  base64Image: string,
  customApiKey?: string
): Promise<{ positive: string; negative: string }> => {
  try {
    const ai = getAI(customApiKey);
    const imageData = base64Image.split(',')[1];
    
    const prompt = `You are an expert Art Director and Colorist. 
    
    YOUR TASK: Analyze the visual style of the provided reference image to apply it to another photo.
    Focus ONLY on: Color Grading, Lighting, Film Grain/Texture, Photography Style (e.g., Vintage, Polaroid, Cinematic, Black & White, Sepia), and artistic vibe.
    
    DO NOT describe the subject content (like 'man', 'dog', 'tree'). Describe the STYLE.

    REQUIRED OUTPUT FORMAT (JSON ONLY):
    {
      "positive": "[Keywords for lighting, color palette, texture, film stock, era, camera properties]",
      "negative": "[Keywords describing the opposite style to avoid]"
    }
    
    Example:
    If image is old sepia: 
    positive: "sepia tone, vintage paper texture, scratched film, high contrast, warm lighting, 1920s photography style"
    negative: "digital color, cold tones, 4k sharp, modern photography, neon lights"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { inlineData: { data: imageData, mimeType: 'image/png' } },
          { text: prompt },
        ],
      },
    });
    
    let text = response.text;
    
    if (text) {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          const jsonString = text.slice(firstBrace, lastBrace + 1);
          const json = JSON.parse(jsonString);
          return {
            positive: json.positive || "",
            negative: json.negative || ""
          };
        } catch (e) {
          console.warn("JSON parse failed for style analysis", e);
        }
      }
    }
    
    return { positive: "", negative: "" };

  } catch (e) {
    console.error("Style analysis error:", e);
    return { positive: "", negative: "" };
  }
};

// Hàm mới: Phân tích ảnh và gợi ý prompt + Identity
export const analyzeAndSuggestPrompts = async (
  base64Image: string,
  currentTags: string[],
  customApiKey?: string
): Promise<{ positive: string; negative: string; gender: Gender; age: AgeRange }> => {
  try {
    const ai = getAI(customApiKey);
    const imageData = base64Image.split(',')[1];
    
    // Prompt được cập nhật để yêu cầu JSON chứa cả gender và age
    const prompt = `You are an expert AI in Computer Vision.
    
    YOUR TASK: Analyze the uploaded image to identify the subject's demographics and write restoration prompts.

    REQUIRED OUTPUT FORMAT (JSON ONLY):
    {
      "gender": "male" | "female" | "unspecified",
      "age": "baby" | "child" | "teen" | "young_adult" | "adult" | "middle_aged" | "senior" | "elderly",
      "positive": "[Detailed Visual Description], [Restoration Keywords]",
      "negative": "[Unwanted Artifacts]"
    }

    GUIDELINES:
    1. ESTIMATE IDENTITY:
       - Look closely at facial features to determine 'gender' and 'age'. 
       - If unclear or multiple people, use "unspecified" and "adult".
    
    2. POSITIVE PROMPT:
       - Describe the subject, clothing, and background.
       - Focus on hyper-realistic textures and sharp details.
    
    3. NEGATIVE PROMPT:
       - List specific damages visible in the image (scratches, blur, noise) to be removed.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { inlineData: { data: imageData, mimeType: 'image/png' } },
          { text: prompt },
        ],
      },
    });
    
    let text = response.text;
    
    // Giá trị mặc định
    const defaultResult = { 
      positive: "", 
      negative: "", 
      gender: "unspecified" as Gender, 
      age: "young_adult" as AgeRange 
    };

    if (text) {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          const jsonString = text.slice(firstBrace, lastBrace + 1);
          const json = JSON.parse(jsonString);
          return {
            positive: json.positive || "",
            negative: json.negative || "",
            // Validate dữ liệu trả về để đảm bảo đúng kiểu
            gender: (['male', 'female', 'unspecified'].includes(json.gender) ? json.gender : 'unspecified') as Gender,
            age: (['baby', 'child', 'teen', 'young_adult', 'adult', 'middle_aged', 'senior', 'elderly'].includes(json.age) ? json.age : 'young_adult') as AgeRange,
          };
        } catch (e) {
          console.warn("JSON parse failed", e);
        }
      }
    }
    
    return defaultResult;

  } catch (e) {
    console.error("Suggestion error:", e);
    return { 
      positive: "Could not analyze image. Please check API Key or Internet connection.", 
      negative: "",
      gender: "unspecified",
      age: "young_adult"
    };
  }
}

export const restoreImage = async (
  base64Image: string,
  positivePrompt: string,
  negativePrompt: string,
  selectedTagLabels: string[],
  identity?: {
    gender: Gender;
    age: AgeRange;
  },
  customApiKey?: string,
  maskImage?: string | null // Tham số mới cho ảnh mask
): Promise<string | null> => {
  try {
    const ai = getAI(customApiKey);
    
    const restorePrompts = RESTORATION_TAGS
      .filter(t => selectedTagLabels.includes(t.label))
      .map(t => `- ${t.prompt}`);

    let identityPrompt = "";
    if (identity) {
      const genderText = identity.gender === 'male' ? 'Male' : identity.gender === 'female' ? 'Female' : 'Person';
      const ageText = identity.age.replace('_', ' '); 
      identityPrompt = `- SUBJECT IDENTITY: A ${ageText.toUpperCase()} ${genderText.toUpperCase()}.`;
    }

    let maskInstruction = "";
    if (maskImage) {
      maskInstruction = `[MASK INSTRUCTION - CRITICAL]: 
      - A mask image has been provided as the second input image (black background with white brush strokes). 
      - You MUST strictly limit your restoration/modifications to the WHITE AREAS of the mask.
      - The BLACK AREAS of the mask must remain EXACTLY as they are in the original image.
      - Apply the User Custom Directive ONLY within the masked regions.`;
    }

    // TỔ CHỨC LẠI: ĐƯA USER INPUT LÊN ĐẦU VÀ GÁN TRỌNG SỐ CAO NHẤT
    const fullPrompt = `STRICT INSTRUCTION: YOU MUST PRIORITIZE THE "USER CUSTOM DIRECTIVE" ABOVE ALL OTHER STEPS. 

${maskInstruction}

[1. USER CUSTOM DIRECTIVE - HIGHEST PRIORITY]:
${positivePrompt ? `USER REQUIREMENT: ${positivePrompt}` : "No specific custom instruction, follow restoration pipeline."}

[2. IDENTITY CONTEXT (Auto-Detected/User Selected)]:
${identityPrompt}

[3. RESTORATION & CORRECTION PIPELINE]:
${restorePrompts.length > 0 ? restorePrompts.join('\n') : '- General photo enhancement and balancing.'}

[NEGATIVE CONSTRAINTS]:
- DO NOT INCLUDE: blur, distortion, artifacts, lowres, watermark, text, deformed features, ${negativePrompt}

FINAL REQUIREMENT: Generate an 8k resolution, photorealistic result. If User Custom Directive is present, it overrides conflicting automated settings.
`;

    const imageData = base64Image.split(',')[1];
    
    const parts: any[] = [
       { inlineData: { data: imageData, mimeType: 'image/png' } }
    ];

    if (maskImage) {
       const maskData = maskImage.split(',')[1];
       parts.push({ inlineData: { data: maskData, mimeType: 'image/png' } });
    }

    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Model này hỗ trợ đa phương thức tốt
      contents: {
        parts: parts,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error restoring image:", error);
    throw error;
  }
};
