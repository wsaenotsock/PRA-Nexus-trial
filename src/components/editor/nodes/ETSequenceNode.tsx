'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type ETSequenceNodeData = Record<string, unknown> & {
  label: string;
  category: 'success' | 'core_damage' | 'lerf';
  frequency?: number;
};

export type ETSequenceNode = Node<ETSequenceNodeData>;

function ETSequenceNodeComponent({ data, isConnectable }: NodeProps<ETSequenceNode>) {
  const isSuccess = data.category === 'success';

  return (
    <div className={`et-node et-node--sequence ${isSuccess ? 'et-node--success' : 'et-node--danger'}`}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="et-handle et-handle--target"
      />
      
      <div className="et-node__sequence-box">
        <div className="et-node__sequence-name">{data.label}</div>
        {data.frequency !== undefined && (
          <div className="et-node__sequence-freq">{data.frequency.toExponential(2)} /yr</div>
        )}
      </div>
    </div>
  );
}

export default memo(ETSequenceNodeComponent);
