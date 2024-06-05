const ignoredErrors = new Set<string>(["ENOENT", "ENOTDIR", "ENOTEMPTY",
                                              "ENOTFOUND", "ETIMEDOUT", "EACCES", "ECONNRESET"]);
Object.freeze(ignoredErrors); // prevents anyone from changing the object

export const USER_EMAIL_KEY = "userEmailKey";

export const notify = (...args: any[]) => {
    // This will be a NOOP until we replace Bugsnag
};
export class Logger {

  public info(message?: any) {
    console.info(message);
  }
  public warn(message?: any) {
    console.warn(message);
  }
  public error(message?: any) {
    console.error(message);
  }
  public debug(message: string) {
    // ignore
  }
  public trace(msg?: string | Error) {
    console.trace(msg || "");
  }
}

