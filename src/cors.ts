import * as cors from "cors";
import fetch from "node-fetch";
import { getStoreSafe } from "./explorook-store";


const LOCALHOST_ORIGIN = "https://localhost:8080";
const ROOKOUT_ORIGIN_REGEX = /^https:\/\/.*\.rookout(?:-dev)?\.com$/;
const DYNATRACE_ORIGIN_REGEX = /^https:\/\/.*\.dynatrace(?:labs)?\.com$/;

const ALLOW_CORS_OPTION: cors.CorsOptions = {origin: true};
const DENY_CORS_OPTION: cors.CorsOptions = {origin: false};


const verifiedOriginsCache = new Set([LOCALHOST_ORIGIN]);

const store = getStoreSafe();

const corsOptionsDelegate = async (req: cors.CorsRequest, callback: (err: Error | null, options?: cors.CorsOptions) => void) => {
    try {
        const shouldSkipDtVerification = store.get("skipDtVerification", false);
        const origin = req.headers.origin;
        if (verifiedOriginsCache.has(origin) || ROOKOUT_ORIGIN_REGEX.test(origin)) {
            callback(null, ALLOW_CORS_OPTION);
            return;
        }

        if (!DYNATRACE_ORIGIN_REGEX.test(origin)) {
            callback(null, DENY_CORS_OPTION);
            return;
        }


        if (shouldSkipDtVerification) {
            callback(null, ALLOW_CORS_OPTION);
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

