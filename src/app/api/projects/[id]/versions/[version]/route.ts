import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

type RouteParams = { params: Promise<{ id: string; version: string }> };

// GET /api/projects/[id]/versions/[version] — get a specific version's model
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id, version } = await params;
  const versionPath = path.join(PROJECTS_DIR, id, 'history', `v${version}.json`);
  if (!fs.existsSync(versionPath)) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }
  const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
  return NextResponse.json({ model: data.model, version: data.version, timestamp: data.timestamp, author: data.author, message: data.message });
}
