import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// GET /api/projects — list all projects
export async function GET() {
  ensureDir(PROJECTS_DIR);
  try {
    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    const projects = entries
      .filter(e => e.isDirectory())
      .map(e => {
        const metaPath = path.join(PROJECTS_DIR, e.name, 'meta.json');
        if (fs.existsSync(metaPath)) {
          return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        }
        return null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json({ projects: [] });
  }
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  ensureDir(PROJECTS_DIR);
  try {
    const body = await req.json();
    const { name, description, author, model } = body;
    const id = uuidv4();
    const now = new Date().toISOString();
    const projectDir = path.join(PROJECTS_DIR, id);
    const historyDir = path.join(projectDir, 'history');
    ensureDir(projectDir);
    ensureDir(historyDir);

    const meta = {
      id,
      name: name || 'New Project',
      description: description || '',
      createdAt: now,
      updatedAt: now,
      createdBy: author || 'anonymous',
      currentVersion: 1,
    };

    // Save meta
    fs.writeFileSync(path.join(projectDir, 'meta.json'), JSON.stringify(meta, null, 2));

    // Save current model
    fs.writeFileSync(path.join(projectDir, 'model.json'), JSON.stringify(model, null, 2));

    // Save version 1
    const version = {
      version: 1,
      timestamp: now,
      author: author || 'anonymous',
      message: '初期バージョン',
    };
    fs.writeFileSync(path.join(historyDir, 'v1.json'), JSON.stringify({ ...version, model }, null, 2));
    fs.writeFileSync(path.join(historyDir, 'versions.json'), JSON.stringify([version], null, 2));

    return NextResponse.json({ project: meta });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
