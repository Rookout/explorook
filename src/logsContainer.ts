interface Log {
    level: string;
    time: number;
    message: string;
}

class LogsContainer {
    private logs: Log[];

    constructor() {
        this.logs = [];
    }

    public getLogs() {
        return this.logs;
    }

    public pushLog(log: Log) {
        this.logs.push(log);
    }

    public cleanLogs() {
        this.logs = [];
    }
}
