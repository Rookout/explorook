import type {CorsOptions, CorsRequest} from "cors";
import * as cors from "cors";


const LOCALHOST_ORIGIN = "https://localhost:8080";
const ROOKOUT_ORIGIN_REGEX = /^https:\/\/.*\.rookout(?:-dev)?\.com$/;
const DYNATRACE_ORIGIN_REGEX = /^https:\/\/.*\.dynatrace(?:labs)?\.com$/;

const ALLOW_CORS_OPTION: CorsOptions = {origin: true};
const DENY_CORS_OPTION: CorsOptions = {origin: false};

const corsOptionsDelegate = async (req: CorsRequest, callback: (err: Error | null, options?: CorsOptions) => void) => {
    try {
        const origin = req.headers.origin;
        if (origin === LOCALHOST_ORIGIN || ROOKOUT_ORIGIN_REGEX.test(origin)) {
            callback(null, ALLOW_CORS_OPTION);
            return;
        }

        if (!DYNATRACE_ORIGIN_REGEX.test(origin)) {
            callback(null, DENY_CORS_OPTION);
        }

        callback(null, ALLOW_CORS_OPTION);
    } catch (err) {
        callback(err, DENY_CORS_OPTION);
    }
};


export const getCorsMiddleware = () => {
    return cors(corsOptionsDelegate);
};

