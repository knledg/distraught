import { includes, reject, each } from "lodash";
import sendgrid from "sendgrid";
import bluebird from "bluebird";

const logErr = require("./logger").logErr;
const cfg = require("./config").cfg;

sendgrid.Promise = bluebird;
const sg = sendgrid(process.env.SENDGRID_API_KEY);

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
    throw new Error("Email failed to send: cfg.email.devEmail is not set");
  }
  const devEmailParts = cfg.email.devEmail.split("@");
  return `${devEmailParts[0]}+${email.replace("@", ".at.")}@${
    devEmailParts[1]
  }`;
}

/**
 * Before calling sendEmail, use this to make sure email addresses are protected on guarded environments
 * @param {String} email [address]
 */
function overrideEmail(email: string): string {
  if (!includes(cfg.email.guardedEnvironments, process.env.NODE_ENV)) {
    return email;
  }
  if (!cfg.email.devEmail) {
    throw new Error("Email failed to send: cfg.email.devEmail is not set");
  }
  return getOverriddenEmail(email);
}

type EmailPayload = {
  subject: string;
  html: string;
  fromAddress?: string;
  fromName?: string;
  toName?: string;
  toAddress?: string;
  replyToAddress?: string;
  replyToName?: string;
  contentType?: string;
  toMultiple?: Array<Object>;
  attachments?: Array<Object>;
};

/**
 * Given an email payload, send an email through Sendgrid
 * @param {Object} payload
 */
async function sendEmail(opts: EmailPayload): Promise<boolean | Object> {
  const personalization = new sendgrid.mail.Personalization();
  if (
    !(
      (opts.toMultiple && opts.toMultiple) ||
      (opts.toAddress &&
        opts.toAddress.length &&
        opts.toName &&
        opts.toName.length)
    )
  ) {
    logErr(new Error("Unable to send email, invalid options"), { opts });
    return false;
  }

  if (opts.toMultiple) {
    const validRecipients = reject(
      opts.toMultiple,
      (recipient) => !recipient.toAddress
    );
    if (!(validRecipients && validRecipients.length)) {
      logErr(new Error("Unable to send email, no valid recipient"), { opts });
      return false;
    }

    each(validRecipients, (recipient) => {
      personalization.addTo({
        email: overrideEmail(recipient.toAddress),
        name: recipient.toName,
      });
    });
  } else if (opts.toAddress && opts.toName) {
    personalization.addTo({
      email: overrideEmail(opts.toAddress),
      name: opts.toName,
    });
  }

  const mail = new sendgrid.mail.Mail();
  mail.setFrom({ email: opts.fromAddress, name: opts.fromName });
  mail.addPersonalization(personalization);
  mail.setSubject(opts.subject);
  mail.addContent(
    new sendgrid.mail.Content(opts.contentType || "text/html", opts.html)
  );

  if (opts.attachments && opts.attachments.length) {
    each(opts.attachments, (attachment) => {
      const content = new Buffer(attachment.content).toString("base64");
      const mailAttachment = new sendgrid.mail.Attachment();
      mailAttachment.setFilename(attachment.title);
      mailAttachment.setContent(content);
      mailAttachment.setType(attachment.type);
      mail.addAttachment(mailAttachment);
    });
  }

  const request = sg.emptyRequest({
    method: "POST",
    path: "/v3/mail/send",
    body: mail.toJSON(),
  });

  return sg.API(request); // eslint-disable-line new-cap
}

module.exports = {
  sg,
  sgHelper: sendgrid.mail,
  getOverriddenEmail,
  overrideEmail,
  sendEmail,
};
