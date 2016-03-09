# SnowBot
An OpenSnow Slack Bot built on Node.js

## Use
In a channel where the bot is lurking:

`@slackbot <resort>`

![Example Usage](/images/botEx.png)

The resort has to match a valid resort at https://opensnow.com/locations/<resort>

## Dev
Install: `npm install`

Run: `node bin/bot.js`

The token file is located in the top level directory as token.js

To add a nickname for a resort, edit the mapping in data/resorts.js, adding an entry for (key = the resort nickname, value = the canonical resort url name on opensnow)
