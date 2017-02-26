'use strict';

var OpenSnowDate = function Constructor (offset) {
    this.date = new Date();
    this.date.setDate(this.date.getDate() + offset);
};

OpenSnowDate.prototype.getFormattedDate = function () {
    return this.date.getDate().toString();
};

OpenSnowDate.prototype.sameMonth = function(otherDate) {
    return otherDate.getMonth() === this.date.getMonth() && otherDate.getFullYear() === this.date.getFullYear();
};

module.exports = OpenSnowDate;

