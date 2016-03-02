#!/usr/bin/env node
'use strict';

var SnowBot = require('../lib/snowbot');

var token = process.env.BOT_API_KEY || require('../token');
var name = 'snowbot';

var snowbot = new SnowBot({
    token: token,
    name: name
});

snowbot.run();

