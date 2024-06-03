# Webhook debouncer

`webhook-debouncer` is a middleware API designed to manage the flow of webhook requests to a destination server.
The system operates using [NodeJS.Timeout](https://nodejs.org/api/timers.html) and runs entirely in runtime,
meaning there is no database involved.
This implies that in the event of a server failure, no pending requests will be lost.
(This might be subject to change in the future.)

Usage
----
If you need to send only one webhook but your webhook is triggered multiple times,
and there's no straightforward way to limit webhooks on your server, you can use `webhook-debouncer`.
Instead of calling the webhook directly, you call the `webhook-debouncer` server API with the query parameter of the desired webhook.

The `webhook-debouncer` server sets up a timer after which the original webhook will be triggered.
If there is a request to call the same webhook again, the debounce timer will be reset.
To avoid a situation where the debouncer reset is triggered repeatedly, there is also a timeout timer set on the first request.
After the timeout period, the webhook will be triggered regardless.
This is why the debounce time should be shorter, and the timeout time is a fallback with a longer wait time.

Example Use Case
```
CraftCMS fires a webhook on every data change.
We want to run a GitLab build pipeline that retrieves data from CraftCMS.
The problem is that multiple pipelines will be triggered when we make multiple changes in CraftCMS.
Since the pipeline is triggered manually with a webhook, there is no easy way to stop unrelated pipelines.
```

Default Values for Timers
----
These values can be configured in `.env` file
- `TOKEN=secret` - control of secret for authorized access
- `TIMEOUT=420`
- `DEBOUNCE=40`

API
----
The server exposes only one API endpoint, `/call`, which registers the desired destination and applies the debouncer logic to that webhook.

Query parameters
- `token` - token must be same as in `.env` file, otherwise http code `401` will return
- `webhook` - the webhook URL to be called after the debounce or timeout period.
- `debounce` - overrides the default debounce time.
- `timeout` - overrides the default timeout time.
- `method` - used for overwrite default `POST` method to `GET` method


### Note
Make sure the `webhook` parameter is URL encoded.

Project Structure
----
The project API runs on [fastify](https://github.com/fastify/fastify).
Requests to the destination server are made via [axios](https://github.com/axios/axios).
Timers for delays are managed using the native [NodeJS.Timeout](https://nodejs.org/api/timers.html).

Files:
- `index.ts` - server logic
- `global.d.ts` - environmental variables type definitions
- `.env` - server configuration

Commands
----
```bash
# TypeScript check
npm run types;

# Start the application
npm run start;
```