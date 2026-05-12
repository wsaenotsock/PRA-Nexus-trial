import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const FEEDBACK_DIR = path.join(process.cwd(), 'feedback');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function POST(req: NextRequest) {
  ensureDir(FEEDBACK_DIR);
  try {
    const body = await req.json();
    const { type, content, user } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    
    const feedbackData = {
      id,
      timestamp: now,
      type: type || 'general',
      user: user || 'anonymous',
      content: content.trim(),
      resolved: false
    };

    // Format filename safely: e.g. feedback_20260512_uuid.json
    const safeDate = now.replace(/[:.]/g, '-');
    const fileName = `feedback_${safeDate}_${id.slice(0, 8)}.json`;
    
    fs.writeFileSync(
      path.join(FEEDBACK_DIR, fileName), 
      JSON.stringify(feedbackData, null, 2)
    );

    return NextResponse.json({ success: true, id });
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
