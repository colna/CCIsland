/**
 * ChatParser — 解析 Claude Code JSONL transcript 文件
 *
 * 读取 hook 事件中提供的 transcript_path,
 * 提取 user/assistant 消息, 返回最近 N 条
 */

import fs from 'node:fs';
import type { ChatMessage } from '../shared/types';

/** 解析 JSONL transcript, 返回最近 limit 条消息 */
export function parseTranscript(transcriptPath: string, limit: number = 20): ChatMessage[] {
  try {
    const raw = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = raw.trim().split('\n').filter(l => l.trim());
    const messages: ChatMessage[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const message = entry.message || entry;
        const role = message.role || entry.type;

        if (role === 'user' || entry.type === 'human') {
          const content = extractTextContent(message);
          if (content) {
            messages.push({
              role: 'user',
              content: content.slice(0, 500),
              timestamp: entry.timestamp,
            });
          }
        } else if (role === 'assistant') {
          const content = extractTextContent(message);
          if (content) {
            messages.push({
              role: 'assistant',
              content: content.slice(0, 500),
              timestamp: entry.timestamp,
            });
          }
        }
      } catch {
        // 跳过格式错误的行
      }
    }

    return messages.slice(-limit);
  } catch {
    return [];
  }
}

/** 从消息中提取文本内容 */
function extractTextContent(message: any): string {
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text || '')
      .join('\n');
  }
  return '';
}
