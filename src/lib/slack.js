// @flow
/* eslint-disable no-console */
import Promise from 'bluebird';
import axios from 'axios';

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
  fields?: SlackPayloadAttachmentField[],
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
  attachments?: SlackPayloadAttachment[],
};

export const slack = {
  send(data: SlackPayload): Promise {
    if (!url) {
      if (process.env.NODE_ENV === 'development') {
        console.log('===> Slack Notification (Not Sent): ', data.text);
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
};
