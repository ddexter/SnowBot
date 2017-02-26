'use strict';

var MONTH_ABBV = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

var OpenSnowDate = function Constructor (offset) {
    this.date = new Date();
    this.date.setDate(this.date.getDate() + offset);
};

OpenSnowDate.prototype.getFormattedDate = function () {
    var month = MONTH_ABBV[this.date.getMonth()];
    var day = this.date.getDate();
    return month + " " + day.toString();
};

OpenSnowDate.prototype.getDayString = function () {
    return this.date.getDate().toString();
};

OpenSnowDate.prototype.sameMonth = function(otherDate) {
    return otherDate.getMonth() === this.date.getMonth() && otherDate.getFullYear() === this.date.getFullYear();
};

module.exports = OpenSnowDate;

