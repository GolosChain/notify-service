// Описание переменных окружения смотри в Readme.
const env = process.env;
// TODO -

module.exports = {
    EXPIRATION: env.EXPIRATION || Moments.oneMonth,
};
