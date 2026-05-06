import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/model — get current model
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const modelPath = path.join(PROJECTS_DIR, id, 'model.json');
  if (!fs.existsSync(modelPath)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  return NextResponse.json({ model });
}

// PUT /api/projects/[id]/model — update current model (autosave)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const projectDir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  try {
    const body = await req.json();
    const { model } = body;
    fs.writeFileSync(path.join(projectDir, 'model.json'), JSON.stringify(model, null, 2));
    // Update meta timestamp
    const metaPath = path.join(projectDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.updatedAt = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — delete project
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const projectDir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  try {
    fs.rmSync(projectDir, { recursive: true, force: true });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
