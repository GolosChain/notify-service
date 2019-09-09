// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_EVENT_EXPIRATION: Number(env.GLS_EVENT_EXPIRATION) || 1000 * 60 * 60 * 24 * 30, // month
    GLS_ONLINE_NOTIFY_CONNECT: env.GLS_ONLINE_NOTIFY_CONNECT,
    GLS_PUSH_CONNECT: env.GLS_PUSH_CONNECT,
    GLS_PRISM_CONNECT: env.GLS_PRISM_CONNECT,
    GLS_CYBERWAY_HTTP_URL: env.GLS_CYBERWAY_HTTP_URL,
    GLS_DISABLE_PUSH: Boolean(env.GLS_DISABLE_PUSH) && env.GLS_DISABLE_PUSH !== 'false',
    GLS_MAX_NOTIFICATION_DELAY: Number(env.GLS_MAX_NOTIFICATION_DELAY) || 10800000, // 3 hours
};
