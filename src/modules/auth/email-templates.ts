export const getOtpEmailTemplate = (otp: string): string => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', serif; background-color: #F5E6D3; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 2px solid #C9A227; }
    .header { background-color: #4A90D9; padding: 30px; text-align: center; background-image: linear-gradient(135deg, #4A90D9 0%, #2D9B8A 100%); }
    .title { color: white; font-size: 28px; margin: 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); }
    .content { padding: 40px 30px; text-align: center; color: #4A3728; }
    .otp-box { background-color: #F8F9FA; border: 2px dashed #4A90D9; border-radius: 12px; padding: 20px; margin: 25px 0; display: inline-block; }
    .otp-code { font-size: 36px; font-weight: bold; color: #4A90D9; letter-spacing: 5px; font-family: monospace; }
    .footer { background-color: #F5E6D3; padding: 20px; text-align: center; font-size: 12px; color: #888; }
    .sparkle { color: #C9A227; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">✨ Pinmbo World Generator ✨</h1>
    </div>
    <div class="content">
      <h2 style="color: #6B4C9A;">Verify Your Magic Email</h2>
      <p style="font-size: 16px; line-height: 1.5;">
        You're just one step away from unlocking your profile! Use the magic code below to verify your email address.
      </p>
      
      <div class="otp-box">
        <span class="otp-code">${otp}</span>
      </div>

      <p style="font-size: 14px; opacity: 0.8;">
        This code will expire in 10 minutes. If you didn't request this, please ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Pinmbo World. All rights reserved.</p>
      <p>Making good deeds magical!</p>
    </div>
  </div>
</body>
</html>
`;
