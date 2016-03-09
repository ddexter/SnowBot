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

SnowBot.prototype._reply = function (message) {
    var self = this;
    var resortRegex = new RegExp('<@' + self.user.id + '> (\\S+)', 'g');
    var channel = self._getChannelById(message.channel);

    var match = resortRegex.exec(message.text);
    if (channel && match && match.length > 1) {
        var resort = resortMap[match[1]] || match[1];
        request(self.URL_PREFIX + resort, function (err, response, html) {
            if (!err && response.statusCode == 200) {
                var $ = cheerio.load(html);
                var reply = '';
                $('.day-box').each(function (i, element) {
                    var el  = $(element);

                    var date = el.children('.day-info').children('.date').text();
                    reply += date + ": ";

                    var elDay = el.children('.day-fcst');
                    if (elDay && elDay.length > 0) {
                        reply += elDay.children('.snow').text().replace(/\s/g, '') + ' during the day ';
                        reply += 'with temperatures around ' + elDay.children('.temp').text().replace(/\s/g, '') + ' and ';
                    }

                    var elNight = el.children('.night-fcst');
                    reply += elNight.children('.snow').text().replace(/\s/g, '') + " overnight\n";
                });
                self.postMessageToChannel(channel.name, reply, {as_user: true});
            } else  {
                self.postMessageToChannel(channel.name, 'There was an error processing the request', {as_user: true});
            }
        });
    } else {
        self.postMessageToChannel(channel.name, "I couldn't understand the request (" + message.text + ").  Try: @snowbot <resort>", {as_user: true});
    }
};

SnowBot.prototype._isToBot = function (message) {
    return message &&
           message.hasOwnProperty('text') &&
           message.text.indexOf(this.user.id) === 2;
}

SnowBot.prototype._isChannelMessage = function (message) {
    return message &&
           message.hasOwnProperty('channel') &&
           message.channel[0] === 'C';
}

SnowBot.prototype._isFromBot = function (message) {
    return message.user === this.user.id;
};

SnowBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = SnowBot;

