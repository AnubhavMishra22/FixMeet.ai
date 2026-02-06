import { Resend } from 'resend';
import { env } from '../../config/env.js';
import type { SendEmailParams } from './email.types.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  // In development without API key, just log
  if (!resend) {
    console.log('📧 Email (dev mode):');
    console.log('  To:', params.to);
    console.log('  Subject:', params.subject);
    console.log('  ---');
    console.log(params.text || 'HTML email - check template');
    console.log('  ---');
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}
