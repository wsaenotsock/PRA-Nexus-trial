'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as d3 from 'd3';
import type { PRAModel, BasicEvent, HouseEvent, Gate, FaultTree, EndState, Parameter, CCFGroup, InitiatingEvent, EventTree, Sequence, FunctionalEvent, Branch, GateType, GlobalQuantificationSettings, SeismicSettings, SeismicHazardCurve, SeismicFragility } from '@/lib/types';

// ===== Default Sample Model =====
function createDefaultModel(): PRAModel {
  const beECCS = uuidv4();
  const beRHR = uuidv4();
  const beDG = uuidv4();
  const beValve = uuidv4();
  const beHPI = uuidv4();
  const beLPI = uuidv4();

  const gateTop = uuidv4();
  const gateECCSFail = uuidv4();
  const gatePowerFail = uuidv4();

  const basicEvents: BasicEvent[] = [
    { id: beECCS, name: 'ECCS-PUMP-FAIL', tags: ['ECCS', 'ポンプ'], failureRate: 3e-5, repairTime: 24, probability: 7.2e-4, missionTime: 24, distribution: { type: 'lognormal', mean: 3e-5, errorFactor: 3 }, source: 'NUREG/CR-6928', memo: 'ECCSポンプ起動失敗' },
    { id: beRHR, name: 'RHR-PUMP-FAIL', tags: ['RHR', 'ポンプ'], failureRate: 1e-5, repairTime: 48, probability: 2.4e-4, missionTime: 24, distribution: { type: 'lognormal', mean: 1e-5, errorFactor: 5 }, source: 'NUREG/CR-6928', memo: 'RHRポンプ運転中故障' },
    { id: beDG, name: 'DG-FAIL-START', tags: ['電源', 'DG'], failureRate: 3e-2, probability: 3e-2, distribution: { type: 'lognormal', mean: 3e-2, errorFactor: 3 }, source: 'NUREG/CR-6928', memo: 'ディーゼル発電機起動失敗' },
    { id: beValve, name: 'MOV-TRANSFER-FAIL', tags: ['弁', 'MOV'], failureRate: 5e-4, probability: 5e-4, distribution: { type: 'lognormal', mean: 5e-4, errorFactor: 5 }, source: 'NUREG/CR-6928', memo: '電動弁開放失敗' },
    { id: beHPI, name: 'HPI-TRAIN-FAIL', tags: ['HPI', '注入'], failureRate: 2e-4, probability: 2e-4, distribution: { type: 'lognormal', mean: 2e-4, errorFactor: 3 }, source: 'NUREG/CR-6928', memo: '高圧注入系トレイン故障' },
    { id: beLPI, name: 'LPI-TRAIN-FAIL', tags: ['LPI', '注入'], failureRate: 1e-4, probability: 1e-4, distribution: { type: 'lognormal', mean: 1e-4, errorFactor: 3 }, source: 'NUREG/CR-6928', memo: '低圧注入系トレイン故障' },
  ];

  const gates: Gate[] = [
    { id: gateTop, name: 'ECCS注入失敗', type: 'AND', children: [gateECCSFail, gatePowerFail], position: { x: 400, y: 0 } },
    { id: gateECCSFail, name: 'ECCS機器故障', type: 'OR', children: [beECCS, beValve, beHPI], position: { x: 200, y: 200 } },
    { id: gatePowerFail, name: '電源喪失', type: 'OR', children: [beDG, beLPI], position: { x: 600, y: 200 } },
  ];

  const faultTree: FaultTree = {
    id: uuidv4(),
    name: 'ECCS注入失敗 FT',
    topGateId: gateTop,
    gates,
  };

  const endStates: EndState[] = [
    { id: uuidv4(), name: 'OK', categories: ['success'], description: '正常', color: '#00D68F' },
    { id: uuidv4(), name: 'TQUX', categories: ['core_damage'], description: '過渡事象+給水喪失+高圧注入失敗+減圧失敗', color: '#FF4757' },
    { id: uuidv4(), name: 'TQUV', categories: ['core_damage'], description: '過渡事象+給水喪失+高圧注入成功+格納容器冷却失敗', color: '#FF6B81' },
    { id: uuidv4(), name: 'SBO-CD', categories: ['core_damage'], description: '全電源喪失→炉心損傷', color: '#FFA502' },
  ];

  return {
    id: uuidv4(),
    name: 'サンプルPRAモデル',
    description: 'ECCS注入失敗を対象としたサンプルFault Tree',
    version: 1,
    locale: 'ja',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    faultTrees: [faultTree],
    eventTrees: [],
    basicEvents,
    parameters: [],
    houseEvents: [],
    ccfGroups: [],
    initiatingEvents: [],
    endStates: [],
    seismicHazards: [],
    seismicFragilities: [],
      seismicSettings: {
        hazardCurveId: '',
        selectedETIds: [],
        minPGA: 0.05,
        maxPGA: 2.0,
        intervals: 20,
        uncertaintyEnabled: false,
        samples: 1000
      },
      quantificationSettings: {
        cutOff: 1e-9,
        approximation: 'bdd_exact',
        monteCarloSamples: 10000,
        useLHS: true,
        runUncertainty: false
      }
  };
}

// ===== Store Interface =====
interface ModelState {
  model: PRAModel;
  selectedFaultTreeId: string | null;
  selectedEventTreeId: string | null;
  isDirty: boolean;
  past: PRAModel[];
  future: PRAModel[];

  // Actions
  setModel: (model: PRAModel) => void;
  selectFaultTree: (id: string | null) => void;
  selectEventTree: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  updateBasicEvent: (event: BasicEvent) => void;
  addBasicEvent: (event: BasicEvent) => void;
  removeBasicEvent: (id: string) => void;
  addParameter: (param: Parameter) => void;
  updateParameter: (param: Parameter) => void;
  removeParameter: (id: string) => void;
  addCCFGroup: (group: CCFGroup) => void;
  updateCCFGroup: (group: CCFGroup) => void;
  removeCCFGroup: (id: string) => void;
  addGate: (faultTreeId: string, gate: Gate) => void;
  updateGate: (faultTreeId: string, gate: Gate) => void;
  removeGate: (faultTreeId: string, gateId: string) => void;
  addEndState: (endState: EndState) => void;
  updateEndState: (endState: EndState) => void;
  removeEndState: (id: string) => void;
  toggleGateCollapse: (faultTreeId: string, gateId: string) => void;
  autoLayout: (faultTreeId: string) => void;
  addFaultTree: (name: string) => void;
  removeFaultTree: (id: string) => void;
  updateFaultTree: (id: string, updates: Partial<FaultTree>) => void;
  addEventTree: (name: string, initiatingEventId: string) => void;
  removeEventTree: (id: string) => void;
  updateEventTree: (id: string, updates: Partial<EventTree>) => void;
  addFunctionalEvent: (eventTreeId: string, event: FunctionalEvent, index?: number) => void;
  updateFunctionalEvent: (eventTreeId: string, eventId: string, updates: Partial<FunctionalEvent>) => void;
  removeFunctionalEvent: (eventTreeId: string, eventId: string) => void;
  branchSequence: (eventTreeId: string, sequenceId: string, functionalEventId: string) => void;
  unbranchSequence: (eventTreeId: string, sequenceId: string, functionalEventId: string) => void;
  updateSequence: (eventTreeId: string, sequenceId: string, updates: Partial<Sequence>) => void;
  updateInitiatingEvent: (id: string, updates: Partial<InitiatingEvent>) => void;
  addChildToGate: (faultTreeId: string, gateId: string, childId: string) => void;
  removeChildFromGate: (faultTreeId: string, gateId: string, childId: string) => void;
  addSeismicHazard: (hazard: SeismicHazardCurve) => void;
  updateSeismicHazard: (hazard: SeismicHazardCurve) => void;
  removeSeismicHazard: (id: string) => void;
  addSeismicFragility: (fragility: SeismicFragility) => void;
  updateSeismicFragility: (fragility: SeismicFragility) => void;
  removeSeismicFragility: (id: string) => void;
  updateSeismicSettings: (settings: Partial<SeismicSettings>) => void;
  updateQuantificationSettings: (settings: Partial<GlobalQuantificationSettings>) => void;
  moveGateChild: (faultTreeId: string, gateId: string, childId: string, direction: 'left' | 'right') => void;
  pushHistory: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  convertToSubtree: (faultTreeId: string, gateId: string) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  model: createDefaultModel(),
  selectedFaultTreeId: null,
  selectedEventTreeId: null,
  isDirty: false,
  past: [],
  future: [],

  setModel: (model) => set({ model, isDirty: false, past: [], future: [] }),

  selectFaultTree: (id) => set({ selectedFaultTreeId: id }),
  selectEventTree: (id) => set({ selectedEventTreeId: id }),

  // History Helper
  pushHistory: () => {
    const { model, past } = get();
    // Keep last 50 states
    const newPast = [...past, JSON.parse(JSON.stringify(model))].slice(-50);
    set({ past: newPast, future: [] });
  },

  undo: () => {
    const { model, past, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    set({
      model: previous,
      past: newPast,
      future: [JSON.parse(JSON.stringify(model)), ...future].slice(0, 50),
      isDirty: true
    });
  },

  redo: () => {
    const { model, past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      model: next,
      past: [...past, JSON.parse(JSON.stringify(model))].slice(-50),
      future: newFuture,
      isDirty: true
    });
  },

  updateBasicEvent: (event) => {
    get().pushHistory();
    
    const isForceSync = (event as any).__force_sync_others__ !== false;
    
    const cleanEvent = { ...event };
    delete (cleanEvent as any).__force_sync_others__;

    set((state) => {
      const basicEvents = state.model.basicEvents.map((e) => {
        if (e.id === cleanEvent.id) {
          return cleanEvent;
        }
        if (isForceSync && cleanEvent.eventId && e.eventId === cleanEvent.eventId) {
          return {
            ...e,
            name: cleanEvent.name,
            tags: cleanEvent.tags,
            failureType: cleanEvent.failureType,
            failureRate: cleanEvent.failureRate,
            repairTime: cleanEvent.repairTime,
            probability: cleanEvent.probability,
            missionTime: cleanEvent.missionTime,
            demands: cleanEvent.demands,
            distribution: JSON.parse(JSON.stringify(cleanEvent.distribution)),
            parameterId: cleanEvent.parameterId,
            source: cleanEvent.source,
            memo: cleanEvent.memo,
            seismicFragilityId: cleanEvent.seismicFragilityId,
          };
        }
        return e;
      });

      return {
        model: {
          ...state.model,
          basicEvents,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true
      };
    });
  },



  addBasicEvent: (event) => {
    get().pushHistory();
    set((state) => {
      return {
        model: {
          ...state.model,
          basicEvents: [...state.model.basicEvents, event],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  removeBasicEvent: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        basicEvents: state.model.basicEvents.filter((e) => e.id !== id),
        // Clean up references in all gates across all fault trees
        faultTrees: state.model.faultTrees.map((ft) => ({
          ...ft,
          gates: ft.gates.map((g) => ({
            ...g,
            children: g.children.filter(cid => cid !== id)
          }))
        })),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addParameter: (param) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        parameters: [...state.model.parameters, param],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateParameter: (param) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        parameters: state.model.parameters.map((p) => p.id === param.id ? param : p),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeParameter: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        parameters: state.model.parameters.filter((p) => p.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addCCFGroup: (group) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        ccfGroups: [...state.model.ccfGroups, group],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateCCFGroup: (group) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        ccfGroups: state.model.ccfGroups.map((g) => g.id === group.id ? group : g),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeCCFGroup: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        ccfGroups: state.model.ccfGroups.filter((g) => g.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addGate: (faultTreeId, gate) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId ? { ...ft, gates: [...ft.gates, gate] } : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateGate: (faultTreeId, gate) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? { ...ft, gates: ft.gates.map((g) => g.id === gate.id ? gate : g) }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeGate: (faultTreeId, gateId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) => ({
          ...ft,
          // Remove the gate itself if it's in this FT
          gates: ft.gates
            .filter((g) => g.id !== gateId)
            // Also remove any references to this gate from other gates' children
            .map((g) => ({
              ...g,
              children: g.children.filter(cid => cid !== gateId)
            }))
        })),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addEndState: (endState) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        endStates: [...state.model.endStates, endState],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateEndState: (endState) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        endStates: state.model.endStates.map((e) => e.id === endState.id ? endState : e),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeEndState: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        endStates: state.model.endStates.filter((e) => e.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  toggleGateCollapse: (faultTreeId, gateId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? {
              ...ft,
              gates: ft.gates.map((g) =>
                g.id === gateId ? { ...g, collapsed: !g.collapsed } : g
              ),
            }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addChildToGate: (faultTreeId, gateId, childId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? {
              ...ft,
              gates: ft.gates.map((g) =>
                g.id === gateId
                  ? { ...g, children: [...new Set([...g.children, childId])] }
                  : g
              ),
            }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeChildFromGate: (faultTreeId, gateId, childId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? {
              ...ft,
              gates: ft.gates.map((g) =>
                g.id === gateId
                  ? { ...g, children: g.children.filter(id => id !== childId) }
                  : g
              ),
            }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  autoLayout: (faultTreeId) => {
    get().pushHistory();
    const { model } = get();
    const ft = model.faultTrees.find(f => f.id === faultTreeId);
    if (!ft) return;

    // Use d3-hierarchy for tree layout
    // We treat it as a tree starting from topGateId
    // If a node is shared, it will appear multiple times in the hierarchy but we only update its position once (or use the last one)

    const nodesMap = new Map<string, any>();
    ft.gates.forEach(g => nodesMap.set(g.id, { ...g, type: 'gate' }));
    model.basicEvents.forEach(be => nodesMap.set(be.id, { ...be, type: 'basicEvent' }));

    const buildHierarchy = (id: string) => {
      const node = nodesMap.get(id);
      if (!node) return null;
      const childrenIds = node.type === 'gate' ? node.children : [];
      return {
        id: node.id,
        name: node.name,
        children: childrenIds.map((childId: string) => buildHierarchy(childId)).filter(Boolean)
      };
    };

    const rootData = buildHierarchy(ft.topGateId);
    if (!rootData) return;

    const root = d3.hierarchy(rootData);

    // Layout settings
    const nodeWidth = 240;
    const nodeHeight = 200;
    const treeLayout = d3.tree<any>().nodeSize([nodeWidth, nodeHeight]);
    treeLayout(root);

    const newPositions = new Map<string, { x: number, y: number }>();
    root.descendants().forEach((d: any) => {
      newPositions.set(d.data.id, { x: d.x + 400, y: d.y + 50 });
    });

    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((f) =>
          f.id === faultTreeId
            ? {
              ...f,
              gates: f.gates.map((g) => ({
                ...g,
                position: newPositions.get(g.id) || g.position
              }))
            }
            : f
        ),
        basicEvents: state.model.basicEvents.map((be) => ({
          ...be,
          position: newPositions.get(be.id) || (be as any).position || { x: 0, y: 0 }
        })),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addFaultTree: (name) => {
    get().pushHistory();
    const { model } = get();
    const newFTId = uuidv4();
    const topGateId = uuidv4();

    // Ensure unique name
    let uniqueName = name;
    let counter = 1;
    const existingNames = new Set(model.faultTrees?.map(ft => ft.name) || []);
    while (existingNames.has(uniqueName)) {
      uniqueName = `${name} (${counter++})`;
    }

    const newFT: FaultTree = {
      id: newFTId,
      name: uniqueName,
      topGateId,
      gates: [
        {
          id: topGateId,
          name: 'TOP EVENT',
          type: 'OR',
          children: [],
          position: { x: 400, y: 50 }
        }
      ]
    };
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: [...(state.model.faultTrees || []), newFT],
        updatedAt: new Date().toISOString(),
      },
      selectedFaultTreeId: newFTId,
      isDirty: true,
    }));
  },

  removeFaultTree: (id) => {
    get().pushHistory();
    set((state) => {
      const newFTs = (state.model.faultTrees || []).filter(ft => ft.id !== id);
      return {
        model: {
          ...state.model,
          faultTrees: newFTs,
          updatedAt: new Date().toISOString(),
        },
        selectedFaultTreeId: state.selectedFaultTreeId === id ? (newFTs[0]?.id || null) : state.selectedFaultTreeId,
        isDirty: true,
      };
    });
  },

  updateFaultTree: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: (state.model.faultTrees || []).map(ft => ft.id === id ? { ...ft, ...updates } : ft),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addEventTree: (name, initiatingEventId) => {
    get().pushHistory();
    const { model } = get();
    const newETId = uuidv4();

    let uniqueName = name;
    let counter = 1;
    const existingNames = new Set(model.eventTrees?.map(et => et.name) || []);
    while (existingNames.has(uniqueName)) {
      uniqueName = `${name} (${counter++})`;
    }

    const newET: EventTree = {
      id: newETId,
      name: uniqueName,
      initiatingEventId,
      functionalEvents: [],
      sequences: [
        {
          id: uuidv4(),
          path: [],
          endStateId: model.endStates?.[0]?.id || ''
        }
      ]
    };

    set((state) => ({
      model: {
        ...state.model,
        eventTrees: [...(state.model.eventTrees || []), newET],
        updatedAt: new Date().toISOString(),
      },
      selectedEventTreeId: newETId,
      isDirty: true,
    }));
  },

  removeEventTree: (id) => {
    get().pushHistory();
    set((state) => {
      const remaining = state.model.eventTrees?.filter((et) => et.id !== id) || [];
      return {
        model: {
          ...state.model,
          eventTrees: remaining,
          updatedAt: new Date().toISOString(),
        },
        selectedEventTreeId: state.selectedEventTreeId === id
          ? (remaining.length > 0 ? remaining[0].id : null)
          : state.selectedEventTreeId,
        isDirty: true,
      };
    });
  },

  updateEventTree: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        eventTrees: (state.model.eventTrees || []).map((et) =>
          et.id === id ? { ...et, ...updates } : et
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addFunctionalEvent: (etId, event, index) => {
    get().pushHistory();
    set((state) => {
      const ets = state.model.eventTrees || [];
      const newEts = ets.map((et) => {
        if (et.id === etId) {
          const newFEList = [...et.functionalEvents];
          const newFE = {
            ...event,
            code: event.code || event.name.slice(0, 3).toUpperCase()
          };
          if (typeof index === 'number') {
            newFEList.splice(index, 0, newFE);
          } else {
            newFEList.push(newFE);
          }
          return { ...et, functionalEvents: newFEList };
        }
        return et;
      });
      return {
        model: { ...state.model, eventTrees: newEts, updatedAt: new Date().toISOString() },
        isDirty: true,
      };
    });
  },

  updateFunctionalEvent: (eventTreeId, eventId, updates) => {
    get().pushHistory();
    set((state) => {
      const et = state.model.eventTrees?.find(e => e.id === eventTreeId);
      if (!et) return state;

      const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
      const ieCode = ie?.code || 'IE';

      const updatedETs = (state.model.eventTrees || []).map((e) => {
        if (e.id !== eventTreeId) return e;

        const updatedFEs = e.functionalEvents.map((fe) =>
          fe.id === eventId ? { ...fe, ...updates } : fe
        );

        const newET = { ...e, functionalEvents: updatedFEs };

        // Renumber if code/name changed
        if (updates.code || updates.name) {
          newET.sequences = newET.sequences.map((seq, index) => ({
            ...seq,
            name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
          }));
        }

        return newET;
      });

      return {
        model: {
          ...state.model,
          eventTrees: updatedETs,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  removeFunctionalEvent: (eventTreeId, eventId) => {
    get().pushHistory();
    set((state) => {
      return {
        model: {
          ...state.model,
          eventTrees: (state.model.eventTrees || []).map((et) => {
            if (et.id !== eventTreeId) return et;

            // Remove the FE
            const newFEs = et.functionalEvents.filter(fe => fe.id !== eventId);

            // 1. Remove the FE decisions
            const filteredSequences = et.sequences.map(seq => ({
              ...seq,
              path: seq.path.filter(p => p.functionalEventId !== eventId)
            }));

            // 2. Merge duplicate sequences (sequences with same path)
            // We keep the first one found for each unique path
            const seenPaths = new Set<string>();
            const mergedSequences: Sequence[] = [];

            filteredSequences.forEach(seq => {
              const pathKey = seq.path.map(p => `${p.functionalEventId}:${p.branchId}`).join('|');
              if (!seenPaths.has(pathKey)) {
                seenPaths.add(pathKey);
                mergedSequences.push(seq);
              }
            });

            // 3. Renumber sequences
            const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
            const ieCode = ie?.code || 'IE';
            const finalSequences = mergedSequences.map((seq, index) => ({
              ...seq,
              name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
            }));

            return {
              ...et,
              functionalEvents: newFEs,
              sequences: finalSequences
            };
          }),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  branchSequence: (eventTreeId, sequenceId, functionalEventId) => {
    get().pushHistory();
    set((state) => {
      const et = state.model.eventTrees?.find(e => e.id === eventTreeId);
      if (!et) return state;

      const fe = et.functionalEvents.find(f => f.id === functionalEventId);
      if (!fe || fe.branches.length === 0) return state;

      const seqIndex = et.sequences.findIndex(s => s.id === sequenceId);
      if (seqIndex === -1) return state;

      const originalSeq = et.sequences[seqIndex];

      // Create new sequences for each branch
      const newSequences = fe.branches.map(branch => ({
        id: uuidv4(),
        path: [...originalSeq.path, { functionalEventId, branchId: branch.id }],
        endStateId: originalSeq.endStateId
      }));

      const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
      const ieCode = ie?.code || 'IE';

      const updatedSequences = [...et.sequences];
      // Replace the original sequence with the new ones
      updatedSequences.splice(seqIndex, 1, ...newSequences);

      // Renumber all sequences in this ET
      const seenPaths = new Set<string>();
      const mergedSequences: Sequence[] = [];

      updatedSequences.forEach(seq => {
        const pathKey = seq.path.map(p => `${p.functionalEventId}:${p.branchId}`).join('|');
        if (!seenPaths.has(pathKey)) {
          seenPaths.add(pathKey);
          mergedSequences.push(seq);
        }
      });

      const renumberedSequences = mergedSequences.map((seq, index) => ({
        ...seq,
        name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
      }));

      return {
        model: {
          ...state.model,
          eventTrees: state.model.eventTrees?.map(e =>
            e.id === eventTreeId ? { ...e, sequences: renumberedSequences } : e
          ) || [],
          updatedAt: new Date().toISOString()
        },
        isDirty: true
      };
    });
  },

  unbranchSequence: (eventTreeId, sequenceId, functionalEventId) => {
    get().pushHistory();
    set((state) => {
      const et = state.model.eventTrees?.find(e => e.id === eventTreeId);
      if (!et) return state;

      const targetSeq = et.sequences.find(s => s.id === sequenceId);
      if (!targetSeq) return state;

      // Find the path prefix up to the unbranching point
      const pathPrefix = targetSeq.path.filter(p => p.functionalEventId !== functionalEventId);

      // We need to find all sequences that share the exact same path prefix and remove them,
      // replacing them with a single sequence that bypasses this functionalEventId.
      // But wait, the sequences we want to merge might have branched *further* down!
      // Unbranching means we remove the branch decision at `functionalEventId` and ALL subsequent decisions for these sequences.
      // Actually, standard behavior: unbranching deletes all downstream logic and replaces it with a straight line to the end state.
      // Let's implement that: Find all sequences that share the same path decisions up to the functionalEventId.

      // To do this simply: a branch occurs on a specific segment. 
      // A segment is identified by the decisions made BEFORE this functionalEventId.
      // Let's get the index of the target FE in the headers to know what is "before".
      const feIndex = et.functionalEvents.findIndex(f => f.id === functionalEventId);
      const beforeFEIds = new Set(et.functionalEvents.slice(0, feIndex).map(f => f.id));

      const targetPrefix = targetSeq.path.filter(p => beforeFEIds.has(p.functionalEventId));

      const isMatchingPrefix = (seq: Sequence) => {
        const seqPrefix = seq.path.filter(p => beforeFEIds.has(p.functionalEventId));
        if (seqPrefix.length !== targetPrefix.length) return false;
        return targetPrefix.every((tp, i) => tp.functionalEventId === seqPrefix[i].functionalEventId && tp.branchId === seqPrefix[i].branchId);
      };

      // 1. Identify all sequences that match this prefix and have a decision for this FE
      const targetIndices: number[] = [];
      et.sequences.forEach((seq, idx) => {
        if (isMatchingPrefix(seq) && seq.path.some(p => p.functionalEventId === functionalEventId)) {
          targetIndices.push(idx);
        }
      });

      if (targetIndices.length === 0) return state;

      // 2. The new end state should be from the TOPMOST sequence in this group (the original success path)
      const topTargetSeq = et.sequences[targetIndices[0]];
      const newSeq: Sequence = {
        id: uuidv4(),
        path: targetPrefix,
        endStateId: topTargetSeq.endStateId
      };

      // 3. Remove all matching sequences and insert the new one at the topmost index
      const remainingSequences = et.sequences.filter((_, idx) => !targetIndices.includes(idx));
      const insertIndex = targetIndices[0];

      const finalSequences = [...remainingSequences];
      finalSequences.splice(insertIndex, 0, newSeq);

      // 4. Renumber all sequences
      const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
      const ieCode = ie?.code || 'IE';

      const renumberedSequences = finalSequences.map((seq, index) => ({
        ...seq,
        name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
      }));

      return {
        model: {
          ...state.model,
          eventTrees: state.model.eventTrees?.map(e =>
            e.id === eventTreeId ? { ...e, sequences: renumberedSequences } : e
          ) || [],
          updatedAt: new Date().toISOString()
        },
        isDirty: true
      };
    });
  },

  updateSequence: (eventTreeId, sequenceId, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        eventTrees: state.model.eventTrees?.map(et =>
          et.id === eventTreeId
            ? { ...et, sequences: et.sequences.map(seq => seq.id === sequenceId ? { ...seq, ...updates } : seq) }
            : et
        ) || [],
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    }));
  },

  updateInitiatingEvent: (id, updates) => {
    get().pushHistory();
    set((state) => {
      const updatedIEs = state.model.initiatingEvents?.map(ie => ie.id === id ? { ...ie, ...updates } : ie) || [];

      // If IE code changed, re-number all associated ET sequences
      const updatedETs = (state.model.eventTrees || []).map(et => {
        if (et.initiatingEventId === id && updates.code) {
          return {
            ...et,
            sequences: et.sequences.map((seq, index) => ({
              ...seq,
              name: `${updates.code}-${(index + 1).toString().padStart(2, '0')}`
            }))
          };
        }
        return et;
      });

      return {
        model: {
          ...state.model,
          initiatingEvents: updatedIEs,
          eventTrees: updatedETs,
          updatedAt: new Date().toISOString()
        },
        isDirty: true
      };
    });
  },

  addSeismicHazard: (hazard) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicHazards: [...(state.model.seismicHazards || []), hazard],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateSeismicHazard: (hazard) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicHazards: (state.model.seismicHazards || []).map((h) => h.id === hazard.id ? hazard : h),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeSeismicHazard: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicHazards: (state.model.seismicHazards || []).filter((h) => h.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addSeismicFragility: (fragility) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicFragilities: [...(state.model.seismicFragilities || []), fragility],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateSeismicFragility: (fragility) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicFragilities: (state.model.seismicFragilities || []).map((f) => f.id === fragility.id ? fragility : f),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeSeismicFragility: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicFragilities: (state.model.seismicFragilities || []).filter((f) => f.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateSeismicSettings: (settings) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicSettings: { ...state.model.seismicSettings, ...settings },
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateQuantificationSettings: (settings) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        quantificationSettings: { ...state.model.quantificationSettings, ...settings },
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  moveGateChild: (faultTreeId, gateId, childId, direction) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) => {
          if (ft.id !== faultTreeId) return ft;
          return {
            ...ft,
            gates: ft.gates.map((g) => {
              if (g.id !== gateId) return g;
              const index = g.children.indexOf(childId);
              if (index === -1) return g;
              
              const newChildren = [...g.children];
              if (direction === 'left' && index > 0) {
                [newChildren[index], newChildren[index - 1]] = [newChildren[index - 1], newChildren[index]];
              } else if (direction === 'right' && index < newChildren.length - 1) {
                [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
              }
              return { ...g, children: newChildren };
            })
          };
        }),
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    }));
  },

  saveToLocalStorage: () => {
    const { model } = get();
    try {
      localStorage.setItem('pra-nexus-model', JSON.stringify(model));
      set({ isDirty: false });
    } catch (e) {
      console.error('Failed to save model:', e);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const data = localStorage.getItem('pra-nexus-model');
      if (data) {
        const parsed = JSON.parse(data) as any;
        
        if (!parsed.seismicHazards) {
          parsed.seismicHazards = [];
        } else {
          parsed.seismicHazards = parsed.seismicHazards.map((h: any) => {
            if (h.points && !h.fractiles) {
              const { points, ...rest } = h;
              return {
                ...rest,
                fractiles: [{
                  id: uuidv4(),
                  name: 'Mean',
                  percentile: -1,
                  points: points
                }]
              };
            }
            return h;
          });
        }
        if (!parsed.seismicFragilities) {
          parsed.seismicFragilities = [];
        } else {
          parsed.seismicFragilities = parsed.seismicFragilities.map((f: any) => ({
            ...f,
            type: f.type || 'lognormal',
            points: f.points || []
          }));
        }
        if (!parsed.seismicSettings) parsed.seismicSettings = {
          hazardCurveId: '',
          selectedETIds: [],
          minPGA: 0.05,
          maxPGA: 2.0,
          intervals: 20
        };
        if (!parsed.seismicSettings.selectedETIds) parsed.seismicSettings.selectedETIds = [];
        if (!parsed.quantificationSettings) {
          parsed.quantificationSettings = {
            cutOff: 1e-9,
            approximation: 'bdd_exact',
            monteCarloSamples: 10000,
            useLHS: true,
            runUncertainty: false
          };
        }

        const model: PRAModel = {
          ...parsed,
          faultTrees: Array.isArray(parsed.faultTrees) ? parsed.faultTrees : [],
          basicEvents: (Array.isArray(parsed.basicEvents) ? parsed.basicEvents : []).reduce((acc: BasicEvent[], be: BasicEvent) => {
            let uniqueName = be.name;
            let counter = 1;
            while (acc.some(e => e.name === uniqueName)) {
              counter++;
              uniqueName = `${be.name}_${counter}`;
            }
            acc.push({ ...be, name: uniqueName });
            return acc;
          }, []),
          parameters: parsed.parameters || [],
          ccfGroups: parsed.ccfGroups || [],
          endStates: (parsed.endStates || []).map((es: any) => ({
            ...es,
            categories: es.categories || (es.category ? [es.category] : ['core_damage'])
          })),
        } as PRAModel;

        // --- Cleanup Dangling References (Ghost IDs) ---
        const allValidIds = new Set([
          ...model.basicEvents.map(be => be.id),
          ...model.faultTrees.flatMap(ft => ft.gates.map(g => g.id))
        ]);

        model.faultTrees = model.faultTrees.map(ft => ({
          ...ft,
          gates: ft.gates.map(g => ({
            ...g,
            children: g.children.filter(cid => allValidIds.has(cid))
          }))
        }));
        // -----------------------------------------------
        
        set({ model, isDirty: false, selectedFaultTreeId: model.faultTrees?.[0]?.id ?? null });
        return true;
      }
    } catch (e) {
      console.error('Failed to load model:', e);
    }
    return false;
  },

  convertToSubtree: (faultTreeId, gateId) => {
    get().pushHistory();
    let newlyCreatedFTId: string | null = null;
    
    set((state) => {
      const ft = state.model.faultTrees.find(f => f.id === faultTreeId);
      if (!ft) return state;

      const targetGate = ft.gates.find(g => g.id === gateId);
      if (!targetGate) return state;

      if (ft.topGateId === gateId) {
        alert(state.model.locale === 'ja' ? '最上位ゲートをサブツリーとして分離することはできません。' : 'Cannot convert the top gate into a sub-tree.');
        return state;
      }

      // 1. Collect all descendant nodes (gates)
      const descendantGateIds = new Set<string>();
      const collect = (id: string) => {
        const g = ft.gates.find(x => x.id === id);
        if (g && !descendantGateIds.has(id)) {
          descendantGateIds.add(id);
          g.children.forEach(collect);
        }
      };
      collect(gateId);

      // 2. Map old IDs to NEW IDs for the sub-tree to avoid any global ID collisions
      const idMap = new Map<string, string>();
      descendantGateIds.forEach(oldId => idMap.set(oldId, uuidv4()));

      // 3. Extract and transform gates for the new tree
      const subTreeGates: Gate[] = ft.gates
        .filter(g => descendantGateIds.has(g.id))
        .map(g => ({
          ...g,
          id: idMap.get(g.id)!,
          children: g.children.map(cid => idMap.get(cid) || cid)
        }));
      
      const newFT: FaultTree = {
        id: uuidv4(),
        name: `Sub: ${targetGate.name}`,
        topGateId: idMap.get(gateId)!,
        gates: subTreeGates
      };

      newlyCreatedFTId = newFT.id;

      // 4. Update the original tree: Replace targetGate with a TRANSFER gate
      const updatedGates = ft.gates
        .filter(g => !descendantGateIds.has(g.id) || g.id === gateId) 
        .map(g => {
          if (g.id === gateId) {
            return {
              ...g,
              type: 'TRANSFER' as GateType,
              children: [], 
              linkedFaultTreeId: newFT.id
            };
          }
          return g;
        });

      return {
        model: {
          ...state.model,
          faultTrees: [
            ...state.model.faultTrees.map(f => f.id === faultTreeId ? { ...f, gates: updatedGates } : f),
            newFT
          ],
          updatedAt: new Date().toISOString()
        },
        selectedFaultTreeId: newFT.id,
        isDirty: true
      };
    });

    // Automatically layout the new tree so it's clean and centered
    if (newlyCreatedFTId) {
      setTimeout(() => get().autoLayout(newlyCreatedFTId!), 100);
    }
  }
}));
