interface Log {
    level: string;
    time: string;
    message: string;
}

export default class LogData implements Log {
    public level: string;
    public time: string;
    public message: string;

    constructor(level: string, time: string, message: string) {
        this.level = level;
        this.time = time;
        this.message = message;
    }
}
