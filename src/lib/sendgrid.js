import sendgrid from 'sendgrid';
import Promise from 'bluebird';

sendgrid.Promise = Promise;

export const sg = sendgrid(process.env.SENDGRID_API_KEY);
export const sgHelper = sendgrid.mail;

sgHelper.Email = function(email: String, name: String): Object {
  return {
    email: filterEmail(email),
    name: name,
  };
};

/**
 * if we are not in production, we will override email address to make sure we
 * never accidently send email to real users
 */
function filterEmail(email: String): String {
  if (process.env.NODE_ENV === 'production') {
    return email;
  }

  let devEmail = process.env.SENDGRID_DEV_EMAIL;
  let devEmailParts = devEmail.split('@');
  let emailParts = email.split('@');
  return devEmailParts[0] + '+' + emailParts[0] + '.at.' + emailParts[1] + '@' + devEmailParts[1];
}
