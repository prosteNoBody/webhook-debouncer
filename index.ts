import * as dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import axios from 'axios';
const { is_web_uri } = require('valid-url');

const QUERY = {
    DEBOUNCE_KEY: 'debounce',
    TIMEOUT_KEY: 'timeout',
    AUTH_TOKEN: 'token',
    METHOD: 'method',
}

// check env variables
const is_number = (variable: any): variable is number => {
    return !Number.isNaN(Number(variable));
}
if (!is_number(process.env.DEBOUNCE_TIME) || !is_number(process.env.TIMEOUT_TIME)) {
    throw new Error('Wrong environmental variables.');
}
const DEFAULT_DEBOUNCE_TIME = Number(process.env.DEBOUNCE_TIME);
const DEFAULT_TIMEOUT_TIME = Number(process.env.TIMEOUT_TIME);


const server = Fastify({
    logger: process.env.DEBUG === '1',
});
type Webhook = {
    debounce: NodeJS.Timeout;
    timeout: NodeJS.Timeout;
    method: string;
}
type Webhooks = {
    [key: string]: Webhook;
}
const webhooks: Webhooks = {};

// get http method
const convert_method = (method: string): string => {
    switch (method) {
        case 'GET':
        case 'get':
            return 'get';
        case 'POST':
        case 'post':
        default:
            return 'post';
    }
}

// check url validity
const is_webhook_valid = (webhook: string): boolean => {
    try {
        const decodedUri = decodeURIComponent(webhook);
        if (!is_web_uri(decodedUri)) return false;
        return true;
    } catch {
        return false;
    }
}

// call desired webhook, cancel timeouts and delete that webhook from dictonary
const call_webhook = (webhook: string): void => {
    axios({ method: webhooks[webhook].method, url: webhook }).catch(() => {});
    clearTimeout(webhooks[webhook].debounce);
    clearTimeout(webhooks[webhook].timeout);
    delete webhooks[webhook];
};

// create debounce call
const debounce_call = (webhook: string, time: number): NodeJS.Timeout => {
    return setTimeout(() => call_webhook(webhook), time * 1000);
};

// create timeout call
const timeout_call = (webhook: string, time: number): NodeJS.Timeout => {
    return setTimeout(() => call_webhook(webhook), time * 1000);
};


server.get('/call', async (req, res) => {
    const webhook = req.query['webhook'];
    const auth_token = req.query[QUERY.AUTH_TOKEN];
    const webhook_method = req.query[QUERY.METHOD];
    const debounce_time = is_number(req.query[QUERY.DEBOUNCE_KEY]) ? Number(req.query[QUERY.DEBOUNCE_KEY]) : DEFAULT_DEBOUNCE_TIME;
    const timeout_time = is_number(req.query[QUERY.TIMEOUT_KEY]) ? Number(req.query[QUERY.TIMEOUT_KEY]) : DEFAULT_TIMEOUT_TIME;

    // check token
    if (auth_token !== process.env.AUTH_TOKEN) {
        res.statusCode = 401;
        return { status: 401, message: 'Invalid token' };
    }

    // check validity
    if (!is_webhook_valid(webhook)) {
        res.statusCode = 400;
        return { status: 400, message: 'Wrong webhook url' };
    }

    // inital request
    if (!webhooks[webhook]) {
        webhooks[webhook] = {
            debounce: debounce_call(webhook, debounce_time),
            timeout: timeout_call(webhook, timeout_time),
            method: convert_method(webhook_method),
        };

        return { status: 250, 'message': 'inital debounce created' };
    }

    // reset debounce
    webhooks[webhook].debounce.refresh();
    return { status: 251, 'message': 'debounce refresh' };
});

server.listen({ port: Number(process.env.APP_PORT), host: '0.0.0.0' })
    .then(() => console.log(`Listening on port ${process.env.APP_PORT}`))
    .catch(e => console.log(e));
