import * as dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import axios from 'axios';
const { is_web_uri } = require('valid-url');

const QUERY_DEBOUNCE_KEY = 'debounce';
const QUERY_TIMEOUT_KEY = 'timeout';

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
}
type Webhooks = {
    [key: string]: Webhook;
}
const webhooks: Webhooks = {};


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
    axios.get(webhook).catch(() => {});
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
    const debounce_time = is_number(req.query[QUERY_DEBOUNCE_KEY]) ? Number(req.query[QUERY_DEBOUNCE_KEY]) : DEFAULT_DEBOUNCE_TIME;
    const timeout_time = is_number(req.query[QUERY_TIMEOUT_KEY]) ? Number(req.query[QUERY_TIMEOUT_KEY]) : DEFAULT_TIMEOUT_TIME;

    // check validity
    if (!is_webhook_valid(webhook)) {
        res.statusCode = 400;
        return { status: 0, message: 'Wrong webhook url' };
    }

    // inital request
    if (!webhooks[webhook]) {
        webhooks[webhook] = {
            debounce: debounce_call(webhook, debounce_time),
            timeout: timeout_call(webhook, timeout_time),
        };

        return { status: 1, 'message': 'inital debounce created' };
    }

    // reset debounce
    webhooks[webhook].debounce.refresh();
    return { status: 2, 'message': 'debounce refresh' };
});

server.listen({ port: Number(process.env.APP_PORT), host: '0.0.0.0' })
    .then(() => console.log(`Listening on port ${process.env.APP_PORT}`))
    .catch(e => console.log(e));
