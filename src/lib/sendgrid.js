/* @flow */
const sendgrid = require('sendgrid');
const bluebird = require('bluebird');

sendgrid.Promise = bluebird;

module.exports = {
  sg: sendgrid(process.env.SENDGRID_API_KEY),
  sgHelper: sendgrid.mail,
};
