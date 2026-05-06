'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useModelStore } from '@/store/modelStore';

export type ETBranchNodeData = Record<string, unknown> & {
  label: string;
  isInitiatingEvent?: boolean;
  path?: { functionalEventId: string; branchId: string }[];
};

export type ETBranchNode = Node<ETBranchNodeData>;

function ETBranchNodeComponent({ data, id, isConnectable }: NodeProps<ETBranchNode>) {
  const isIE = data.isInitiatingEvent;
  const selectedEventTreeId = useModelStore((s) => s.selectedEventTreeId);
  const branchSequence = useModelStore((s) => s.branchSequence);
  const unbranchSequence = useModelStore((s) => s.unbranchSequence);

  const handleAddBranch = (e: React.MouseEvent) => {
    e.stopPropagation();
    // This is a dummy implementation to fix build errors in an unused file
    if (selectedEventTreeId && data.path !== undefined) {
      // branchSequence(selectedEventTreeId, "dummy_seq_id", "dummy_fe_id");
    }
  };

  return (
    <div className={`et-node ${isIE ? 'et-node--ie' : 'et-node--branch'}`}>
      {!isIE && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="et-handle et-handle--target"
        />
      )}
      
      <div className="et-node__content">
        {isIE ? (
          <div className="et-node__ie-box">
            <span className="et-node__label">{data.label}</span>
          </div>
        ) : (
          <div className="et-node__branch-point" />
        )}
      </div>

      {/* Quick Add Branch Button */}
      <button 
        className="et-node__add-branch-btn" 
        title="Add Branch"
        onClick={handleAddBranch}
      >
        +
      </button>

      <Handle
        type="source"
        position={Position.Right}
        id="success"
        style={{ top: '30%' }}
        isConnectable={isConnectable}
        className="et-handle et-handle--success"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="failure"
        style={{ top: '70%' }}
        isConnectable={isConnectable}
        className="et-handle et-handle--failure"
      />
    </div>
  );
}

export default memo(ETBranchNodeComponent);
