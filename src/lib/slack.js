// @flow
const axios = require('axios');
const chalk = require('chalk');
const log = require('./logger');

const url = process.env.SLACK_WEBHOOK_URL;

declare type SlackPayloadAttachmentField = {
  title?: string,
  value?: string,
  short?: boolean,
};

declare type SlackPayloadAttachment = {
  fallback?: string,
  color?: string,
  pretext?: string,
  author_name?: string,
  author_link?: string,
  author_icon?: string,
  title?: string,
  title_link?: string,
  text?: string,
  fields?: Array<SlackPayloadAttachmentField>,
  image_url?: string,
  thumb_url?: string,
  footer?: string,
  footer_icon?: string,
  ts?: number
};

declare type SlackPayload = {
  username?: string,
  channel?: string,
  icon_emoji?: string,
  text?: string,
  attachments?: Array<SlackPayloadAttachment>,
};

function getMessage(payload: SlackPayload) {
  if (payload.text) {
    return payload.text;
  } else if (payload.attachments && payload.attachments[0]) {
    return payload.attachments[0].pretext || payload.attachments[0].title;
  }
  return 'Unknown message';
}

module.exports = {
  slack: {
  send(data: SlackPayload): Promise<*> {
      if (!url) {
        if (process.env.NODE_ENV === 'development') {
          log(chalk.magenta.bold('Slack Notification (Not Sent): '), getMessage(data));
          return Promise.resolve();
        }
        return Promise.reject('Slack Webhook URL not found');
      }

      return axios({
        method: 'post',
        url,
        data,
        headers: {
          'Content-type': 'application/json',
        },
      });
    },
  },
}
