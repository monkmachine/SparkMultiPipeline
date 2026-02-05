import React, { useState, useRef, useCallback, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant
} from 'reactflow';
import yaml from 'js-yaml';
import { Settings, Trash2, Shield, Sparkles, Database } from 'lucide-react';

// --- Custom Nodes ---

// ChartDB-style Table Node
const StageTableNode = ({ data }) => {
  const isDq = data.type === 'dq';
  const headerColor = isDq ? '#3b82f6' : '#10b981';
  const headerBg = isDq ? 'linear-gradient(to right, #3b82f6, #2563eb)' : 'linear-gradient(to right, #10b981, #059669)';
  const Icon = isDq ? Shield : Sparkles;

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      minWidth: '280px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Input Handle */}
      <Handle type="target" position={Position.Left} style={{ background: '#64748b', width: 10, height: 10, border: '2px solid white' }} />

      {/* Header */}
      <div style={{
        background: headerBg,
        padding: '10px 12px',
        color: 'white',
        fontWeight: '600',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Icon size={16} />
        <span>{data.label}</span>
      </div>

      {/* Body (List of Rules) */}
      <div style={{ padding: '4px 0' }}>
        {data.rules && data.rules.length > 0 ? (
          data.rules.map((rule, idx) => (
            <div key={idx} style={{
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              borderBottom: idx === data.rules.length - 1 ? 'none' : '1px solid #f3f4f6',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer',
              transition: 'background 0.1s'
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500' }}>{rule.type}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{rule.id || '#'}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                {rule.column}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
            No rules configured
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} style={{ background: '#64748b', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  );
};

// Simple Input Node
const InputSourceNode = ({ data }) => {
  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      minWidth: '180px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{
        background: '#f1f5f9',
        padding: '8px',
        borderRadius: '6px',
        color: '#475569'
      }}>
        <Database size={20} />
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>SOURCE</div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{data.label}</div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#64748b', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  )
}

// Initial state
const initialNodes = [
  {
    id: 'input_node',
    type: 'inputSource', // Custom
    data: { label: 'customers.csv' },
    position: { x: 50, y: 300 }
  }
];

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDApp = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [yamlInput, setYamlInput] = useState("");
  const [showImport, setShowImport] = useState(false);

  // Register custom node types
  const nodeTypes = useMemo(() => ({
    stageTable: StageTableNode,
    inputSource: InputSourceNode
  }), []);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // For POC: Dropping interaction is simplified. 
      // Ideally, dropping a Rule on a StageTable should add it to that Stage.
      // Here we just spawn a generic node to show we can still drag.

      const newNode = {
        id: getId(),
        type: 'default',
        position,
        data: { label: type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const exportToYaml = () => {
    // Basic export logic placeholder
    const yamlStr = "stages: [] # Export logic would parse nodes here";
    const element = document.createElement("a");
    const file = new Blob([yamlStr], { type: 'text/yaml' });
    element.href = URL.createObjectURL(file);
    element.download = "pipeline_def.yaml";
    document.body.appendChild(element);
    element.click();
  };

  const loadFromYaml = () => {
    try {
      const pipeline = yaml.load(yamlInput);
      if (!pipeline || !pipeline.stages) {
        alert("Invalid YAML: Missing 'stages'");
        return;
      }

      const newNodes = [];
      const newEdges = [];
      let prevNodeId = 'input_node';

      // Add Input Node
      const inputId = 'input_node';
      newNodes.push({
        id: inputId,
        type: 'inputSource',
        data: { label: 'customers.csv' },
        position: { x: 50, y: 300 }
      });

      let currentX = 350;

      // Loop stages
      pipeline.stages.forEach((stage, stageIdx) => {
        const stageNodeId = `stage_${stageIdx}`;

        // Create Table Node (Single node for the whole stage)
        newNodes.push({
          id: stageNodeId,
          type: 'stageTable',
          data: {
            label: stage.name,
            type: stage.type,
            rules: stage.rules || []
          },
          position: { x: currentX, y: 100 },
        });

        // Add Edge
        newEdges.push({
          id: `e_${prevNodeId}_${stageNodeId}`,
          source: prevNodeId,
          target: stageNodeId,
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          type: 'smoothstep'
        });

        prevNodeId = stageNodeId;
        currentX += 400; // Gap between stages
      });

      setNodes(newNodes);
      setEdges(newEdges);
      setShowImport(false);
    } catch (e) {
      alert("Error parsing YAML: " + e.message);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <span>Spark Pipeline Builder</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowImport(!showImport)}>Import YAML</button>
          <button onClick={exportToYaml}>Download YAML</button>
        </div>
      </div>

      {showImport && (
        <div style={{
          position: 'absolute', top: 60, bottom: 0, right: 0, width: '400px',
          background: 'white', borderLeft: '1px solid #e2e8f0', zIndex: 10, padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Import Config</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Paste your pipeline YAML below to visualize it.</p>
          <textarea
            style={{
              flex: 1,
              fontFamily: 'monospace',
              padding: '12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              resize: 'none',
              fontSize: '13px',
              lineHeight: '1.4'
            }}
            value={yamlInput}
            onChange={(e) => setYamlInput(e.target.value)}
            placeholder="stages: ..."
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadFromYaml} style={{ flex: 1, background: '#2563eb' }}>Visualize Graph</button>
            <button onClick={() => setShowImport(false)} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#475569' }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="work-area">
        <div className="sidebar">
          <div className="description">Drag Rules</div>
          <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'DQ: Not Null')} draggable>DQ: Not Null</div>
          <div className="dndnode" onDragStart={(event) => onDragStart(event, 'DQ: Regex')} draggable>DQ: Regex</div>
          <div className="dndnode" onDragStart={(event) => onDragStart(event, 'Cleanse: Trim')} draggable>Cleanse: Trim</div>
          <div className="dndnode" onDragStart={(event) => onDragStart(event, 'Cleanse: Lower')} draggable>Cleanse: Lower</div>
        </div>

        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes} // Register custom types
          >
            <Controls showInteractive={false} />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default () => (
  <ReactFlowProvider>
    <DnDApp />
  </ReactFlowProvider>
);
