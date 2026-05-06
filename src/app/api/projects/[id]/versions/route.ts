import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/versions — list all versions
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const versionsPath = path.join(PROJECTS_DIR, id, 'history', 'versions.json');
  if (!fs.existsSync(versionsPath)) {
    return NextResponse.json({ versions: [] });
  }
  const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
  return NextResponse.json({ versions });
}

// POST /api/projects/[id]/versions — save a new version
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const projectDir = path.join(PROJECTS_DIR, id);
  const historyDir = path.join(projectDir, 'history');
  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  try {
    const body = await req.json();
    const { message, author, model } = body;
    const now = new Date().toISOString();

    // Read existing versions
    const versionsPath = path.join(historyDir, 'versions.json');
    let versions: any[] = [];
    if (fs.existsSync(versionsPath)) {
      versions = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
    }

    const newVersion = versions.length + 1;
    const versionEntry = {
      version: newVersion,
      timestamp: now,
      author: author || 'anonymous',
      message: message || `Version ${newVersion}`,
    };

    // Save version snapshot
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
    fs.writeFileSync(path.join(historyDir, `v${newVersion}.json`), JSON.stringify({ ...versionEntry, model }, null, 2));

    // Update versions list
    versions.push(versionEntry);
    fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2));

    // Update current model
    fs.writeFileSync(path.join(projectDir, 'model.json'), JSON.stringify(model, null, 2));

    // Update meta
    const metaPath = path.join(projectDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.updatedAt = now;
      meta.currentVersion = newVersion;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }

    return NextResponse.json({ version: versionEntry });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
