/* @flow */

const nodemailer = require('nodemailer');

const transports = {};

const addEmailTransport = function addEmailTransport(name: string, cfg: any) {
  transports[name] = nodemailer.createTransport(cfg);
};

const sendEmail = function sendEmail(transport: string, mailOptions: any) {
  return transports[transport].sendMail(mailOptions);
};

module.exports = {
  addEmailTransport,
  sendEmail,
};
