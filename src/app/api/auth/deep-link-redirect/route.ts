
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Token is required', { status: 400 });
  }

  const deepLink = `purui://reset-password?token=${token}`;

  // This HTML page will attempt to redirect to the deep link.
  // If the app is not installed, the user will see a message.
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="0; url=${deepLink}" />
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          h1 { color: #333; }
          p { color: #666; }
          .fallback { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Redirecting you to the app...</h1>
        <p>If you are not automatically redirected, please click the link below:</p>
        <a href="${deepLink}">Open in App</a>
        <div class="fallback">
          <p>If the app is not installed, please install it to continue.</p>
        </div>
        <script>
          // Fallback for when the meta refresh fails
          setTimeout(function() {
            window.location.href = "${deepLink}";
          }, 500);
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
