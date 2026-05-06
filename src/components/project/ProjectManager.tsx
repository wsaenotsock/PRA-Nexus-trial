'use client';

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useModelStore } from '@/store/modelStore';
import type { NavigationTarget, ProjectDiff } from '@/lib/types/project';
import DiffViewer from './DiffViewer';
import { applyDiffToModel } from '@/lib/diff/modelMerge';

interface ProjectManagerProps {
  locale?: 'ja' | 'en';
  onClose: () => void;
  onNavigate?: (target: NavigationTarget) => void;
}

export default function ProjectManager({ locale = 'ja', onClose, onNavigate }: ProjectManagerProps) {
  const projects = useProjectStore(s => s.projects);
  const activeProjectId = useProjectStore(s => s.activeProjectId);
  const versions = useProjectStore(s => s.versions);
  const isLoading = useProjectStore(s => s.isLoading);
  const userName = useProjectStore(s => s.userName);
  const diffResult = useProjectStore(s => s.diffResult);
  const diffVersions = useProjectStore(s => s.diffVersions);

  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const createProject = useProjectStore(s => s.createProject);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const switchProject = useProjectStore(s => s.switchProject);
  const saveVersion = useProjectStore(s => s.saveVersion);
  const loadVersion = useProjectStore(s => s.loadVersion);
  const compareVersions = useProjectStore(s => s.compareVersions);
  const clearDiff = useProjectStore(s => s.clearDiff);
  const setUserName = useProjectStore(s => s.setUserName);

  const model = useModelStore(s => s.model);
  const setModel = useModelStore(s => s.setModel);

  const [tab, setTab] = useState<'projects' | 'versions' | 'diff'>('projects');
  const [newProjectName, setNewProjectName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [editingUserName, setEditingUserName] = useState(userName);
  const [showNewForm, setShowNewForm] = useState(false);
  const [diffV1, setDiffV1] = useState<number>(0);
  const [diffV2, setDiffV2] = useState<number>(0);

  useEffect(() => { fetchProjects(); }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const id = await createProject(newProjectName.trim(), '', model);
    if (id) {
      setNewProjectName('');
      setShowNewForm(false);
      setTab('versions');
    }
  };

  const handleSwitchProject = async (id: string) => {
    const m = await switchProject(id);
    if (m) {
      setModel(m);
      setTab('versions');
    }
  };

  const handleSaveVersion = async () => {
    if (!commitMessage.trim()) return;
    await saveVersion(model, commitMessage.trim());
    setCommitMessage('');
  };

  const handleLoadVersion = async (v: number) => {
    if (!confirm(locale === 'ja' ? `バージョン ${v} をロードしますか？現在の未保存の変更は失われます。` : `Load version ${v}? Unsaved changes will be lost.`)) return;
    const m = await loadVersion(v);
    if (m) setModel(m);
  };

  const handleCompare = async () => {
    if (diffV1 && diffV2 && diffV1 !== diffV2) {
      await compareVersions(diffV1, diffV2);
      setTab('diff');
    }
  };

  const handleSaveUserName = () => {
    setUserName(editingUserName);
  };

  const handleApplyDiff = (diff: ProjectDiff, useOldValue: boolean) => {
    try {
      const currentModel = useModelStore.getState().model;
      const newModel = applyDiffToModel(currentModel, diff, useOldValue);
      useModelStore.setState({ model: newModel, isDirty: true });
      alert(locale === 'ja' ? '変更を現在のモデルに反映しました' : 'Applied changes to current model');
    } catch (e) {
      console.error('Failed to apply diff', e);
      alert(locale === 'ja' ? '変更の反映に失敗しました' : 'Failed to apply changes');
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="project-manager-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '90vw', maxWidth: 900, maxHeight: '85vh',
        background: 'var(--bg-primary)', borderRadius: 16,
        border: '1px solid var(--border-default)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>📁 {locale === 'ja' ? 'プロジェクト管理' : 'Project Manager'}</h2>
            {activeProject && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-primary)', color: 'var(--text-inverse)', fontWeight: 600 }}>{activeProject.name}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ opacity: 0.6 }}>👤</span>
              <input
                value={editingUserName}
                onChange={e => setEditingUserName(e.target.value)}
                onBlur={handleSaveUserName}
                placeholder={locale === 'ja' ? 'ニックネーム' : 'Nickname'}
                className="form-control"
                style={{ width: 120, fontSize: 12, padding: '4px 8px' }}
              />
            </div>
            <button className="btn btn--ghost" onClick={onClose} style={{ fontSize: 18, padding: '4px 8px' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: 0 }}>
          {(['projects', 'versions', 'diff'] as const).map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'tab--active' : ''}`}
              onClick={() => setTab(t)}
              disabled={t !== 'projects' && !activeProjectId}
              style={{ borderRadius: 0 }}
            >
              {{ projects: locale === 'ja' ? 'プロジェクト一覧' : 'Projects', versions: locale === 'ja' ? 'バージョン履歴' : 'Versions', diff: locale === 'ja' ? '差分比較' : 'Diff' }[t]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {isLoading && <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>⏳ Loading...</div>}

          {/* Projects Tab */}
          {tab === 'projects' && !isLoading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>{locale === 'ja' ? '保存済みプロジェクト' : 'Saved Projects'}</h3>
                <button className="btn btn--primary btn--sm" onClick={() => setShowNewForm(true)}>
                  + {locale === 'ja' ? '新規プロジェクト' : 'New Project'}
                </button>
              </div>

              {showNewForm && (
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-default)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="form-control"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder={locale === 'ja' ? 'プロジェクト名' : 'Project name'}
                    style={{ flex: 1 }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                  />
                  <button className="btn btn--primary btn--sm" onClick={handleCreateProject}>{locale === 'ja' ? '作成' : 'Create'}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowNewForm(false)}>{locale === 'ja' ? 'キャンセル' : 'Cancel'}</button>
                </div>
              )}

              {projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', border: '2px dashed var(--border-default)', borderRadius: 12 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                  <div>{locale === 'ja' ? 'プロジェクトがありません。新規作成してください。' : 'No projects. Create one to get started.'}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {projects.map(p => (
                    <div
                      key={p.id}
                      style={{
                        padding: '14px 16px',
                        background: p.id === activeProjectId ? 'var(--bg-secondary)' : 'var(--bg-canvas)',
                        borderRadius: 8,
                        border: `1px solid ${p.id === activeProjectId ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                        cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => handleSwitchProject(p.id)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {p.id === activeProjectId && <span style={{ color: 'var(--accent-primary)', marginRight: 6 }}>●</span>}
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                          v{p.currentVersion} · {locale === 'ja' ? '作成者' : 'by'}: {p.createdBy} · {new Date(p.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        className="btn btn--ghost btn--sm"
                        style={{ color: 'var(--accent-red)', opacity: 0.6, fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); if (confirm(locale === 'ja' ? '削除しますか？' : 'Delete?')) deleteProject(p.id); }}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Versions Tab */}
          {tab === 'versions' && !isLoading && activeProjectId && (
            <div>
              {/* Save new version */}
              <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid var(--border-default)' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{locale === 'ja' ? '💾 現在のモデルを保存' : '💾 Save Current Model'}</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-control"
                    value={commitMessage}
                    onChange={e => setCommitMessage(e.target.value)}
                    placeholder={locale === 'ja' ? '変更内容のメモ（例: ECCS確率を更新）' : 'Version message'}
                    style={{ flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveVersion()}
                  />
                  <button className="btn btn--primary btn--sm" onClick={handleSaveVersion} disabled={!commitMessage.trim()}>
                    {locale === 'ja' ? '保存' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Compare controls */}
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px solid var(--border-default)', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{locale === 'ja' ? '差分比較:' : 'Compare:'}</span>
                <select className="form-control" value={diffV1} onChange={e => setDiffV1(Number(e.target.value))} style={{ width: 80, fontSize: 12, padding: '4px 6px' }}>
                  <option value={0}>--</option>
                  {versions.map(v => <option key={v.version} value={v.version}>v{v.version}</option>)}
                </select>
                <span>↔</span>
                <select className="form-control" value={diffV2} onChange={e => setDiffV2(Number(e.target.value))} style={{ width: 80, fontSize: 12, padding: '4px 6px' }}>
                  <option value={0}>--</option>
                  {versions.map(v => <option key={v.version} value={v.version}>v{v.version}</option>)}
                </select>
                <button className="btn btn--sm" onClick={handleCompare} disabled={!diffV1 || !diffV2 || diffV1 === diffV2}>
                  {locale === 'ja' ? '比較' : 'Compare'}
                </button>
              </div>

              {/* Version Timeline */}
              <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>{locale === 'ja' ? '📋 バージョン履歴' : '📋 Version History'}</h4>
              {versions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, opacity: 0.5 }}>{locale === 'ja' ? 'バージョンがありません' : 'No versions'}</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  {/* Timeline line */}
                  <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: 'var(--border-default)' }} />
                  {[...versions].reverse().map((v, i) => (
                    <div key={v.version} style={{ position: 'relative', marginBottom: 12, paddingLeft: 16 }}>
                      <div style={{ position: 'absolute', left: -20, top: 8, width: 10, height: 10, borderRadius: '50%', background: i === 0 ? 'var(--accent-primary)' : 'var(--border-default)', border: '2px solid var(--bg-primary)' }} />
                      <div style={{ background: 'var(--bg-canvas)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>v{v.version}</span>
                            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>{v.message}</span>
                          </div>
                          <button className="btn btn--ghost btn--sm" style={{ fontSize: 11 }} onClick={() => handleLoadVersion(v.version)}>
                            {locale === 'ja' ? '復元' : 'Restore'}
                          </button>
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
                          👤 {v.author} · {new Date(v.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Diff Tab */}
          {tab === 'diff' && (
            <div>
              {diffResult && diffVersions ? (
                <DiffViewer 
                  diffs={diffResult} 
                  v1={diffVersions[0]} 
                  v2={diffVersions[1]} 
                  locale={locale} 
                  onNavigate={onNavigate}
                  onApplyDiff={handleApplyDiff}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
                  {locale === 'ja' ? '「バージョン履歴」タブで2つのバージョンを選択して比較してください' : 'Select two versions to compare'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
