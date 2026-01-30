import { GoogleGenAI, Type } from "@google/genai";
import { Vendor, AuditIssue } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_FAST = 'gemini-3-flash-preview';
const MODEL_SMART = 'gemini-3-pro-preview';

/**
 * Analyzes a switch configuration file for security risks and best practices.
 */
export const analyzeConfiguration = async (configContent: string, vendor: Vendor): Promise<{ issues: AuditIssue[], summary: string, score: number }> => {
  if (!API_KEY) throw new Error("缺少 API Key");

  const prompt = `
    你是一位高级网络安全工程师。
    请分析以下 ${vendor} 的配置文件。
    识别安全漏洞、错误配置以及偏离最佳实践的地方（例如：弱密码、启用了 Telnet、缺少 ACL、生成树问题等）。
    
    返回一个 JSON 对象，包含：
    1. 'issues' 列表 (severity: HIGH/MEDIUM/LOW/INFO, category (类型), description (中文描述), remediation (中文修复建议), lineContent).
    2. 'summary': 设备状态的简短总结 (中文).
    3. 'score': 0 到 100 的评分 (100 分表示配置完美).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'user', parts: [{ text: `CONFIG:\n${configContent}` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW', 'INFO'] },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  remediation: { type: Type.STRING },
                  lineContent: { type: Type.STRING, description: "The specific line causing the issue, if applicable" },
                }
              }
            },
            summary: { type: Type.STRING },
            score: { type: Type.INTEGER },
          }
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Analysis failed", error);
    throw new Error("配置分析失败。");
  }
};

/**
 * Generates batch configuration commands and Python/Netmiko scripts.
 */
export const generateBatchConfig = async (
  intent: string,
  vendor: Vendor,
  deviceCount: number
): Promise<{ explanation: string; commands: string; pythonScript: string }> => {
  if (!API_KEY) throw new Error("缺少 API Key");

  const prompt = `
    任务：生成网络配置命令和自动化脚本。
    目标厂商：${vendor}
    用户意图：${intent}
    上下文：适用于 ${deviceCount} 台设备。

    输出 JSON，包含：
    1. 'explanation': 简要解释更改内容 (中文)。
    2. 'commands': 在交换机上运行的具体 CLI 命令。
    3. 'pythonScript': 使用 'netmiko' 库将这些命令应用到设备列表的 Python 脚本 (假设设备列表为占位符)。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_SMART,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            commands: { type: Type.STRING },
            pythonScript: { type: Type.STRING },
          }
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Batch gen failed", error);
    throw new Error("生成脚本失败。");
  }
};