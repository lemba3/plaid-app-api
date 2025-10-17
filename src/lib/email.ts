
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: Number(process.env.EMAIL_SERVER_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const options = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(options);
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Could not send email');
  }
}
