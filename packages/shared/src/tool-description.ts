/**
 * 共享工具描述函数
 * 从 tool_input 生成人类可读描述, Main Process 多处复用
 */

export function describeToolInput(
  toolName: string | undefined,
  input: Record<string, any>,
  shortenPath?: (p: string) => string
): string {
  const shorten = shortenPath || ((p: string) => p);
  switch (toolName) {
    case 'Bash':
      return (input.command as string || 'shell command').slice(0, 100);
    case 'Read':
    case 'Write':
    case 'Edit':
      return shorten(input.file_path as string || 'file');
    case 'Glob':
      return input.pattern as string || 'pattern';
    case 'Grep':
      return `"${input.pattern || ''}" in ${shorten(input.path as string || 'cwd')}`;
    case 'WebFetch':
      return (input.url as string || 'URL').slice(0, 80);
    case 'WebSearch':
      return input.query as string || 'search';
    case 'Task':
      return input.description as string || 'subagent task';
    case 'TodoWrite':
      return 'update task list';
    default:
      return toolName || 'unknown';
  }
}
