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
    return NextResponse.json({ error: 'Model not found' }, { status: 404 });
  }
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  return NextResponse.json({ model });
}
