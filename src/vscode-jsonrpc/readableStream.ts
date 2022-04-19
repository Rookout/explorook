import { RAL } from "vscode-jsonrpc/common";
import { create, Disposable } from "./disposable";

export class ReadableStreamWrapper implements RAL.ReadableStream {

    constructor(private stream: NodeJS.ReadableStream) {
    }

    public onClose(listener: () => void): Disposable {
        this.stream.on("close", listener);
        return create(() => this.stream.off("close", listener));
    }

    public onError(listener: (error: any) => void): Disposable {
        this.stream.on("error", listener);
        return create(() => this.stream.off("error", listener));
    }

    public onEnd(listener: () => void): Disposable {
        this.stream.on("end", listener);
        return create(() => this.stream.off("end", listener));
    }

    public onData(listener: (data: Uint8Array) => void): Disposable {
        this.stream.on("data", listener);
        return create(() => this.stream.off("data", listener));
    }
}
