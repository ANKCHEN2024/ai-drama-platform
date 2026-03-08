import nodemailer from 'nodemailer';

// 邮件传输器配置
let transporter: nodemailer.Transporter | null = null;

// 初始化邮件传输器
export function initEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('⚠️  SMTP 配置不完整，邮件服务将不可用');
    console.warn('   请配置：SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // 验证配置
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP 验证失败:', error);
      transporter = null;
    } else {
      console.log('✅ SMTP 连接成功，邮件服务已启用');
    }
  });

  return transporter;
}

// 获取邮件传输器
export function getTransporter() {
  return transporter;
}

// 发送邮件
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!transporter) {
    console.warn('⚠️  邮件服务未初始化，无法发送邮件');
    return false;
  }

  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"AI 短剧平台" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ 邮件已发送至：${options.to}`);
    return true;
  } catch (error) {
    console.error('❌ 邮件发送失败:', error);
    return false;
  }
}

// 生成邮箱验证邮件内容
export function generateVerificationEmail(username: string, verificationUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = '【AI 短剧平台】验证您的邮箱地址';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #eee; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 AI 短剧平台</h1>
      <p>欢迎加入我们的创作社区</p>
    </div>
    <div class="content">
      <p>亲爱的 <strong>${username}</strong>，</p>
      <p>感谢您注册 AI 短剧平台！请点击下方按钮验证您的邮箱地址：</p>
      <p style="text-align: center;">
        <a href="${verificationUrl}" class="button">验证邮箱</a>
      </p>
      <p>或者复制以下链接到浏览器：</p>
      <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
      <p>此验证链接将在 24 小时后失效。</p>
      <p>如果您没有注册此账户，请忽略此邮件。</p>
    </div>
    <div class="footer">
      <p>© 2026 AI 短剧平台 - 西安谷风网络科技有限公司</p>
      <p>此邮件为系统自动发送，请勿回复</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
亲爱的 ${username}，

感谢您注册 AI 短剧平台！请点击以下链接验证您的邮箱地址：

${verificationUrl}

此验证链接将在 24 小时后失效。

如果您没有注册此账户，请忽略此邮件。

© 2026 AI 短剧平台 - 西安谷风网络科技有限公司
  `.trim();

  return { subject, html, text };
}

// 生成密码重置邮件内容
export function generatePasswordResetEmail(username: string, resetUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = '【AI 短剧平台】重置您的密码';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { background: #eee; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 密码重置</h1>
      <p>AI 短剧平台账户安全</p>
    </div>
    <div class="content">
      <p>亲爱的 <strong>${username}</strong>，</p>
      <p>您请求重置 AI 短剧平台的账户密码。请点击下方按钮设置新密码：</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">重置密码</a>
      </p>
      <p>或者复制以下链接到浏览器：</p>
      <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
      <div class="warning">
        <strong>⚠️ 安全提示：</strong>
        <ul>
          <li>此链接将在 1 小时后失效</li>
          <li>如果您没有请求重置密码，请立即联系我们的客服</li>
          <li>请勿将此链接分享给任何人</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 AI 短剧平台 - 西安谷风网络科技有限公司</p>
      <p>此邮件为系统自动发送，请勿回复</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
亲爱的 ${username}，

您请求重置 AI 短剧平台的账户密码。请点击以下链接设置新密码：

${resetUrl}

⚠️ 安全提示：
- 此链接将在 1 小时后失效
- 如果您没有请求重置密码，请立即联系我们的客服
- 请勿将此链接分享给任何人

© 2026 AI 短剧平台 - 西安谷风网络科技有限公司
  `.trim();

  return { subject, html, text };
}
