const logger = require("./logger");
// Use the maximum safe integer in JavaScript to avoid precision loss issues
const SQLITE_INTEGER_MAX = Number.MAX_SAFE_INTEGER;
const OBSOLETED_DEFAULT_VALUE = 0;

/**
 * 判断密码周期是否过期
 * @param {string|number} cycleDays - 周期天数（如30、60、-1或9223372036854775807）
 * @param {string|number|Date} createdTime - 创建时间（ISO字符串、时间戳或Date对象）
 * @returns {boolean} - true表示已过期，false表示未过期或不限周期
 */
function isPasswordCycleExpired(cycleDays, createdTime) {
    const days = Number(cycleDays);
    if (!days || days >= SQLITE_INTEGER_MAX || days < 0) return false; // 不限周期
    if (!createdTime) return false;

    // 解析创建时间为时间戳（毫秒）
    let createdAtMs;
    if (typeof createdTime === 'number') {
        createdAtMs = createdTime;
    } else if (createdTime instanceof Date) {
        createdAtMs = createdTime.getTime();
    } else {
        createdAtMs = new Date(createdTime).getTime();
    }
    if (!createdAtMs || isNaN(createdAtMs)) return false;

    const nowMs = Date.now();
    logger.info(`Password is created at:${createdAtMs}`);
    logger.info(`Now is :${nowMs}`);

    // 使用基于日历的计算，避免夏令时/时区导致的小时数误差
    const created = new Date(createdAtMs);
    const now = new Date(nowMs);
    const createdUTC0 = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const nowUTC0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const daysElapsed = Math.floor((nowUTC0 - createdUTC0) / (24 * 60 * 60 * 1000));

    logger.info(`Calendar days elapsed:${daysElapsed}`);
    logger.info(`CycleDays :${days}`);

    // 如果创建时间在未来，则未过期
    if (daysElapsed < 0) return false;

    // 当日历上达到或超过指定天数即视为过期
    return daysElapsed >= days;
}

function isObviousSequence(password) {
    // simple sequence checks
    const isRepeatedChar = (s) => /^(.)\1+$/.test(s);
    const isSequentialNumeric = (s) => {
        if (!/^\d+$/.test(s)) return false;
        let inc = true, dec = true;
        for (let i = 1; i < s.length; i++) {
            const prev = s.charCodeAt(i-1) - 48;
            const cur = s.charCodeAt(i) - 48;
            if (cur !== prev + 1) inc = false;
            if (cur !== prev - 1) dec = false;
            if (!inc && !dec) return false;
        }
        return inc || dec;
    };
    const isObviousSequence = (s) => isRepeatedChar(s) || isSequentialNumeric(s);
    return isObviousSequence(password);
}
module.exports = {
    SQLITE_INTEGER_MAX,
    OBSOLETED_DEFAULT_VALUE,
    isPasswordCycleExpired,
    isObviousSequence
};