import React, { useState, useRef, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap
} from 'reactflow';
import yaml from 'js-yaml';

// Initial state
const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Data (customers.csv)' },
    position: { x: 250, y: 5 }
  }
];

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDApp = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let label = type;
      let nodeType = 'default';

      // Customize label and data based on dragged type
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
        type: nodeType,
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
    // Traverse the graph to build stages
    // Simplify: Just list DQ nodes as DQ stage and Cleanse nodes as Cleanse stage based on ID order or connections.
    // Real implementation would traverse edges.

    // Naive simple export for POC: 
    // Gather all DQ nodes into a DQ stage, all cleanse nodes into Cleanse stage.
    // In a real app we would traverse the graph from Input.

    const dqRules = [];
    const cleanseRules = [];

    nodes.forEach(node => {
      const d = node.data;
      if (d.label && d.label.startsWith('DQ')) {
        dqRules.push({
          id: d.ruleId || 'rule_unknown',
          type: d.ruleType,
          column: 'email', // Hardcoded for POC simplicity as we don't have property panel yet
          pattern: d.ruleType === 'check_regex' ? '^[...]+$' : undefined
        });
      } else if (d.label && d.label.startsWith('Cleanse')) {
        cleanseRules.push({
          type: d.ruleType,
          column: 'email'
        });
      }
    });

    // Construct YAML object
    const yamlObj = {
      stages: []
    };

    if (dqRules.length > 0) {
      yamlObj.stages.push({
        name: "Generated DQ Stage",
        type: "dq",
        rules: dqRules
      });
    }

    if (cleanseRules.length > 0) {
      yamlObj.stages.push({
        name: "Generated Cleanse Stage",
        type: "cleanse",
        rules: cleanseRules
      });
    }

    const yamlStr = yaml.dump(yamlObj);

    // Trigger download
    const element = document.createElement("a");
    const file = new Blob([yamlStr], { type: 'text/yaml' });
    element.href = URL.createObjectURL(file);
    element.download = "pipeline_def.yaml";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="app-container">
      <div className="header">Spark Pipeline Builder</div>
      <div className="work-area">
        <div className="sidebar">
          <div className="description">Drag nodes to the right pane.</div>
          <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'DQ: Not Null')} draggable>
            DQ: Not Null
          </div>
          <div className="dndnode" onDragStart={(event) => onDragStart(event, 'DQ: Regex')} draggable>
            DQ: Regex Check
          </div>
          <div className="dndnode" onDragStart={(event) => onDragStart(event, 'Cleanse: Trim')} draggable>
            Cleanse: Trim
          </div>
          <div className="dndnode" onDragStart={(event) => onDragStart(event, 'Cleanse: Lower')} draggable>
            Cleanse: Lowercase
          </div>
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
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
            <div className="controls">
              <button onClick={exportToYaml}>Download YAML</button>
            </div>
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
