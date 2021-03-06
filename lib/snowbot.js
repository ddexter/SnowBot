'use strict';

var cheerio = require('cheerio');
var request = require('request');
var util = require('util');
var Bot = require('slackbots');
var resortMap = require('../data/resorts');
var OpenSnow = require('./OpenSnow');

var SnowBot = function Constructor(settings) {
    this.RESORT_REGEX = /^@snowbot:? (\S+)$/g;
    this.HISTORICAL_SNOWFALL_REGEX = /\/location\/snips\/snowhistory\?location_id=\d+/g;
    this.OPEN_SNOW = 'https://www.opensnow.com'

    this.settings = settings;
    this.settings.name = this.settings.name || 'snowbot';

    this.user = null;
};

util.inherits(SnowBot, Bot);

SnowBot.prototype.run = function () {
    SnowBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

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

SnowBot.prototype._replySuccess = function (channel, resortName, resortHtml, /* Nullable */ calendarHtml) {
    var self = this;
    var cheerioCalendar = calendarHtml ? cheerio.load(calendarHtml) : null;
    var openSnow = new OpenSnow(cheerio.load(resortHtml), cheerioCalendar);

    var params = {};
    params['attachments'] = openSnow.previousDays().concat(openSnow.nextDays());
    params['as_user'] = true;
    self.postMessageToChannel(channel.name, 'Snow report for ' + resortName, params);
}

SnowBot.prototype._reply = function (message) {
    var self = this;
    var resortRegex = new RegExp('<@' + self.user.id + '>:? (\\S+)', 'g');
    var channel = self._getChannelById(message.channel);

    var match = resortRegex.exec(message.text);
    if (channel && match && match.length > 1) {
        var resort = resortMap[match[1]] || match[1];
        request(self.OPEN_SNOW + '/location/' + resort, function (err, response, html) {
            if (!err && response.statusCode == 200) {
                // Search for calendar API call and make separate request to fetch it
                var historicalSnowfallMatches = html.match(self.HISTORICAL_SNOWFALL_REGEX);
                if (historicalSnowfallMatches && historicalSnowfallMatches.length > 0) {
                    request(self.OPEN_SNOW + historicalSnowfallMatches[0], function (calendarErr, calendarResponse, calendarHtml) {
                        var calHtml = calendarErr || calendarResponse.statusCode != 200 ? null : calendarHtml;
                        self._replySuccess(channel, resort, html, calHtml);
                    });
                } else {
                    self._replySuccess(channel, resort, html, null);
                }
            } else {
                self.postMessageToChannel(channel.name, 'There was an error processing the request', {as_user: true});
            }
        });
    } else {
        self.postMessageToChannel(channel.name, "I couldn't understand the request (" + message.text + ").  Try: @snowbot <resort>", {as_user: true});
    }
};

module.exports = SnowBot;

