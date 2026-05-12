import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const FEEDBACK_DIR = path.join(process.cwd(), 'feedback');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, content, user } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const now = new Date().toLocaleString('ja-JP');
    const feedbackType = {
      suggestion: '💡 機能要望',
      bug: '🐞 不具合報告',
      question: '❓ 質問',
      other: '💬 その他'
    }[type as string] || '📝 一般';

    const emailContent = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
        <h2 style="color: #2563eb; margin-top: 0;">PRA Nexus 新しい要望が届きました</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 8px; font-weight: bold; width: 120px;">送信日時</td>
            <td style="padding: 8px;">${now}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">種別</td>
            <td style="padding: 8px;">${feedbackType}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px; font-weight: bold;">送信ユーザー</td>
            <td style="padding: 8px;">${user || '不明なユーザー'}</td>
          </tr>
        </table>
        <div style="padding: 15px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; white-space: pre-wrap;">
${content}
        </div>
      </div>
    `;

    // === Cloud Dispatch (Vercel etc.) via Resend API ===
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.FEEDBACK_RECIPIENT_EMAIL || 'onboarding@resend.dev'; // Default placeholder

    if (apiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PRA-Nexus <onboarding@resend.dev>', // Or your verified domain
          to: toEmail,
          subject: `【PRA Nexus 要望】${feedbackType}`,
          html: emailContent,
        }),
      });

      if (resendRes.ok) {
        return NextResponse.json({ success: true, method: 'email' });
      } else {
        const errTxt = await resendRes.text();
        console.error('Resend API Failure:', errTxt);
        throw new Error('Failed to send via Resend API');
      }
    }

    // === Local Fallback (write to file) if API key isn't configured ===
    ensureDir(FEEDBACK_DIR);
    const id = uuidv4();
    const feedbackData = {
      id,
      timestamp: new Date().toISOString(),
      type,
      user: user || 'anonymous',
      content: content.trim(),
      resolved: false
    };
    const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `feedback_${safeDate}_${id.slice(0, 8)}.json`;
    
    fs.writeFileSync(
      path.join(FEEDBACK_DIR, fileName), 
      JSON.stringify(feedbackData, null, 2)
    );

    return NextResponse.json({ success: true, method: 'filesystem' });
  } catch (e: any) {
    console.error('Feedback API Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Provide a GET route for potential future built-in admin views or ease of query
export async function GET() {
  ensureDir(FEEDBACK_DIR);
  try {
    const files = fs.readdirSync(FEEDBACK_DIR);
    const feedbacks = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(FEEDBACK_DIR, f), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
    return NextResponse.json({ feedbacks });
  } catch (e) {
    return NextResponse.json({ feedbacks: [] });
  }
}
