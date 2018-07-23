// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_EVENT_EXPIRATION: env.GLS_EVENT_EXPIRATION || 1000 * 60 * 60 * 24 * 30, // month
    GLS_FRONTEND_GATE_CONNECT: env.GLS_FRONTEND_GATE_CONNECT,
};
