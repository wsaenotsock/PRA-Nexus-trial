'use client';

import { create } from 'zustand';
import * as Y from 'yjs';
// @ts-ignore
import { WebsocketProvider } from 'y-websocket';
import { useModelStore } from './modelStore';
import type { PRAModel } from '@/lib/types';

export interface YjsUser {
  name: string;
  color: string;
  cursor?: { x: number; y: number; view: string };
}

export interface YjsState {
  isConnected: boolean;
  users: YjsUser[];
  connect: (roomName: string, userName: string) => void;
  disconnect: () => void;
  updateCursor: (cursor: YjsUser['cursor']) => void;
}

export const useYjsStore = create<YjsState>((set, get) => {
  let doc: Y.Doc | null = null;
  // @ts-ignore
  let provider: WebsocketProvider | null = null;
  let yMap: Y.Map<string> | null = null;
  
  // Flag to prevent infinite sync loops
  let isApplyingRemoteUpdate = false;
  // Cleanup function for Zustand subscription
  let unsubscribeModelStore: (() => void) | null = null;

  return {
    isConnected: false,
    users: [],

    connect: (roomName: string, userName: string) => {
      // 1. Cleanup existing connection if any
      get().disconnect();

      // 2. Setup Yjs Document
      doc = new Y.Doc();
      yMap = doc.getMap('pra-model');

      // 3. Setup WebSocket Provider
      provider = new WebsocketProvider(
        'ws://localhost:1234',
        roomName,
        doc,
        { connect: true }
      );

      // 4. Handle connection status
      provider.on('status', ({ status }: { status: 'connected' | 'disconnected' }) => {
        set({ isConnected: status === 'connected' });
        
        // When connected, if the remote map is empty but we have local data, initialize it
        if (status === 'connected' && !yMap?.has('model')) {
          const localModel = useModelStore.getState().model;
          if (localModel) {
             doc?.transact(() => {
               yMap?.set('model', JSON.stringify(localModel));
             });
          }
        }
      });

      // 5. Handle awareness (Presence)
      // Generate a random color for the user
      const userColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
      provider.awareness.setLocalStateField('user', { name: userName, color: userColor });
      
      provider.awareness.on('change', () => {
        if (!provider) return;
        const users = Array.from(provider.awareness.getStates().values())
          .map((state: any) => state.user)
          .filter(Boolean) as YjsUser[];
        set({ users });
      });

      // 6. Handle remote changes from Yjs -> Zustand
      yMap.observe((event) => {
        if (event.transaction.local) return; // Ignore our own changes

        isApplyingRemoteUpdate = true;
        try {
          const modelStr = yMap!.get('model');
          if (modelStr) {
            const remoteModel = JSON.parse(modelStr) as PRAModel;
            // Update Zustand Store without triggering local history push
            useModelStore.setState((state) => ({ 
              ...state, 
              model: remoteModel, 
              isDirty: true 
            }));
          }
        } finally {
          // Allow time for React to process before unblocking local sync
          setTimeout(() => { isApplyingRemoteUpdate = false; }, 10);
        }
      });

      // 7. Handle local changes from Zustand -> Yjs
      unsubscribeModelStore = useModelStore.subscribe((state, prevState) => {
        if (isApplyingRemoteUpdate || !yMap || !doc) return;
        
        // Only push to Yjs if the model actually changed
        if (state.model !== prevState.model) {
          doc.transact(() => {
            yMap!.set('model', JSON.stringify(state.model));
          });
        }
      });
    },

    disconnect: () => {
      if (unsubscribeModelStore) {
        unsubscribeModelStore();
        unsubscribeModelStore = null;
      }
      if (provider) {
        provider.disconnect();
        provider.destroy();
        provider = null;
      }
      if (doc) {
        doc.destroy();
        doc = null;
      }
      set({ isConnected: false, users: [] });
    },

    updateCursor: (cursor) => {
      if (provider?.awareness) {
        const current = provider.awareness.getLocalState()?.user;
        if (current) {
          provider.awareness.setLocalStateField('user', { ...current, cursor });
        }
      }
    }
  };
});
