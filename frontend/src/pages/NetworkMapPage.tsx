// frontend/src/pages/NetworkMapPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges,
  Node, Edge, NodeChange, EdgeChange, ConnectionLineType,
  MiniMap, MarkerType, useReactFlow, Panel,
  ReactFlowProvider // <-- Step 1: Import Provider
} from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../api';
import { Box, CircularProgress, Alert, Paper, Typography, Button, FormGroup, FormControlLabel, Switch } from '@mui/material';

// --- Custom Node Imports ---
import FDHNode from '../components/network_map/FDHNode';
import SplitterNode from '../components/network_map/SplitterNode';
import CustomerONTNode from '../components/network_map/CustomerONTNode';
import CustomerRouterNode from '../components/network_map/CustomerRouterNode';

// --- ELK Layouting Imports ---
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled';

// Initialize ELK
const elk = new ELK();

// --- Define Hierarchy Types ---
interface CustomerSimple { id: number; address: string; splitter_port: number | null; status: string; device_type: 'ONT' | 'ROUTER' | 'UNKNOWN'; }
interface SplitterSimple { id: number; name: string; port_capacity: number; customers: CustomerSimple[]; }
interface FDHSimple { id: number; name: string; location: string; splitters: SplitterSimple[]; }

// --- React Flow Custom Node Types ---
const nodeTypes = {
  fdhNode: FDHNode, splitterNode: SplitterNode,
  customerONTNode: CustomerONTNode, customerRouterNode: CustomerRouterNode,
};

// ELK Layout Options
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.spacing.nodeNode': '40',
  'elk.direction': 'RIGHT',
};

// Function to get node dimensions
const getNodeDimensions = (type: string) => {
  switch (type) {
    case 'fdhNode': return { width: 180, height: 80 };
    case 'splitterNode': return { width: 160, height: 70 };
    case 'customerONTNode':
    case 'customerRouterNode': return { width: 180, height: 60 };
    default: return { width: 150, height: 50 };
  }
};

// Function to transform data and apply layout (Ensure ELK properties fix is included)
const getLayoutedElements = async (hierarchyData: FDHSimple[], animateEdges: boolean = false) => {
  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];
  const elkNodes: ElkNode[] = [];

  hierarchyData.forEach(fdh => {
    const fdhNodeId = `fdh-${fdh.id}`;
    const fdhNodeDims = getNodeDimensions('fdhNode');
    reactFlowNodes.push({
      id: fdhNodeId, type: 'fdhNode',
      data: { label: fdh.name, details: fdh.location || 'N/A', type: 'FDH' },
      position: { x: 0, y: 0 }, width: fdhNodeDims.width, height: fdhNodeDims.height,
    });
    // Correctly nested layoutOptions for ELK node
    elkNodes.push({
      id: fdhNodeId, width: fdhNodeDims.width, height: fdhNodeDims.height,
      labels: [{ text: fdh.name }],
      layoutOptions: { 'nodeLabels.placement': 'CENTER' }
    });

    fdh.splitters.forEach(splitter => {
      const splitterNodeId = `splitter-${splitter.id}`;
      const splitterNodeDims = getNodeDimensions('splitterNode');
      reactFlowNodes.push({
        id: splitterNodeId, type: 'splitterNode',
        data: { label: splitter.name, details: `Capacity: ${splitter.port_capacity}`, type: 'SPLITTER' },
        position: { x: 0, y: 0 }, width: splitterNodeDims.width, height: splitterNodeDims.height,
      });
      elkNodes.push({
        id: splitterNodeId, width: splitterNodeDims.width, height: splitterNodeDims.height,
        labels: [{ text: splitter.name }]
      });
      reactFlowEdges.push({
        id: `e-${fdhNodeId}-${splitterNodeId}`, source: fdhNodeId, target: splitterNodeId,
        type: ConnectionLineType.SmoothStep, animated: animateEdges,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#b1b1b7' },
        style: { strokeWidth: animateEdges ? 3 : 2, stroke: animateEdges ? '#007bff' : '#b1b1b7' } // Ensure stroke is defined
      });

      splitter.customers.forEach(customer => {
        const customerNodeId = `customer-${customer.id}`;
        const deviceType = customer.device_type || 'UNKNOWN';
        const customerNodeType = deviceType === 'ONT' ? 'customerONTNode' : (deviceType === 'ROUTER' ? 'customerRouterNode' : 'default');
        const customerNodeDims = getNodeDimensions(customerNodeType);
        reactFlowNodes.push({
          id: customerNodeId, type: customerNodeType,
          data: { label: customer.address, details: `Port: ${customer.splitter_port}`, deviceType: deviceType, status: customer.status },
          position: { x: 0, y: 0 }, width: customerNodeDims.width, height: customerNodeDims.height,
        });
        elkNodes.push({
          id: customerNodeId, width: customerNodeDims.width, height: customerNodeDims.height,
          labels: [{ text: customer.address }]
        });
        reactFlowEdges.push({
          id: `e-${splitterNodeId}-${customerNodeId}`, source: splitterNodeId, target: customerNodeId,
          type: ConnectionLineType.SmoothStep, animated: animateEdges,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#b1b1b7' },
          style: { strokeWidth: animateEdges ? 3 : 2, stroke: animateEdges ? '#007bff' : '#b1b1b7' } // Ensure stroke is defined
        });
      });
    });
  });

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: elkOptions,
    children: elkNodes.map(node => ({ ...node, x: undefined, y: undefined })),
    edges: reactFlowEdges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })) as ElkExtendedEdge[],
  };

  try {
    const layout = await elk.layout(graph);
    const layoutedNodes = reactFlowNodes.map(node => {
      const layoutNode = layout.children?.find(n => n.id === node.id);
      if (layoutNode) { node.position = { x: layoutNode.x || 0, y: layoutNode.y || 0 }; }
      return node;
    });
    return { nodes: layoutedNodes, edges: reactFlowEdges };
  } catch (e) {
    console.error("ELK layouting failed:", e);
    return { nodes: reactFlowNodes, edges: reactFlowEdges };
  }
};


// --- Step 2: Create Inner Component for Flow Content ---
const FlowContent = ({
  initialNodes, initialEdges, animateEdges, onNodesChange, onEdgesChange, toggleAnimation
}: {
  initialNodes: Node[], initialEdges: Edge[], animateEdges: boolean,
  onNodesChange: (changes: NodeChange[]) => void,
  onEdgesChange: (changes: EdgeChange[]) => void,
  toggleAnimation: () => void
}) => {
  const reactFlowInstance = useReactFlow(); // <-- Call useReactFlow HERE, inside Provider context

  const handleRecenter = useCallback(() => {
     reactFlowInstance.fitView({ padding: 0.1, duration: 300 });
  }, [reactFlowInstance]);

   useEffect(() => {
     // Fit view when nodes/edges are initially loaded or significantly change
     if (initialNodes.length > 0) {
       // Using a timeout helps ensure the DOM is ready for fitView calculations
       const timer = setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.1, duration: 500 });
       }, 50);
       return () => clearTimeout(timer); // Cleanup timer on unmount/re-render
     }
   }, [initialNodes, initialEdges, reactFlowInstance]);


  return (
    <ReactFlow
      nodes={initialNodes}
      edges={initialEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitViewOptions={{ padding: 0.1 }}
      proOptions={{ hideAttribution: true }}
      defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
    >
      <Controls />
      <MiniMap nodeStrokeWidth={3} zoomable pannable />
      <Background gap={16} color="#444" variant={'dots' as any} />
      <Panel position="top-right">
        <Paper elevation={2} sx={{ p: 1, borderRadius: 1 }}>
          <FormGroup>
            <FormControlLabel
              control={<Switch size="small" checked={animateEdges} onChange={toggleAnimation} />}
              label="Animate Connections"
              sx={{ '& .MuiTypography-root': { fontSize: '0.9rem' } }}
            />
          </FormGroup>
          <Button
            onClick={handleRecenter}
            size="small" variant="outlined" sx={{ mt: 1, width: '100%', fontSize: '0.8rem' }}
          >
            Recenter View
          </Button>
        </Paper>
      </Panel>
    </ReactFlow>
  );
};
// ----------------------------------------------------

// --- Main Network Map Component ---
export const NetworkMapPage: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animateEdges, setAnimateEdges] = useState(false);
  // ** REMOVED useReactFlow() from here **

  const fetchAndLayoutHierarchy = useCallback(async (isAnimating: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/hierarchy/fdh');
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(res.data, isAnimating);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      // FitView logic moved to FlowContent's useEffect
    } catch (err) {
      console.error("Error fetching or laying out hierarchy:", err);
      setError('Failed to load network hierarchy data.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally keep limited dependencies, effect below controls calls

  useEffect(() => {
      fetchAndLayoutHierarchy(animateEdges); // Fetch based on current animation state
  }, [animateEdges, fetchAndLayoutHierarchy]);


  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [] // No dependency needed for setNodes from useState
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [] // No dependency needed for setEdges from useState
  );

  const toggleAnimation = useCallback(() => {
    setAnimateEdges(prev => !prev); // Toggles state, triggering useEffect
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
      <CircularProgress />
    </Box>
  );
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
       <Typography variant="h4" gutterBottom>Network Hierarchy Map</Typography>
       <Paper sx={{ height: '100%', width: '100%' }}>
         {/* --- ** Step 3: Wrap Inner Component with Provider ** --- */}
         <ReactFlowProvider>
           <FlowContent
             initialNodes={nodes}
             initialEdges={edges}
             animateEdges={animateEdges}
             onNodesChange={onNodesChange}
             onEdgesChange={onEdgesChange}
             toggleAnimation={toggleAnimation}
           />
         </ReactFlowProvider>
         {/* --------------------------------------------------- */}
      </Paper>
    </Box>
  );
};