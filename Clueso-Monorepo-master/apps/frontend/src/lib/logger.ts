export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
    TRACE = 'TRACE'
}

export enum LogSource {
    APP = 'APP',
    EXTENSION = 'EXT',
    BACKEND = 'API',
    AI = 'AI'
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    source: LogSource;
    message: string;
    data?: any;
}

class LoggerService {
    private logs: LogEntry[] = [];
    private listeners: ((log: LogEntry) => void)[] = [];

    constructor() {
        // Capture initial logs if any
        this.log(LogLevel.INFO, LogSource.APP, 'Logger Initialized');
    }

    public log(level: LogLevel, source: LogSource, message: string, data?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            source,
            message,
            data
        };

        this.logs.push(entry);
        this.notify(entry);

        // Also print to console specifically
        const style = this.getStyle(level, source);
        console.log(`%c[${source}] [${level}] ${message}`, style, data || '');

        // --- SEND TO DEV SERVER ---
        fetch('http://localhost:3001/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        }).catch(() => { }); // Ignore errors if server is down
    }

    public getLogs() {
        return this.logs;
    }

    public subscribe(callback: (log: LogEntry) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    public downloadLogs() {
        const content = this.logs.map(l => {
            const dataStr = l.data ? `\nData: ${JSON.stringify(l.data, null, 2)}` : '';
            return `[${l.timestamp}] [${l.source}] [${l.level}]: ${l.message}${dataStr}`;
        }).join('\n----------------------------------------\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clueso_full_logs_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private notify(entry: LogEntry) {
        this.listeners.forEach(cb => cb(entry));
    }

    private getStyle(level: LogLevel, source: LogSource) {
        let color = '#333';
        let bg = 'transparent';

        if (level === LogLevel.ERROR) color = '#ef4444';
        if (level === LogLevel.WARN) color = '#f59e0b';
        if (level === LogLevel.DEBUG) color = '#6366f1';

        if (source === LogSource.EXTENSION) bg = '#eef2ff';

        return `color: ${color}; background: ${bg}; font-weight: bold; padding: 2px 4px; border-radius: 4px;`;
    }
}

export const logger = new LoggerService();
