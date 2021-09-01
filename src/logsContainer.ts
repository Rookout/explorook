import LogData from "./logData";

export default class LogsContainer {
    public static getLogs() {
        return LogsContainer.logs;
    }

    public static pushLog(log: LogData) {
        LogsContainer.logs.push(log);
    }

    public static cleanLogs() {
        LogsContainer.logs = [];
    }

    private static logs: LogData[];
}
