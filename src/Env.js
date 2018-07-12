// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    EVENT_EXPIRATION: env.EVENT_EXPIRATION || 1000 * 60 * 60 * 24 * 30, // month
    BULGAKOV_CONNECT_STRING: env.BULGAKOV_CONNECT_STRING,
};
