import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import logger from './logger.js';

export function smtpConfigured() {
  return !!(config.smtp.host && config.smtp.user && config.smtp.pass);
}

/**
 * Send the password-reset email. Without SMTP configured, the link is logged at info
 * level outside production (never the email address) so local/dev testing still works.
 */
export async function sendPasswordResetEmail(to, link) {
  if (!smtpConfigured()) {
    if (!config.isProduction) {
      logger.info({ resetLink: link }, 'SMTP not configured - dev password reset link');
    } else {
      logger.warn('Password reset requested but SMTP is not configured; email not sent');
    }
    return false;
  }
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  await transport.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Reset your password',
    text: `Use this link within 30 minutes to reset your password:\n\n${link}\n\nIf you did not request this, ignore this email.`,
  });
  return true;
}
