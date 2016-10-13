/* @flow */

// $FlowBug: Sendgrid has a default export
import sendgrid from 'sendgrid';
import Promise from 'bluebird';

sendgrid.Promise = Promise;

export const sg = sendgrid(process.env.SENDGRID_API_KEY);
export const sgHelper = sendgrid.mail;
