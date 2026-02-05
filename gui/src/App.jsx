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

// --- Custom Nodes ---

// Custom Group Node with Handles to ensure connections are visible
const StageGroupNode = ({ data, style }) => {
  return (
    <div style={{ ...style, position: 'relative' }}>
      {/* Input Handle */}
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 10, height: 10 }} />

      <div style={{
        padding: '10px',
        fontWeight: 'bold',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        marginBottom: '10px',
        color: '#444'
      }}>
        {data.label}
      </div>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 10, height: 10 }} />
    </div>
  );
};


// Initial state
const initialNodes = [
  {
    id: 'input_node',
    type: 'input',
    data: { label: 'Input Source' },
    position: { x: 50, y: 300 },
    style: {
      background: '#fff',
      border: '1px solid #777',
      borderRadius: '50%',
      width: 80,
      height: 80,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: 'bold',
      fontSize: '10px',
      textAlign: 'center',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }
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
  const nodeTypes = useMemo(() => ({ stageGroup: StageGroupNode }), []);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

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

      let data = { label: `${type}` };
      if (type === 'DQ: Not Null') {
        data = { label: 'DQ: Not Null', ruleType: 'check_not_null', ruleId: `rule_${id}` };
      } else if (type === 'DQ: Regex') {
        data = { label: 'DQ: Regex Check', ruleType: 'check_regex', ruleId: `rule_${id}` };
      } else if (type === 'Cleanse: Trim') {
        data = { label: 'Cleanse: Trim', ruleType: 'clean_trim' };
      } else if (type === 'Cleanse: Lower') {
        data = { label: 'Cleanse: Lowercase', ruleType: 'clean_lowercase' };
      }

      const newNode = {
        id: getId(),
        type: 'default',
        position,
        data: data,
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
    // Naive export similar to before
    const dqRules = [];
    const cleanseRules = [];
    nodes.forEach(node => {
      // Skip groups/inputs, only find rules
      // Note: In a real app we'd check parentNode to assign to correct stage. 
      // For POC drag-and-drop export, we just list them.
      const d = node.data;
      if (d.label && d.label.startsWith('DQ')) {
        dqRules.push({
          id: d.ruleId || `rule_${node.id}`,
          type: d.ruleType || 'check_unknown',
          column: 'email'
        });
      } else if (d.label && d.label.startsWith('Cleanse')) {
        cleanseRules.push({
          type: d.ruleType || 'clean_unknown',
          column: 'email'
        });
      }
    });

    const yamlObj = { stages: [] };
    if (dqRules.length) yamlObj.stages.push({ name: "Generated DQ", type: "dq", rules: dqRules });
    if (cleanseRules.length) yamlObj.stages.push({ name: "Generated Cleanse", type: "cleanse", rules: cleanseRules });

    const yamlStr = yaml.dump(yamlObj);
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
      let prevStageNodeId = null;

      // Add Input Node
      const inputId = 'input_node';
      newNodes.push({
        id: inputId,
        type: 'input', // Use standard Input type which has Source handle
        data: { label: 'Source: customers.csv' },
        position: { x: 50, y: 300 },
        style: {
          background: '#fff',
          border: '1px solid #333',
          borderRadius: '8px',
          width: 120,
          padding: '10px',
          fontSize: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }
      });

      let currentX = 250;

      // Loop stages
      pipeline.stages.forEach((stage, stageIdx) => {
        const ruleCount = stage.rules ? stage.rules.length : 0;
        const stageHeight = Math.max(100, ruleCount * 80 + 60);
        const stageWidth = 280;
        const stageY = 50;

        // 1. Create Group Node (The Stage) - USING CUSTOM TYPE
        const stageGroupId = `stage_${stageIdx}`;

        // Calculate styles based on type
        const isDq = stage.type === 'dq';
        const borderColor = isDq ? '#3b82f6' : '#10b981';
        const bgColor = isDq ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, rgba(255,255,255,0) 100%)' : 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255,255,255,0) 100%)';

        newNodes.push({
          id: stageGroupId,
          type: 'stageGroup', // Use our custom component
          data: { label: stage.name }, // Pass label to custom component
          position: { x: currentX, y: stageY },
          style: {
            width: stageWidth,
            height: stageHeight,
            background: bgColor,
            borderTop: `4px solid ${borderColor}`,
            borderLeft: '1px solid rgba(0,0,0,0.1)',
            borderRight: '1px solid rgba(0,0,0,0.1)',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          },
          // We don't use className for logic anymore, passed in style directly for granular control
        });

        // Add connection
        if (stageIdx === 0) {
          // Input -> Stage 0
          newEdges.push({
            id: `e_input_${stageGroupId}`,
            source: inputId,
            target: stageGroupId,
            animated: true,
            style: { stroke: '#555', strokeWidth: 2 },
            type: 'smoothstep'
          });
        } else {
          // Prev Stage -> Curr Stage
          newEdges.push({
            id: `e_${prevStageNodeId}_${stageGroupId}`,
            source: prevStageNodeId,
            target: stageGroupId,
            animated: true,
            style: { stroke: '#555', strokeWidth: 2 },
            type: 'smoothstep'
          });
        }

        // 2. Create Rule Nodes (Children)
        if (stage.rules) {
          stage.rules.forEach((rule, ruleIdx) => {
            const ruleLabel = `${rule.type}\n• ${rule.column}`;

            newNodes.push({
              id: `node_${stageIdx}_${ruleIdx}`,
              type: 'default',
              data: {
                label: ruleLabel,
                ...rule
              },
              position: { x: 20, y: 50 + (ruleIdx * 80) }, // Relative to Parent
              parentNode: stageGroupId,
              extent: 'parent',
              style: {
                width: 240,
                fontSize: '11px',
                background: 'rgba(255,255,255,0.8)'
              }
            });
          });
        }

        prevStageNodeId = stageGroupId;
        currentX += stageWidth + 100; // Gap between stages
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
          background: 'white', borderLeft: '1px solid #ccc', zIndex: 10, padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <h3>Paste YAML Config</h3>
          <textarea
            style={{ flex: 1, fontFamily: 'monospace' }}
            value={yamlInput}
            onChange={(e) => setYamlInput(e.target.value)}
            placeholder="Paste context of pipeline.yaml here..."
          />
          <button onClick={loadFromYaml}>Visualize</button>
          <button onClick={() => setShowImport(false)} style={{ background: '#666' }}>Cancel</button>
        </div>
      )}

      <div className="work-area">
        <div className="sidebar">
          <div className="description">Drag nodes to the right pane.</div>
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
            <Controls />
            <MiniMap />
            {/* Improved Background */}
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#C8C8C8" />
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
