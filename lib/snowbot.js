'use strict';

var util = require('util');
var cheerio = require('cheerio');
var request = require('request');
var resortMap = require('../data/resorts');
var Bot = require('slackbots');

// TODO: ES6 class?
var SnowBot = function Constructor(settings) {
    this.URL_PREFIX = 'https://opensnow.com/location/';
    this.RESORT_REGEX = /^@snowbot:? (\S+)$/g;

    this.settings = settings;
    this.settings.name = this.settings.name || 'snowbot';

    this.user = null;
};

util.inherits(SnowBot, Bot);

SnowBot.prototype.run = function () {
    SnowBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
}

SnowBot.prototype._onStart = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

SnowBot.prototype._onMessage = function (message) {
    if (this._isToBot(message) && this._isChannelMessage(message)) {
        return this._reply(message);
    }
};

SnowBot.prototype._isToBot = function (message) {
    return message &&
           message.hasOwnProperty('text') &&
           message.text.indexOf(this.user.id) === 2;
};

SnowBot.prototype._isChannelMessage = function (message) {
    return message &&
           message.hasOwnProperty('channel') &&
           message.channel[0] === 'C';
};

SnowBot.prototype._isFromBot = function (message) {
    return message.user === this.user.id;
};

SnowBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

/**
 * Return an attachement object with weather for the upcoming days
 */
SnowBot.prototype._formatMessage = function ($) {
    function getAverage(snowRange) {
        var vals = snowRange.replace(/\"/g, '').split('-');
        return vals.reduce(function(a, b) { return parseInt(a) + parseInt(b) }) / vals.length;
    }

    var summaries = [];
    $('.day-box').each(function (i, element) {
        var summary = {};
        var el  = $(element);

        var date = el.children('.day-info').children('.date').text();

        var elDay = el.children('.day-fcst');
        var dayAverage = 0;
        if (elDay && elDay.length > 0) {
            var daySnow = elDay.children('.snow').text().replace(/\s/g, '');
            var temperature = elDay.children('.temp').text().replace(/\s/g, '');
            dayAverage = getAverage(daySnow);
        }

        var elNight = el.children('.night-fcst');
        var nightSnow = elNight.children('.snow').text().replace(/\s/g, '');
        var nightAverage = getAverage(nightSnow);

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

        // [0,1]"
        if (dayAverage + nightAverage <= 1) {
            summary['color'] = '#ff0000';
        // (1,4)"
        } else if (dayAverage + nightAverage < 4) {
            summary['color'] = '#ffcc00';
        // 4+"
        } else {
            summary['color'] = '#36a64f';
        }

        summaries.push(summary);
    });

    return summaries;
};

SnowBot.prototype._reply = function (message) {
    var self = this;
    var resortRegex = new RegExp('<@' + self.user.id + '>:? (\\S+)', 'g');
    var channel = self._getChannelById(message.channel);

    var match = resortRegex.exec(message.text);
    if (channel && match && match.length > 1) {
        var resort = resortMap[match[1]] || match[1];
        request(self.URL_PREFIX + resort, function (err, response, html) {
            if (!err && response.statusCode == 200) {
                var $ = cheerio.load(html);
                var params = {};
                params['attachments'] = self._formatMessage($);
                params['as_user'] = true;
                self.postMessageToChannel(channel.name, 'Snow report for ' + resort, params);
            } else  {
                self.postMessageToChannel(channel.name, 'There was an error processing the request', {as_user: true});
            }
        });
    } else {
        self.postMessageToChannel(channel.name, "I couldn't understand the request (" + message.text + ").  Try: @snowbot <resort>", {as_user: true});
    }
};

module.exports = SnowBot;

