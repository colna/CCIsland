/**
 * HookServer — 内嵌 HTTP 服务
 *
 * 监听 localhost:51515, 接收 Claude Code 的 HTTP Hook POST 请求
 * 使用 Node.js 内置 http 模块, 零外部依赖
 */

import http from 'node:http';

export type RequestHandler = (event: Record<string, any>) => Promise<Record<string, any>>;

export class HookServer {
  private server: http.Server | null = null;
  private handler: RequestHandler;
  private _isRunning = false;
  private _port = 51515;

  constructor(handler: RequestHandler) {
    this.handler = handler;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get port(): number {
    return this._port;
  }

  async start(port: number = 51515): Promise<void> {
    this._port = port;

    this.server = http.createServer((req, res) => {
      // CORS (允许本地调试)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // 健康检查
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', port: this._port }));
        return;
      }

      // Hook 事件入口
      if (req.method === 'POST' && req.url === '/hook') {
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          this.handleHook(body, res);
        });
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    return new Promise((resolve, reject) => {
      this.server!.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // 端口被占用, 尝试下一个
          console.log(`Port ${this._port} in use, trying ${this._port + 1}...`);
          this._port++;
          if (this._port <= port + 5) {
            this.server!.listen(this._port, '127.0.0.1');
          } else {
            reject(new Error(`No available port found (tried ${port}-${this._port})`));
          }
        } else {
          reject(err);
        }
      });

      this.server!.listen(this._port, '127.0.0.1', () => {
        this._isRunning = true;
        console.log(`[HookServer] Listening on http://127.0.0.1:${this._port}`);
        resolve();
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this._isRunning = false;
      console.log('[HookServer] Stopped');
    }
  }

  private async handleHook(body: string, res: http.ServerResponse): Promise<void> {
    try {
      const event = JSON.parse(body);
      // handler 可能会阻塞 (审批等待), 这是设计如此
      const response = await this.handler(event);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (err) {
      console.error('[HookServer] Error handling hook:', err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  }
}
