// @flow

const Twilio = require('twilio');

const logErr = require('./logger').logErr;

type TwilioResponse = Object;

/**
 *
 * @param {*} payload {to, from, message, statusCallback}
 */
function sendText(payload: {to: string, from: string, message: string, statusCallback: string}): Promise<null|TwilioResponse> {
  if (!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)) {
    logErr(new Error('Could not send text message, missing required Twilio env vars'), {payload});
    return Promise.resolve(null);
  }

  return new Twilio.RestClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    .sendMessage({
      to: `+1${payload.to}`,
      from: `+1${payload.from}`,
      body: payload.message,
      statusCallback: payload.statusCallback,
    });
}

module.exports = {sendText};
