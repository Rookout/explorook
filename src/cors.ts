import * as cors from "cors";
import fetch from "node-fetch";


const LOCALHOST_ORIGIN = "http://localhost:3000";
const DYNATRACE_ORIGIN_REGEX = /^https:\/\/.*\.dynatrace(?:labs)?\.com(?::\d+)?$/;

const ALLOW_CORS_OPTION: cors.CorsOptions = {origin: true};
const DENY_CORS_OPTION: cors.CorsOptions = {origin: false};


const verifiedOriginsCache = new Set([LOCALHOST_ORIGIN]);


const corsOptionsDelegate = async (req: cors.CorsRequest, callback: (err: Error | null, options?: cors.CorsOptions) => void) => {
    try {
        const origin = req.headers.origin;
        if (verifiedOriginsCache.has(origin)) {
            callback(null, ALLOW_CORS_OPTION);
            return;
        }

        if (!DYNATRACE_ORIGIN_REGEX.test(origin)) {
            callback(null, DENY_CORS_OPTION);
            return;
        }

        const response = await fetch(`${origin}/platform-reserved/dob/isapprefallowed?appOrigin=${origin}`);

        if (!response.ok) {
            callback(null, DENY_CORS_OPTION);
            return;
        }

        verifiedOriginsCache.add(origin);
        callback(null, ALLOW_CORS_OPTION);
    } catch (err) {
        callback(err, DENY_CORS_OPTION);
    }
};


export const getCorsMiddleware = () => {
    return cors(corsOptionsDelegate);
};

