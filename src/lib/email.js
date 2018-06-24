/* @flow */
const _ = require('lodash');
const logErr = require('./logger').logErr;
const cfg = require('./config').cfg;

let bluebird;
let sgHelpers;
let sgMail;

let Personalization;
let Mail;
let Attachment;

function requireSG() {
  if (!(sgMail || sgHelpers)) {
    bluebird = require('bluebird');
    sgHelpers = require('@sendgrid/helpers');
    Personalization = sgHelpers.classes.Personalization;
    Attachment = sgHelpers.classes.Attachment;
    Mail = sgHelpers.classes.Mail;

    sgMail = require('@sendgrid/mail');
    sgMail.Promise = bluebird;
    sgMail.setApiKey(cfg.env.SENDGRID_API_KEY);
  }
}


/**
 * Helper function to add original email address
 * To the DEV email so engineers can see who it would
 * Have been sent to
 *
 * @param {String} devEmail
 * @param {String} email
 */
function getOverriddenEmail(email: string): string {
  if (!cfg.email.devEmail) {
    throw new Error('Email failed to send: cfg.email.devEmail is not set');
  }

  const devEmailParts = cfg.email.devEmail.split('@');

  // prevent accidentally modifying an already overriden email
  if (email.includes(devEmailParts[1])) {
    return email;
  }

  return `${devEmailParts[0]}+${email.replace('@', '.at.')}@${
    devEmailParts[1]
  }`;

}

/**
 * Before calling sendEmail, use this to make sure email addresses are protected on guarded environments
 * @param {String} email [address]
 */
function overrideEmail(email: string): string {
  if (!_.includes(cfg.email.guardedEnvironments, cfg.env.NODE_ENV)) {
    return email;
  }
  if (!(cfg.email.devEmail)) {
    throw new Error('Email failed to send: cfg.email.devEmail is not set');
  }
  return getOverriddenEmail(email);
}

type EmailPayload = {|
  subject: string,
  html: string,
  fromAddress?: string,
  fromName?: string,
  toName?: string,
  toAddress?: string,
  replyToAddress?: string,
  replyToName?: string,
  contentType?: string,
  recipients?: Array<Object>,
  attachments?: Array<{
    content: any,
    filename: string,
    type: string,
    disposition: string,
  }>,
  asm?: {
    groupId: number,
  },
|};

/**
 * Given an email payload, send an email through Sendgrid
 * https://github.com/sendgrid/sendgrid-nodejs/blob/0164ff8751e1dc9cacdc17af23dc06a21065b773/use-cases/kitchen-sink.md
 * @param {Object} payload
 */
async function sendEmail(opts: EmailPayload): Promise<boolean|Object> {
  requireSG();

  const personalization = new Personalization();
  if (!((opts.recipients && opts.recipients) || (opts.toAddress && opts.toAddress.length && opts.toName && opts.toName.length))) {
    logErr(new Error('Unable to send email, invalid options'), {opts});
    return false;
  }

  if (opts.recipients) {
    const validRecipients = _.reject(opts.recipients, (recipient) => !recipient.toAddress);
    if (!(validRecipients && validRecipients.length)) {
      logErr(new Error('Unable to send email, no valid recipient'), {opts});
      return false;
    }

    _.each(validRecipients, (recipient) => {
      personalization.addTo({email: overrideEmail(recipient.toAddress), name: recipient.toName});
    });
  } else if (opts.toAddress && opts.toName) {
    personalization.addTo({email: overrideEmail(opts.toAddress), name: opts.toName});
  }

  _.each(_.get(opts, 'cc', []), (email) => {
    personalization.addCc({email});
  });

  const mail = new Mail();
  mail.setFrom({email: opts.fromAddress, name: opts.fromName});
  mail.addPersonalization(personalization);
  mail.setSubject(opts.subject);
  mail.addHtmlContent(opts.html);

  if (opts.asm) {
    mail.setAsm(opts.asm);
  }

  if (opts.replyToAddress && opts.replyToName) {
    mail.setReplyTo({
      email: opts.replyToAddress,
      name: opts.replyToName,
    });
  }

  if (opts.attachments && opts.attachments.length) {
    _.each(opts.attachments, (attachment) => {
      const content = new Buffer(attachment.content).toString('base64');
      const mailAttachment = new Attachment();
      mailAttachment.setFilename(attachment.title);
      mailAttachment.setContent(content);
      mailAttachment.setType(attachment.type);
      mail.addAttachment(mailAttachment);
    });
  }

  return sgMail.send(mail);
}

module.exports = {
  getOverriddenEmail,
  overrideEmail,
  sendEmail,
};
