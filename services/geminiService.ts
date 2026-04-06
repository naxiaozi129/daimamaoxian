import { GoogleGenAI } from "@google/genai";
import { CommandType, LevelConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const levelRulesText = (level: LevelConfig) =>
  [
    level.requireLoop ? '必须使用 repeat(3) 或 repeat(5)' : null,
    level.requireIf ? '必须使用 if(isPathBlocked())' : null,
    level.maxForwardMoves != null ? `前进(move)最多 ${level.maxForwardMoves} 次` : null,
    level.maxCommandsOverride != null ? `指令条数最多 ${level.maxCommandsOverride}` : null,
  ]
    .filter(Boolean)
    .join('；') || '无';

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
      - 关卡额外规则: ${levelRulesText(level)}
      
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

/** 点击「参考最优步数」旁的资讯图标时：给出贴近最优解的思路提示（不输出完整可复制代码） */
export const getOptimalSolutionHint = async (level: LevelConfig): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      你是游戏「代码探险」的导师。玩家正在第 ${level.id} 关「${level.name}」，希望获得**贴近最优解**的提示。

      关卡布局:
      - 网格: ${level.gridSize}x${level.gridSize}
      - 起点: (${level.startPos.x}, ${level.startPos.y}) 面向 ${level.startDir}
      - 终点: (${level.goalPos.x}, ${level.goalPos.y})
      - 障碍物: ${JSON.stringify(level.obstacles)}
      - 关卡约束: ${levelRulesText(level)}

      设计参考：本关在题解说明中的「参考最优步数」约为 ${level.optimalSteps}（表示较优解法的规模感，帮助玩家判断自己是否绕远）。

      任务: 用中文写 2～4 句话，给出**朝最优解靠拢**的思路（路线分段、何时转向、是否用 repeat / if 压缩逻辑等）。
      禁止输出完整可运行的程序或逐条可照抄的指令序列；不要列出每一步坐标。
      语气简洁、可执行。
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || `本关参考最优规模约 ${level.optimalSteps}，试着减少无效转向与折返，必要时用循环或条件合并重复模式。`;
  } catch (error) {
    console.error('Gemini optimal hint error:', error);
    return `本关参考最优步数约 ${level.optimalSteps}。可先画出最短可行路径，再考虑用 repeat / if 满足关卡约束并压缩指令条数。`;
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