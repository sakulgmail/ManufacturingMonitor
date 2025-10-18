import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const emailFrom = process.env.EMAIL_FROM || gmailUser;

  if (!gmailUser || !gmailPass) {
    throw new Error('Email configuration missing: GMAIL_USER and GMAIL_PASS environment variables are required');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const mailOptions = {
    from: emailFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email sent to ${options.to}: ${options.subject}`);
}
