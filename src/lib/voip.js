// @flow

let Twilio;

const logErr = require('./logger').logErr;
const cfg = require('./config').cfg;

type TwilioResponse = Object;

/**
 * https://www.twilio.com/docs/api/messaging/send-messages
 *
 * example: require('distraught').sendText({to: toPhone, from: fromTwilioVOIPPhone, message: yourTextMessage})
 * @param {*} payload {to, from, message, statusCallback}
 */
function sendText(payload: {to: string, from: string, message: string, statusCallback: string}): Promise<null|TwilioResponse> {
  if (!(cfg.env.TWILIO_ACCOUNT_SID && cfg.env.TWILIO_AUTH_TOKEN)) {
    logErr(new Error('Could not send text message, missing required Twilio env vars'), {payload});
    return Promise.resolve(null);
  } else if (!Twilio) {
    Twilio = require('twilio');
  }


  return new Twilio(cfg.env.TWILIO_ACCOUNT_SID, cfg.env.TWILIO_AUTH_TOKEN)
    .messages
    .create({
      to: `+1${payload.to}`,
      from: `+1${payload.from}`,
      body: payload.message,
      statusCallback: payload.statusCallback,
    });
}

module.exports = {sendText};
