'use strict';

var cheerio = require('cheerio');
var request = require('request');
var resortMap = require('../data/resorts');
var OpenSnowDate = require('./OpenSnowDate');

var NA = "NA";
var DAYS_OF_HISTORY = 3;

var OpenSnow = function Constructor (resortPage, /* Nullable */ calendarPage) {
    this.$ = resortPage;
    /* Nullable */ this.calendarPage = calendarPage;
};

OpenSnow.prototype.previousDays = function () {
    var self = this;

    // Short-circuit if we didn't manage to load the calendar page
    if (!self.calendarPage) {
        return [];
    }

    // Iterate over each possible calendar day, return snow in inches or "NA"
    var getSnow = function (date) {
        var ds = date.getFormattedDate();
        var dateBlock = self.calendarPage('.calendar-day').filter(function (i, el) {
            // Immediate inner text only
            var elementDS = self.calendarPage(el).find('.day-number').contents().filter(function() {
              return this.nodeType === 3;
            }).text();

            return elementDS === ds;
        });

        if (dateBlock) {
            var accumulation = dateBlock.find('.report-value').text();
            return accumulation && accumulation.endsWith('"') ?
                accumulation.slice(0, -1) : NA;
        } else {
            return NA;
        }
    };

    var formatDay = function (accumulation, date) {
        var summary = {};
        summary['author_name'] = date.getFormattedDate();
        summary['fields'] = [];
        var snowMap = {};
        snowMap['title'] = 'Accumulated Snowfall';
        snowMap['value'] = accumulation + '"';
        summary['fields'].push(snowMap);

        return summary;
    };

    var summaries = [];
    var today = new Date();
    for (var i = DAYS_OF_HISTORY; i > 0; --i) {
        var prevDay = new OpenSnowDate(-1 * i);
        // Only search if date is in current month
        if (!prevDay.sameMonth(today)) {
            continue;
        }

        var prevDaySnow = getSnow(prevDay);
        if (prevDaySnow !== NA) {
            summaries.push(formatDay(prevDaySnow, prevDay));
        }
    }

    return summaries;
};

OpenSnow.prototype.nextDays = function () {
    var self = this;

    var summaries = [];
    self.$('.day-box').each(function (i, element) {
        var summary = {};
        var el = self.$(element);

        var date = el.children('.day-info').children('.date').text();

        var elDay = el.children('.day-fcst');
        var dayAverage = 0;
        if (elDay && elDay.length > 0) {
            var daySnow = elDay.children('.snow').text().replace(/\s/g, '');
            var temperature = elDay.children('.temp').text().replace(/\s/g, '');
            dayAverage = self._getAverage(daySnow);
        }

        var elNight = el.children('.night-fcst');
        var nightSnow = elNight.children('.snow').text().replace(/\s/g, '');
        var nightAverage = self._getAverage(nightSnow);

        summary['author_name'] = date;

        // Day-time snowfall if present
        summary['fields'] = [];
        if (typeof daySnow !== 'undefined' && daySnow) {
            var dayMap = {};
            dayMap['title'] = 'Day';
            dayMap['value'] = daySnow;
            dayMap['short'] = true;
            summary['fields'].push(dayMap);
        }
        // Nightly snowfall
        var nightMap = {};
        nightMap['title'] = 'Night';
        nightMap['value'] = nightSnow;
        nightMap['short'] = true;
        summary['fields'].push(nightMap);

        if (typeof temperature !== 'undefined' && temperature) {
            summary['text'] = 'Temperatures around ' + temperature;
        }

        summary['color'] = self._getColor(dayAverage + nightAverage);


        summaries.push(summary);
    });

    return summaries;
};

OpenSnow.prototype._getAverage = function(snowRange) {
    var vals = snowRange.replace(/\"/g, '').split('-');
    return vals.reduce(function(a, b) { return parseInt(a) + parseInt(b) }) / vals.length;
};

OpenSnow.prototype._getColor = function(inches) {
    var color;
    // [0,1]"
    if (inches <= 1) {
        color = '#ff0000';
    // (1,4)"
    } else if (inches < 4) {
        color = '#ffcc00';
    // 4+"
    } else {
        color = '#36a64f';
    }
    return color;
};

module.exports = OpenSnow;

