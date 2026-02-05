import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
  BackgroundVariant,
  useReactFlow
} from 'reactflow';
import yaml from 'js-yaml';
import { Shield, Sparkles, Database, Plus, X, Edit2, Play, Download, Upload } from 'lucide-react';

// --- Components ---

const EditRuleModal = ({ rule, onClose, onSave }) => {
  const [column, setColumn] = useState(rule.column || '');
  const [value, setValue] = useState(rule.value || '');
  const [pattern, setPattern] = useState(rule.pattern || '');
  const [min, setMin] = useState(rule.min_len || rule.min || '');
  const [max, setMax] = useState(rule.max_len || rule.max || '');
  const [values, setValues] = useState(rule.values ? rule.values.join(',') : '');

  const handleSave = () => {
    const newRule = { ...rule, column };
    if (value) newRule.value = isNaN(value) ? value : Number(value);
    if (pattern) newRule.pattern = pattern;
    if (min) newRule.min = Number(min); // Simplify naming for POC
    if (max) newRule.max = Number(max);
    if (rule.type === 'check_length') {
      if (min) newRule.min_len = Number(min);
      if (max) newRule.max_len = Number(max);
      delete newRule.min; delete newRule.max;
    }
    if (values) newRule.values = values.split(',').map(s => s.trim());

    onSave(newRule);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginTop: 0 }}>Edit Rule: {rule.type}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
            Target Column
            <input value={column} onChange={e => setColumn(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </label>

          {/* Dynamic Fields based on type */}
          {(rule.type === 'check_min' || rule.type === 'check_max') && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
              Threshold Value
              <input type="number" value={value} onChange={e => setValue(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>
          )}

          {rule.type === 'check_regex' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
              Regex Pattern
              <input value={pattern} onChange={e => setPattern(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>
          )}

          {rule.type === 'check_in_set' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
              Allowed Values (comma separated)
              <input value={values} onChange={e => setValues(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>
          )}

          {(rule.type === 'check_length' || rule.type === 'check_range') && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
                Min
                <input type="number" value={min} onChange={e => setMin(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
                Max
                <input type="number" value={max} onChange={e => setMax(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button onClick={handleSave} style={{ flex: 1, background: '#2563eb', padding: '10px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Changes</button>
            <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ChartDB-style Table Node
const StageTableNode = ({ id, data }) => {
  const isDq = data.type === 'dq';
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

      {/* Body */}
      <div style={{ padding: '4px 0', minHeight: '40px' }}>
        {data.rules && data.rules.length > 0 ? (
          data.rules.map((rule, idx) => (
            <div key={idx}
              onClick={(e) => { e.stopPropagation(); data.onEditRequest(id, idx, rule); }}
              style={{
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
                <Edit2 size={10} color="#94a3b8" />
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                {rule.column || <span style={{ color: 'red' }}>Select Column</span>}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px', textAlign: 'center' }}>
            Drop rules here
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#64748b', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  );
};

const InputSourceNode = ({ data }) => {
  return (
    <div style={{
      background: 'white', borderRadius: '8px', padding: '12px', border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '180px', display: 'flex', alignItems: 'center', gap: '10px'
    }}>
      <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '6px', color: '#475569' }}><Database size={20} /></div>
      <div>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>SOURCE</div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{data.label}</div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#64748b', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  )
}

// Initial state
let id = 0;
const getId = () => `dndnode_${id++}`;
const initialNodes = [{ id: 'input_node', type: 'inputSource', data: { label: 'customers.csv' }, position: { x: 50, y: 300 } }];

const DnDApp = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [yamlInput, setYamlInput] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // { nodeId, ruleIdx, ruleData }

  // Callback to handle Rule Edits
  const onEditRequest = useCallback((nodeId, ruleIdx, ruleData) => {
    setEditingRule({ nodeId, ruleIdx, ruleData });
  }, []);

  // Update nodes with the function handler appropriately
  // Note: We need to ensure 'onEditRequest' is attached to node data when we load or create nodes.

  // Custom Node Types
  const nodeTypes = useMemo(() => ({ stageTable: StageTableNode, inputSource: InputSourceNode }), []);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const typeData = event.dataTransfer.getData('application/reactflow');
      if (!typeData) return;

      const { label, type, baseData } = JSON.parse(typeData);

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Check collision with existing Stage Nodes
      const hitNode = nodes.find(n =>
        n.type === 'stageTable' &&
        position.x > n.position.x && position.x < n.position.x + (n.width || 300) && // Approx width
        position.y > n.position.y && position.y < n.position.y + (n.height || 200) // Approx height
      );

      if (hitNode) {
        // Drop INTO existing Stage
        const newRule = { type: baseData.ruleType, column: '', ...baseData };
        delete newRule.ruleType; // Cleanup

        setNodes(nds => nds.map(node => {
          if (node.id === hitNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                rules: [...(node.data.rules || []), newRule]
              }
            };
          }
          return node;
        }));
      } else {
        // Create NEW Stage with this rule
        const newStageId = getId();
        const newRule = { type: baseData.ruleType, column: '', ...baseData };
        delete newRule.ruleType;

        const isDq = baseData.ruleType.startsWith('check');

        const newNode = {
          id: newStageId,
          type: 'stageTable',
          position,
          data: {
            label: isDq ? 'New DQ Stage' : 'New Cleanse Stage',
            type: isDq ? 'dq' : 'cleanse',
            rules: [newRule],
            onEditRequest: onEditRequest
          },
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, nodes, onEditRequest]
  );

  const onDragStart = (event, label, type, baseData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ label, type, baseData }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const addStage = (type) => {
    const id = getId();
    const newNode = {
      id,
      type: 'stageTable',
      position: { x: 400, y: 300 }, // Default placement
      data: {
        label: type === 'dq' ? 'New DQ Stage' : 'New Cleanse Stage',
        type,
        rules: [],
        onEditRequest
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const saveRuleEdit = (newRule) => {
    if (!editingRule) return;

    setNodes(nds => nds.map(node => {
      if (node.id === editingRule.nodeId) {
        const newRules = [...node.data.rules];
        newRules[editingRule.ruleIdx] = newRule;
        return {
          ...node,
          data: { ...node.data, rules: newRules }
        };
      }
      return node;
    }));
    setEditingRule(null);
  };

  const exportToYaml = () => {
    // Traverse Edges to find order? For POC, just dump stages in ID order or X position.
    // Ideally use Topological Sort.
    const sortedNodes = [...nodes].filter(n => n.type === 'stageTable').sort((a, b) => a.position.x - b.position.x);

    const stages = sortedNodes.map(node => ({
      name: node.data.label,
      type: node.data.type,
      rules: node.data.rules.map(r => {
        const clean = { ...r };
        // remove internal fields if any
        return clean;
      })
    }));

    const yamlStr = yaml.dump({ stages });
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
      if (!pipeline || !pipeline.stages) return;

      const newNodes = [];
      const newEdges = [];
      let prevNodeId = 'input_node';

      newNodes.push({ id: 'input_node', type: 'inputSource', data: { label: 'customers.csv' }, position: { x: 50, y: 300 } });

      let currentX = 350;

      pipeline.stages.forEach((stage, stageIdx) => {
        const stageNodeId = `stage_${stageIdx}`;
        newNodes.push({
          id: stageNodeId,
          type: 'stageTable',
          data: {
            label: stage.name,
            type: stage.type,
            rules: stage.rules || [],
            onEditRequest
          },
          position: { x: currentX, y: 100 },
        });

        newEdges.push({
          id: `e_${prevNodeId}_${stageNodeId}`,
          source: prevNodeId,
          target: stageNodeId,
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          type: 'smoothstep'
        });

        prevNodeId = stageNodeId;
        currentX += 400;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="#2563eb" />
          <span>Spark Pipeline Builder</span>
        </div>

        <div style={{ marginLeft: '40px', display: 'flex', gap: '8px' }}>
          <button onClick={() => addStage('dq')} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>+ Add DQ Stage</button>
          <button onClick={() => addStage('cleanse')} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>+ Add Cleanse Stage</button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowImport(!showImport)}><Upload size={14} style={{ marginRight: 4 }} /> Import</button>
          <button onClick={exportToYaml}><Download size={14} style={{ marginRight: 4 }} /> Export</button>
        </div>
      </div>

      {showImport && (
        <div style={{
          position: 'absolute', top: 60, bottom: 0, right: 0, width: '400px',
          background: 'white', borderLeft: '1px solid #e2e8f0', zIndex: 10, padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '-4px 0 16px rgba(0,0,0,0.05)'
        }}>
          <h3>Import Config</h3>
          <textarea
            style={{ flex: 1, fontFamily: 'monospace', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'none' }}
            value={yamlInput}
            onChange={(e) => setYamlInput(e.target.value)}
            placeholder="stages: ..."
          />
          <button onClick={loadFromYaml}>Visualize</button>
        </div>
      )}

      {editingRule && (
        <EditRuleModal rule={editingRule.ruleData} onClose={() => setEditingRule(null)} onSave={saveRuleEdit} />
      )}

      <div className="work-area">
        <div className="sidebar">
          <div className="description">Data Quality Rules</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'Not Null', 'dq', { ruleType: 'check_not_null' })} draggable>Not Null</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'Regex', 'dq', { ruleType: 'check_regex', pattern: '' })} draggable>Regex Check</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'Min Value', 'dq', { ruleType: 'check_min', value: 0 })} draggable>Min Value</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'Max Value', 'dq', { ruleType: 'check_max', value: 100 })} draggable>Max Value</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'In Set', 'dq', { ruleType: 'check_in_set', values: [] })} draggable>In Set</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'Length', 'dq', { ruleType: 'check_length', min: 0, max: 10 })} draggable>String Length</div>

          <div className="description" style={{ marginTop: '20px' }}>Cleansing</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'Trim', 'cleanse', { ruleType: 'clean_trim' })} draggable>Trim Whitespace</div>
          <div className="dndnode" onDragStart={(e) => onDragStart(e, 'Lowercase', 'cleanse', { ruleType: 'clean_lowercase' })} draggable>To Lowercase</div>
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
            nodeTypes={nodeTypes}
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
