'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { PRAModel } from '@/lib/types';
import type { ProjectMeta, ProjectVersion, ProjectDiff } from '@/lib/types/project';
import { computeModelDiff } from '@/lib/diff/modelDiff';

interface ProjectState {
  // State
  projects: ProjectMeta[];
  activeProjectId: string | null;
  versions: ProjectVersion[];
  isLoading: boolean;
  userName: string;

  // Diff state
  diffResult: ProjectDiff[] | null;
  diffVersions: [number, number] | null;

  // Actions
  setUserName: (name: string) => void;
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description: string, model: PRAModel) => Promise<string | null>;
  deleteProject: (id: string) => Promise<void>;
  switchProject: (id: string) => Promise<PRAModel | null>;
  saveVersion: (model: PRAModel, message: string) => Promise<void>;
  loadVersion: (version: number) => Promise<PRAModel | null>;
  compareVersions: (v1: number, v2: number) => Promise<void>;
  clearDiff: () => void;
}

const API_BASE = '/api/projects';

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  versions: [],
  isLoading: false,
  userName: typeof window !== 'undefined' ? localStorage.getItem('quantica-risk-username') || '' : '',
  diffResult: null,
  diffVersions: null,

  setUserName: (name) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quantica-risk-username', name);
    }
    set({ userName: name });
  },

  fetchProjects: async () => {
    if (typeof window === 'undefined') return;
    set({ isLoading: true });
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        set({ projects: data.projects });
        localStorage.setItem('pra_projects_meta', JSON.stringify(data.projects));
        set({ isLoading: false });
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch projects from server, falling back to localStorage:', e);
    }
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('pra_projects_meta');
      const projects = stored ? JSON.parse(stored) : [];
      set({ projects });
    } catch (e) {
      console.error('Failed to fetch projects from localStorage:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (name, description, model) => {
    if (typeof window === 'undefined') return null;
    const { userName } = get();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, author: userName || 'anonymous', model })
      });
      if (res.ok) {
        const data = await res.json();
        const serverProject = data.project;
        
        // Save to localStorage as cache
        const stored = localStorage.getItem('pra_projects_meta');
        const projects: ProjectMeta[] = stored ? JSON.parse(stored) : [];
        projects.unshift(serverProject);
        localStorage.setItem('pra_projects_meta', JSON.stringify(projects));
        localStorage.setItem(`pra_project_model_${serverProject.id}`, JSON.stringify(model));
        
        const initialVersion: ProjectVersion = {
          version: 1,
          timestamp: serverProject.createdAt,
          author: userName || 'anonymous',
          message: '初期バージョン',
        };
        localStorage.setItem(`pra_project_versions_${serverProject.id}`, JSON.stringify([initialVersion]));
        localStorage.setItem(`pra_project_version_${serverProject.id}_1`, JSON.stringify(model));

        await get().fetchProjects();
        set({ activeProjectId: serverProject.id });
        return serverProject.id;
      }
    } catch (e) {
      console.warn('Failed to create project on server, falling back to local only:', e);
    }
    
    // Fallback to purely local creation if server is unreachable
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const newProject: ProjectMeta = {
        id,
        name: name || 'New Project',
        description: description || '',
        createdAt: now,
        updatedAt: now,
        createdBy: userName || 'anonymous',
        currentVersion: 1,
      };

      const stored = localStorage.getItem('pra_projects_meta');
      const projects: ProjectMeta[] = stored ? JSON.parse(stored) : [];
      projects.unshift(newProject);
      localStorage.setItem('pra_projects_meta', JSON.stringify(projects));

      localStorage.setItem(`pra_project_model_${id}`, JSON.stringify(model));

      const initialVersion: ProjectVersion = {
        version: 1,
        timestamp: now,
        author: userName || 'anonymous',
        message: '初期バージョン',
      };
      localStorage.setItem(`pra_project_versions_${id}`, JSON.stringify([initialVersion]));
      localStorage.setItem(`pra_project_version_${id}_1`, JSON.stringify(model));

      await get().fetchProjects();
      set({ activeProjectId: id });
      return id;
    } catch (e) {
      console.error('Failed to create project locally:', e);
    }
    return null;
  },

  deleteProject: async (id) => {
    if (typeof window === 'undefined') return;
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed to delete project on server:', e);
    }

    try {
      // Remove from metadata list
      const stored = localStorage.getItem('pra_projects_meta');
      if (stored) {
        const projects: ProjectMeta[] = JSON.parse(stored);
        const filtered = projects.filter(p => p.id !== id);
        localStorage.setItem('pra_projects_meta', JSON.stringify(filtered));
      }

      // Clean up project details
      localStorage.removeItem(`pra_project_model_${id}`);
      localStorage.removeItem(`pra_project_versions_${id}`);
      
      // Clean up version history (up to a reasonable limit, e.g., 50 versions)
      for (let v = 1; v <= 50; v++) {
        localStorage.removeItem(`pra_project_version_${id}_${v}`);
      }

      const { activeProjectId } = get();
      if (activeProjectId === id) {
        set({ activeProjectId: null, versions: [] });
      }
      await get().fetchProjects();
    } catch (e) {
      console.error('Failed to delete project from localStorage:', e);
    }
  },

  switchProject: async (id) => {
    if (typeof window === 'undefined') return null;
    set({ isLoading: true, activeProjectId: id, diffResult: null, diffVersions: null });
    try {
      // 1. Try to fetch versions from server
      const versionsRes = await fetch(`/api/projects/${id}/versions`);
      if (versionsRes.ok) {
        const versionsData = await versionsRes.json();
        set({ versions: versionsData.versions });
        localStorage.setItem(`pra_project_versions_${id}`, JSON.stringify(versionsData.versions));
      }
      
      // 2. Try to fetch latest model from server
      const modelRes = await fetch(`/api/projects/${id}`);
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        localStorage.setItem(`pra_project_model_${id}`, JSON.stringify(modelData.model));
        set({ isLoading: false });
        return modelData.model;
      }
    } catch (e) {
      console.warn('Failed to switch project on server, falling back to localStorage:', e);
    }

    // Fallback to local
    try {
      const storedVersions = localStorage.getItem(`pra_project_versions_${id}`);
      const versions: ProjectVersion[] = storedVersions ? JSON.parse(storedVersions) : [];
      set({ versions });

      const storedModel = localStorage.getItem(`pra_project_model_${id}`);
      if (storedModel) {
        set({ isLoading: false });
        return JSON.parse(storedModel) as PRAModel;
      }
    } catch (e) {
      console.error('Failed to switch project in localStorage:', e);
    }
    set({ isLoading: false });
    return null;
  },

  saveVersion: async (model, message) => {
    if (typeof window === 'undefined') return;
    const { activeProjectId, userName } = get();
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, author: userName || 'anonymous', model })
      });
      if (res.ok) {
        const data = await res.json();
        const versionsRes = await fetch(`/api/projects/${activeProjectId}/versions`);
        if (versionsRes.ok) {
          const versionsData = await versionsRes.json();
          set({ versions: versionsData.versions });
          localStorage.setItem(`pra_project_versions_${activeProjectId}`, JSON.stringify(versionsData.versions));
        }
        localStorage.setItem(`pra_project_model_${activeProjectId}`, JSON.stringify(model));
        
        const newVersionNum = data.version.version;
        localStorage.setItem(`pra_project_version_${activeProjectId}_${newVersionNum}`, JSON.stringify(model));
        
        await get().fetchProjects();
        return;
      }
    } catch (e) {
      console.warn('Failed to save version on server, falling back to local:', e);
    }

    // Local fallback
    try {
      const now = new Date().toISOString();
      const storedVersions = localStorage.getItem(`pra_project_versions_${activeProjectId}`);
      const versions: ProjectVersion[] = storedVersions ? JSON.parse(storedVersions) : [];
      
      const newVersionNum = versions.length + 1;
      const newVersion: ProjectVersion = {
        version: newVersionNum,
        timestamp: now,
        author: userName || 'anonymous',
        message: message || `バージョン ${newVersionNum}`,
      };
      
      versions.unshift(newVersion);
      localStorage.setItem(`pra_project_versions_${activeProjectId}`, JSON.stringify(versions));
      localStorage.setItem(`pra_project_model_${activeProjectId}`, JSON.stringify(model));
      localStorage.setItem(`pra_project_version_${activeProjectId}_${newVersionNum}`, JSON.stringify(model));

      // Update project metadata updated time & current version
      const storedProjects = localStorage.getItem('pra_projects_meta');
      if (storedProjects) {
        const projects: ProjectMeta[] = JSON.parse(storedProjects);
        const updated = projects.map(p => {
          if (p.id === activeProjectId) {
            return { ...p, updatedAt: now, currentVersion: newVersionNum };
          }
          return p;
        });
        localStorage.setItem('pra_projects_meta', JSON.stringify(updated));
      }

      set({ versions });
      await get().fetchProjects();
    } catch (e) {
      console.error('Failed to save version in localStorage:', e);
    }
  },

  loadVersion: async (version) => {
    if (typeof window === 'undefined') return null;
    const { activeProjectId } = get();
    if (!activeProjectId) return null;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/versions/${version}`);
      if (res.ok) {
        const data = await res.json();
        return data.model as PRAModel;
      }
    } catch (e) {
      console.warn('Failed to load version from server, falling back to local:', e);
    }

    // Local fallback
    try {
      const storedModel = localStorage.getItem(`pra_project_version_${activeProjectId}_${version}`);
      if (storedModel) {
        return JSON.parse(storedModel) as PRAModel;
      }
    } catch (e) {
      console.error('Failed to load version from localStorage:', e);
    }
    return null;
  },

  compareVersions: async (v1, v2) => {
    if (typeof window === 'undefined') return;
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    set({ isLoading: true });
    try {
      let m1: PRAModel | null = null;
      let m2: PRAModel | null = null;

      const res1 = await fetch(`/api/projects/${activeProjectId}/versions/${v1}`);
      const res2 = await fetch(`/api/projects/${activeProjectId}/versions/${v2}`);
      if (res1.ok && res2.ok) {
        const d1 = await res1.json();
        const d2 = await res2.json();
        m1 = d1.model;
        m2 = d2.model;
      } else {
        const stored1 = localStorage.getItem(`pra_project_version_${activeProjectId}_${v1}`);
        const stored2 = localStorage.getItem(`pra_project_version_${activeProjectId}_${v2}`);
        if (stored1 && stored2) {
          m1 = JSON.parse(stored1);
          m2 = JSON.parse(stored2);
        }
      }

      if (m1 && m2) {
        const diffs = computeModelDiff(m1, m2);
        set({ diffResult: diffs, diffVersions: [v1, v2] });
      }
    } catch (e) {
      console.error('Failed to compare versions:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  clearDiff: () => set({ diffResult: null, diffVersions: null }),
}));
