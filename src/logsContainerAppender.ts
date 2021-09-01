import { LoggingEvent } from "log4js";
import LogData from "./logData";
import LogsContainer from "./logsContainer";

function formatLogMessage(data: any[]) {
    return  data.reduce((accumulator, currentValue) => `${accumulator}, ${JSON.stringify(currentValue)}`, "");
}

function logsContainerAppender() {
    return (loggingEvent: LoggingEvent) => {
        const message = formatLogMessage(loggingEvent.data);
        const time = loggingEvent.startTime.toString();
        const level = loggingEvent.level.levelStr;
        const log = new LogData(level, time, message);
        LogsContainer.pushLog(log);
    };
}

function configure(config: any, layouts: any) {
    return logsContainerAppender();
}

exports.configure = configure;
