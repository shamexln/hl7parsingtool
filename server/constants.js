const SQLITE_INTEGER_MAX = 9223372036854775807;
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