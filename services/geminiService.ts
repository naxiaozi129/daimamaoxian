import { GoogleGenAI } from "@google/genai";
import { CommandType, LevelConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiHint = async (level: LevelConfig, currentCommands: CommandType[], errorMsg: string | null): Promise<string> => {
  try {
    const model = "gemini-2.5-flash";
    
    const prompt = `
      你是一个名为 "代码探险 (CodeQuest)" 的游戏的友好编程导师。
      用户卡在了第 ${level.id} 关: "${level.name}"。
      
      关卡布局:
      - 网格大小: ${level.gridSize}x${level.gridSize}
      - 起点: (${level.startPos.x}, ${level.startPos.y}) 面向 ${level.startDir}
      - 终点: (${level.goalPos.x}, ${level.goalPos.y})
      - 障碍物位置: ${JSON.stringify(level.obstacles)}
      
      用户当前代码 (指令序列):
      ${currentCommands.length > 0 ? currentCommands.join(', ') : "(空)"}
      
      最后一次错误 (如果有): ${errorMsg || "无"}
      
      任务: 提供一个有帮助、鼓励性的提示。请用中文回答。不要直接给出确切的答案。
      专注于逻辑。如果代码为空，建议第一步。
      保持简短（2句话以内）。
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "继续尝试！检查你的逻辑。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 连接暂时离线，但我相信你可以做到的！";
  }
};

export const getStoryBriefing = async (level: LevelConfig): Promise<string> => {
  try {
     const model = "gemini-2.5-flash";
     const prompt = `
        为机器人任务写一段非常简短的科幻任务简报（1句话）。
        上下文：关卡名称是 "${level.name}"。
        请用中文回答。
        不要提及网格坐标。只关注剧情氛围。
     `;
     
     const response = await ai.models.generateContent({
        model,
        contents: prompt
     });
     return response.text || "任务就绪。系统在线。";
  } catch (e) {
    return "任务就绪。系统在线。";
  }
}