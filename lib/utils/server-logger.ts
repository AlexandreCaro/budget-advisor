import fs from 'fs';
import path from 'path';
import { logger } from './logger';

class ServerLogger {
  private logFile: string;
  private logStream: fs.WriteStream | null = null;

  constructor() {
    // Only initialize if running on server
    if (typeof window === 'undefined') {
      const baseDir = process.env.NODE_ENV === 'production'
        ? '/var/log/budget-advisor'
        : path.join(process.cwd(), 'data', 'logs');

      const today = new Date();
      const datePath = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
      const logDir = path.join(baseDir, datePath);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const timestamp = today.toISOString().replace(/[:.]/g, '-');
      const processId = process.pid;
      this.logFile = path.join(logDir, `server-${processId}-${timestamp}.log`);
      this.initStream();
    }
  }

  private initStream() {
    if (!this.logStream && this.logFile) {
      this.logStream = fs.createWriteStream(this.logFile, {
        flags: 'a',
        encoding: 'utf8',
        mode: 0o644
      });

      this.logStream.on('error', (error) => {
        logger.error('Error writing to server log file:', error);
      });
    }
  }

  private writeToLog(message: string) {
    if (typeof window === 'undefined' && this.logStream) {
      try {
        this.logStream.write(message + '\n');
      } catch (error) {
        logger.error('Failed to write to server log file:', error);
        this.initStream();
      }
    }
  }

  info(message: string, data?: any) {
    logger.info(message, data);
    this.writeToLog(`[INFO] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`);
  }

  error(message: string, error?: any) {
    logger.error(message, error);
    this.writeToLog(`[ERROR] ${message} ${error ? JSON.stringify(error, null, 2) : ''}`);
  }

  warn(message: string, data?: any) {
    logger.warn(message, data);
    this.writeToLog(`[WARN] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`);
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(message, data);
      this.writeToLog(`[DEBUG] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`);
    }
  }

  progress(message: string, data: any) {
    logger.progress(message, data);
    this.writeToLog(`[PROGRESS] ${message} ${JSON.stringify(data, null, 2)}`);
  }

  close() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

export const serverLogger = new ServerLogger(); 