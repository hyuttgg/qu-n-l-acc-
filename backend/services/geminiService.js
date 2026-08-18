const { GoogleGenAI } = require('@google/genai');
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');

// System Prompts for Specialized Presets
const PRESET_SYSTEM_PROMPTS = {
  general: `Bạn là OceanForge AI Assistant — Trợ lý AI thông minh, chuyên nghiệp và thân thiện của nền tảng quản lý tài khoản OceanForge.
Hãy trả lời câu hỏi của người dùng một cách chính xác, ngắn gọn và hữu ích bằng Tiếng Việt. Sử dụng định dạng Markdown khi thích hợp.`,

  coding: `Bạn là Senior AI Software Architect của OceanForge.
Bạn chuyên sâu về Node.js, Express, React, TypeScript, Python, MongoDB và Kiến trúc Web hiện đại.
Khi được hỏi về lập trình:
1. Cung cấp mã nguồn sạch (Clean Code), tối ưu hiệu năng và an toàn bảo mật.
2. Đặt code trong khối fenced code block (\`\`\`language ... \`\`\`).
3. Đưa ra giải thích chi tiết, từng bước dễ hiểu.`,

  roblox: `Bạn là Chuyên gia Roblox Luau Scripting và Game Automation của OceanForge.
Bạn chuyên viết script Roblox Studio và Blox Fruits:
- Roblox Luau Scripts (Auto Farm, Fruit Sniper, Quest Automator, Teleportation).
- UI Libraries (Rayfield, Orion, Kavo UI, Custom Glassmorphic UI).
- DataStore Service, RemoteEvents, RemoteFunctions và Server-Client Architecture.
Hãy viết mã Luau chuẩn xác, kèm chú thích tiếng Việt dễ hiểu.`,

  oceanforge: `Bạn là Trợ lý Phân tích Dữ liệu Hệ thống OceanForge.
Bạn có quyền truy cập thông tin kho tài khoản, trạng thái máy chủ và thống kê dữ liệu.
Hãy trả lời câu hỏi của người dùng dựa trên dữ liệu hệ thống thời gian thực được cung cấp dưới đây.`,
};

/**
 * Fetch live DB metrics for OceanForge System Context Injection
 */
async function fetchSystemContext(userId) {
  try {
    if (!global.dbConnected) {
      return `\n[Dữ liệu hệ thống Demo]: Đang có 12 tài khoản trong danh sách, 4 tài khoản đang Live Farm, 28 Trái Ác Quỷ trong kho.`;
    }

    const filter = userId ? { user: userId } : {};
    const totalAccounts = await Account.countDocuments(filter);
    const onlineAccounts = await Account.countDocuments({ ...filter, status: 'online' });
    const farmingAccounts = await Account.countDocuments({ ...filter, status: 'farming' });
    const totalInventory = await Inventory.countDocuments(filter);

    // Get top 5 highest level accounts
    const topAccounts = await Account.find(filter)
      .sort({ level: -1 })
      .limit(5)
      .select('username level belly gems status');

    const topAccList = topAccounts.map(a => `- ${a.username}: Cấp ${a.level || 1} | Beli: ${a.belly || 0} | Trạng thái: ${a.status}`).join('\n');

    return `
[DỮ LIỆU HỆ THỐNG OCEANFORGE THỜI GIAN THỰC]:
- Tổng số tài khoản quản lý: ${totalAccounts}
- Số tài khoản đang Online: ${onlineAccounts}
- Số tài khoản đang Auto Farm: ${farmingAccounts}
- Tổng số vật phẩm/Trái trong kho: ${totalInventory}
- Danh sách tài khoản cấp cao nhất:
${topAccList || '- Chưa có tài khoản'}
`;
  } catch (err) {
    console.error('System context fetch error:', err.message);
    return '\n[Dữ liệu hệ thống]: Không thể lấy thống kê thời gian thực.';
  }
}

/**
 * Generate AI Chat Response using Google GenAI Interactions API (gemini-3.5-flash)
 */
async function generateChatResponse({ preset = 'general', messages = [], userPrompt, userId, modelName = 'gemini-3.5-flash' }) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    throw new Error('Chưa cấu hình GEMINI_API_KEY hợp lệ trên Server Backend.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Select system prompt
  let systemInstruction = PRESET_SYSTEM_PROMPTS[preset] || PRESET_SYSTEM_PROMPTS.general;
  if (preset === 'oceanforge') {
    const liveContext = await fetchSystemContext(userId);
    systemInstruction += '\n' + liveContext;
  }

  // Format conversation history for context continuation
  let fullInput = '';
  if (messages && messages.length > 0) {
    const historyText = messages.slice(-10).map(m => (m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`)).join('\n');
    fullInput = `[LỊCH SỬ HỘI THOẠI TRƯỚC]:\n${historyText}\n\nUser: ${userPrompt}`;
  } else {
    fullInput = userPrompt;
  }

  const targetModels = [modelName, 'gemini-3.5-flash', 'gemini-2.5-flash'];
  let lastError = null;

  for (const targetModel of targetModels) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const interaction = await ai.interactions.create({
          model: targetModel,
          input: fullInput,
          system_instruction: systemInstruction,
        });

        const outputText = interaction.output_text || (interaction.outputs && interaction.outputs[0]?.text) || '';
        if (outputText) {
          return {
            text: outputText,
            modelUsed: targetModel,
            usage: {
              inputTokens: interaction.usage?.input_tokens || 0,
              outputTokens: interaction.usage?.output_tokens || 0,
            },
          };
        }
      } catch (err) {
        lastError = err;
        const isRateLimitOr5xx = err.status === 429 || (err.status >= 500 && err.status < 600) || (err.message && err.message.includes('429'));
        if (isRateLimitOr5xx && attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        break; // Try fallback model
      }
    }
  }

  throw new Error(`Google Gemini API error: ${lastError ? lastError.message : 'Unknown error'}`);
}

module.exports = {
  generateChatResponse,
  PRESET_SYSTEM_PROMPTS,
};
