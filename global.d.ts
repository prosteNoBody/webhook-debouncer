declare namespace NodeJS {
    interface ProcessEnv {
        APP_PORT: string;
        DEBOUNCE_TIME: string;
        TIMEOUT_TIME: string;
        AUTH_TOKEN: string;
        DEBUG: string;
    }
}