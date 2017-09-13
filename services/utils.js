"use strict"

/**
 * the current date and time is returned as ISO8601 string
 * @returns {string}
 */
function getDateTimeNowISO() {
    let date = new Date();
    return date.toISOString();
}
exports.getDateTimeNowISO = getDateTimeNowISO
