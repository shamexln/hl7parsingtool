const SQLITE_INTEGER_MAX = 9223372036854775807;

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
    let createdAt;
    if (typeof createdTime === 'number') {
        createdAt = createdTime;
    } else if (createdTime instanceof Date) {
        createdAt = createdTime.getTime();
    } else {
        createdAt = new Date(createdTime).getTime();
    }
    if (!createdAt || isNaN(createdAt)) return false;
    return (Date.now() - createdAt) > (days * 24 * 60 * 60 * 1000);
}

module.exports = {
    SQLITE_INTEGER_MAX,
    isPasswordCycleExpired
};