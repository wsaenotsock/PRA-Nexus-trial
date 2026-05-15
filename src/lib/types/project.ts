// Quantica Risk — Project Management Type Definitions

import type { PRAModel } from './index';

// ===== Project Meta =====
export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  currentVersion: number;
}

// ===== Version Snapshot =====
export interface ProjectVersion {
  version: number;
  timestamp: string;
  author: string;
  message: string;
}

// ===== Diff Entry =====
export type DiffType = 'add' | 'modify' | 'delete';
export type DiffCategory = 'faultTree' | 'eventTree' | 'basicEvent' | 'parameter' | 'ccf' | 'initiatingEvent' | 'endState' | 'seismicHazard' | 'seismicFragility' | 'seismicSettings' | 'model';

export interface ProjectDiff {
  path: string;
  type: DiffType;
  category: DiffCategory;
  oldValue?: any;
  newValue?: any;
  humanLabel: string;
}

// ===== Navigation Target (for jump-to-entity from diff) =====
export interface NavigationTarget {
  view: 'editor' | 'et_editor' | 'data' | 'seismic';
  faultTreeId?: string;
  eventTreeId?: string;
  nodeId?: string;
  nodeType?: string;
  dataTab?: 'basicEvents' | 'parameters' | 'ccf' | 'initiatingEvents' | 'endStates';
  highlightId?: string; // ID of the entity to highlight in tables
}

// ===== API Response Types =====
export interface ProjectListResponse {
  projects: ProjectMeta[];
}

export interface ProjectVersionListResponse {
  versions: ProjectVersion[];
}

export interface ProjectSaveVersionRequest {
  message: string;
  author: string;
  model: PRAModel;
}
