// // frontend/src/pages/TopologyPage.tsx
// import React, { useState, useCallback, useLayoutEffect, useEffect } from 'react';
// import {
//   Box, Paper, Typography, CircularProgress, Alert, Autocomplete, TextField,
//   ToggleButton, ToggleButtonGroup, Chip
// } from '@mui/material';
// import ReactFlow, {
//   ReactFlowProvider, Controls, Background, useNodesState, useEdgesState, useReactFlow,
//   Node, Edge, Position
// } from 'reactflow';
// import dagre from 'dagre';
// import api from '../api';
// // Import the CSS file (if you haven't added it to index.tsx)
// // import 'reactflow/dist/style.css'; 

// // --- ICONS for the nodes ---
// import FdhIcon from '@mui/icons-material/Storage'; // FDH
// import SplitterIcon from '@mui/icons-material/CallSplit'; // Splitter
// import OntIcon from '@mui/icons-material/Router'; // ONT
// import RouterIcon from '@mui/icons-material/Wifi'; // Router
// import CustomerIcon from '@mui/icons-material/Person'; // Customer
// import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Fallback/Error

// // --- Types ---
// interface SearchSuggestion {
//   id: number;
//   name: string;
//   type: 'customer' | 'fdh';
//   label: string;
// }

// // Define specific asset types
// type AssetType = 'fdh' | 'splitter' | 'ont' | 'router' | 'customer';

// interface TopologyNode {
//   id: string;
//   type: AssetType; // Use the specific type
//   name: string;
//   status?: string;
//   details: Record<string, any>;
//   children: TopologyNode[];
// }

// // --- React Flow Config ---
// const nodeWidth = 220;
// const nodeHeight = 120; // <-- Increased height for new design

// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));
// dagreGraph.setGraph({ rankdir: 'LR' }); // 'LR' = Left to Right

// const getLayoutedElements = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
//   nodes.forEach((node) => {
//     dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
//   });
//   edges.forEach((edge) => {
//     dagreGraph.setEdge(edge.source, edge.target);
//   });

//   dagre.layout(dagreGraph);

//   const layoutedNodes = nodes.map((node) => {
//     const nodeWithPosition = dagreGraph.node(node.id);
//     node.targetPosition = Position.Left;
//     node.sourcePosition = Position.Right;
//     node.position = {
//       x: nodeWithPosition.x - nodeWidth / 2,
//       y: nodeWithPosition.y - nodeHeight / 2,
//     };
//     return node;
//   });

//   return { nodes: layoutedNodes, edges };
// };

// // --- [ NEW CUSTOM NODE ] ---
// // This is the redesigned node for legibility
// const CustomNode: React.FC<{ data: any }> = ({ data }) => {
//   const { type, name, status, details } = data;
//   const isFaulty = status === 'FAULTY';

//   const typeMap: Record<AssetType, { icon: React.ReactElement, label: string, color: string, gradient: string }> = {
//     fdh: { 
//       icon: <FdhIcon />, 
//       label: 'FDH', 
//       color: '#667eea', // Purple
//       gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
//     },
//     splitter: { 
//       icon: <SplitterIcon />, 
//       label: 'Splitter', 
//       color: '#f093fb', // Pink
//       gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
//     },
//     ont: { 
//       icon: <OntIcon />, 
//       label: 'ONT', 
//       color: '#4facfe', // Cyan
//       gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
//     },
//     router: { 
//       icon: <RouterIcon />, 
//       label: 'Router', 
//       color: '#43e97b', // Green
//       gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
//     },
//     customer: { 
//       icon: <CustomerIcon />, 
//       label: 'Customer', 
//       color: '#fa709a', // Warm Pink
//       gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
//     },
//   };

//   const getStatusChip = (status: string) => {
//     const colorMap: Record<string, "success" | "info" | "error" | "warning" | "default"> = {
//       AVAILABLE: 'success',
//       ASSIGNED: 'info',
//       ACTIVE: 'success',
//       FAULTY: 'error',
//       IN_REPAIR: 'warning',
//       RETIRED: 'default',
//       PENDING_INSTALLATION: 'info',
//       PENDING_ONBOARDING: 'warning',
//       INACTIVE: 'default',
//     };
//     const chipColor = colorMap[status.toUpperCase()] || 'default';
//     return <Chip label={status} color={chipColor} size="small" variant="outlined" sx={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />;
//   };

//   const nodeInfo = typeMap[type as AssetType] || {
//     icon: <ErrorOutlineIcon />,
//     label: 'Unknown',
//     color: '#ccc',
//     gradient: 'linear-gradient(135deg, #ccc 0%, #999 100%)'
//   };

//   return (
//     <Box sx={{
//       width: nodeWidth,
//       height: nodeHeight,
//       bgcolor: 'background.paper',
//       border: '1px solid',
//       borderColor: 'divider',
//       borderRadius: '8px',
//       boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//       display: 'flex',
//       flexDirection: 'column',
//       ...(isFaulty && {
//         borderColor: 'error.main',
//         boxShadow: '0 0 12px 2px rgba(255, 82, 82, 0.7)',
//       })
//     }}>
//       {/* --- Node Header --- */}
//       <Box sx={{
//         display: 'flex',
//         alignItems: 'center',
//         p: '10px 12px', // Slightly less padding
//         background: nodeInfo.gradient,
//         color: '#fff',
//         borderRadius: '8px 8px 0 0',
//       }}>
//         <Box sx={{ display: 'flex', mr: 1, color: 'inherit', mt: '-2px' }}>
//           {nodeInfo.icon}
//         </Box>
//         {/* Only show the TYPE in the header */}
//         <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
//           {nodeInfo.label}
//         </Typography>
//       </Box>

//       {/* --- Node Body (THIS IS THE FIX FOR VISIBILITY) --- */}
//       <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, backgroundColor: 'background.default' }}>
//         {/* The NAME is now here, in dark text on a light background */}
//         <Typography variant="body1" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'text.primary' }}>
//           {name}
//         </Typography>
        
//         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <Typography variant="caption" color="textSecondary">
//             Status:
//           </Typography>
//           {status ? getStatusChip(status) : <Typography variant="caption" color="textSecondary">N/A</Typography>}
//         </Box>

//         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <Typography variant="caption" color="textSecondary">
//             {type === 'customer' ? 'Customer ID:' : 'Model/ID:'}
//           </Typography>
//           <Typography variant="caption" color="text.primary" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
//             {details.customer_id || details.model || '---'}
//           </Typography>
//         </Box>
//       </Box>
//     </Box>
//   );
// };
// // --- [ END NEW CUSTOM NODE ] ---

// const nodeTypes = {
//   custom: CustomNode,
// };

// const overlayStyle: React.CSSProperties = {
//   position: 'absolute',
//   top: 0,
//   left: 0,
//   right: 0,
//   bottom: 0,
//   display: 'flex',
//   justifyContent: 'center',
//   alignItems: 'center',
//   backgroundColor: 'rgba(0,0,0,0.05)',
//   flexDirection: 'column'
// };

// export const TopologyPage: React.FC = () => {
//   const [nodes, setNodes, onNodesChange] = useNodesState([]);
//   const [edges, setEdges, onEdgesChange] = useEdgesState([]);
//   const { fitView } = useReactFlow();

//   const [searchType, setSearchType] = useState<'customer' | 'fdh'>('customer');
//   const [searchOptions, setSearchOptions] = useState<SearchSuggestion[]>([]);
//   const [selectedEntity, setSelectedEntity] = useState<SearchSuggestion | null>(null);

//   const [loading, setLoading] = useState(false);
//   const [loadingSearch, setLoadingSearch] = useState(false);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const controller = new AbortController();
//     if (selectedEntity === null) {
//       setSearchOptions([]);
//     }
//     return () => controller.abort();
//   }, [selectedEntity]);

//   const handleSearchChange = async (event: React.SyntheticEvent, value: string) => {
//     if (!value || value.length < 2) {
//       setSearchOptions([]);
//       return;
//     }
//     setLoadingSearch(true);
//     try {
//       const response = await api.get<SearchSuggestion[]>('/api/topology/search', {
//         params: { query: value }
//       });
//       const filteredOptions = response.data.filter(opt => opt.type === searchType);
//       setSearchOptions(filteredOptions);
//     } catch (err) {
//       console.error('Search failed:', err);
//       setSearchOptions([]);
//     } finally {
//       setLoadingSearch(false);
//     }
//   };

//   const handleSearchTypeChange = (
//     event: React.MouseEvent<HTMLElement>,
//     newType: 'customer' | 'fdh',
//   ) => {
//     if (newType !== null) {
//       setSearchType(newType);
//       setSelectedEntity(null);
//       setSearchOptions([]);
//     }
//   };

//   const fetchAndLayoutTopology = useCallback(async (entity: SearchSuggestion) => {
//     setLoading(true);
//     setError('');
//     setNodes([]);
//     setEdges([]);

//     try {
//       const url = `/api/topology/${entity.type}/${entity.id}`;
//       const response = await api.get<TopologyNode>(url);

//       const newNodes: Node[] = [];
//       const newEdges: Edge[] = [];

//       const traverse = (node: TopologyNode) => {
//         const isFaulty = node.status === 'FAULTY';
        
//         newNodes.push({
//           id: node.id,
//           type: 'custom',
//           data: {
//             name: node.name,
//             type: node.type,
//             status: node.status,
//             details: node.details
//           },
//           position: { x: 0, y: 0 }
//         });

//         node.children.forEach(child => {
//           const isChildFaulty = child.status === 'FAULTY';
//           const isLinkActive = (child.status === 'ACTIVE' || child.status === 'ASSIGNED') && !isChildFaulty && !isFaulty;

//           newEdges.push({
//             id: `e-${node.id}-${child.id}`,
//             source: node.id,
//             target: child.id,
//             type: 'smoothstep',
//             animated: isLinkActive,
//             style: { 
//               strokeWidth: 2,
//               stroke: isFaulty || isChildFaulty ? '#F44336' : '#555',
//             }
//           });
//           traverse(child);
//         });
//       };

//       traverse(response.data);
//       const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
//       setNodes(layoutedNodes);
      
//       // --- THIS IS THE FIX ---
//       // This line was missing, which is why no lines were drawn.
//       setEdges(layoutedEdges);
//       // ----------------------

//     } catch (err: any) {
//       console.error(err);
//       setError(err.response?.data?.detail || 'Failed to load topology.');
//     } finally {
//       setLoading(false);
//     }
//   }, [setNodes, setEdges]); // Ensure setEdges is in the dependency array

//   // Re-fit view when data changes
//   useLayoutEffect(() => {
//     if (nodes.length > 0) {
//       const timer = setTimeout(() => {
//         fitView({ padding: 0.25, duration: 800 });
//       }, 50);
      
//       return () => clearTimeout(timer);
//     }
//   }, [nodes, fitView]);

//   return (
//     <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
//       <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
//         <Typography variant="h6" sx={{ flexShrink: 0 }}>Network Topology</Typography>
//         <ToggleButtonGroup
//           value={searchType}
//           exclusive
//           onChange={handleSearchTypeChange}
//           size="small"
//         >
//           <ToggleButton value="customer">Customer</ToggleButton>
//           <ToggleButton value="fdh">FDH</ToggleButton>
//         </ToggleButtonGroup>
//         <Autocomplete
//           fullWidth
//           value={selectedEntity}
//           onChange={(event, newValue) => {
//             setSelectedEntity(newValue);
//             if (newValue) {
//               fetchAndLayoutTopology(newValue);
//             }
//           }}
//           onInputChange={handleSearchChange}
//           options={searchOptions}
//           getOptionLabel={(option) => option.label || ''}
//           isOptionEqualToValue={(option, value) => option.id === value.id && option.type === value.type}
//           loading={loadingSearch}
//           renderInput={(params) => (
//             <TextField
//               {...params}
//               label={`Search for a ${searchType}...`}
//               InputProps={{
//                 ...params.InputProps,
//                 endAdornment: (
//                   <>
//                     {loadingSearch ? <CircularProgress color="inherit" size={20} /> : null}
//                     {params.InputProps.endAdornment}
//                   </>
//                 ),
//               }}
//             />
//           )}
//         />
//       </Paper>

//       <Paper sx={{ flexGrow: 1, position: 'relative' }}>
//         {loading && (
//           <Box sx={{ ...overlayStyle, zIndex: 10 }}>
//             <CircularProgress />
//             <Typography sx={{ mt: 2 }}>Building Topology...</Typography>
//           </Box>
//         )}
//         {error && (
//           <Box sx={{ ...overlayStyle, zIndex: 9 }}>
//             <Alert severity="error">{error}</Alert>
//           </Box>
//         )}
//         {!loading && !error && nodes.length === 0 && (
//           <Box sx={{ ...overlayStyle, zIndex: 8 }}>
//             <Typography variant="h5" color="textSecondary">
//               Please search for a Customer or FDH to begin.
//             </Typography>
//           </Box>
//         )}
//         <ReactFlow
//           nodes={nodes}
//           edges={edges}
//           onNodesChange={onNodesChange}
//           onEdgesChange={onEdgesChange}
//           nodeTypes={nodeTypes}
//           fitView
//           proOptions={{ hideAttribution: true }}
//           style={{ background: '#303030' }} // Darker background for the canvas
//         >
//           <Controls />
//           <Background color="#aaa" gap={16} />
//         </ReactFlow>
//       </Paper>
//     </Box>
//   );
// };

// // Helper component to provide React Flow context
// export const TopologyPageWrapper: React.FC = () => (
//   <ReactFlowProvider>
//     <TopologyPage />
//   </ReactFlowProvider>
// );

// // We export the wrapper
// export default TopologyPageWrapper;
// frontend/src/pages/TopologyPage.tsx
// frontend/src/pages/TopologyPage.tsx
import React, { 
  useState, 
  useCallback, 
  useLayoutEffect, 
  useEffect, 
  useRef // <-- FIX: Added useRef
} from 'react';
import {
  Box, Paper, Typography, CircularProgress, Alert, Autocomplete, TextField,
  ToggleButton, ToggleButtonGroup, Chip, 
  IconButton, // <-- FIX: Added IconButton
  Tooltip,    // <-- FIX: Added Tooltip
  InputAdornment // <-- FIX: Added InputAdornment
} from '@mui/material';
import ReactFlow, {
  ReactFlowProvider, Controls, Background, useNodesState, useEdgesState, useReactFlow,
  Node, Edge, Position
} from 'reactflow';
import dagre from 'dagre';
import api from '../api';
import 'reactflow/dist/style.css'; 

// --- ICONS for the nodes ---
import FdhIcon from '@mui/icons-material/Storage';
import SplitterIcon from '@mui/icons-material/CallSplit';
import OntIcon from '@mui/icons-material/Router';
import RouterIcon from '@mui/icons-material/Wifi';
import CustomerIcon from '@mui/icons-material/Person';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh'; // This one was correct

// --- Types ---
interface SearchSuggestion {
  id: number;
  name: string;
  type: 'customer' | 'fdh';
  label: string;
}

type AssetType = 'fdh' | 'splitter' | 'ont' | 'router' | 'customer';

interface TopologyNode {
  id: string;
  type: AssetType;
  name: string;
  status?: string;
  details: Record<string, any>;
  children: TopologyNode[];
}

// --- React Flow Config ---
const nodeWidth = 220;
const nodeHeight = 120;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
dagreGraph.setGraph({ rankdir: 'LR' });

const getLayoutedElements = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Left;
    node.sourcePosition = Position.Right;
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes: layoutedNodes, edges };
};

// --- Custom Node ---
const CustomNode: React.FC<{ data: any }> = ({ data }) => {
  const { type, name, status, details } = data;
  const isFaulty = status === 'FAULTY';

  const typeMap: Record<AssetType, { icon: React.ReactElement, label: string, gradient: string }> = {
    fdh: { 
      icon: <FdhIcon />, 
      label: 'FDH', 
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    },
    splitter: { 
      icon: <SplitterIcon />, 
      label: 'Splitter', 
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    ont: { 
      icon: <OntIcon />, 
      label: 'ONT', 
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    router: { 
      icon: <RouterIcon />, 
      label: 'Router', 
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    customer: { 
      icon: <CustomerIcon />, 
      label: 'Customer', 
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
  };

  const getStatusChip = (status: string) => {
    const colorMap: Record<string, "success" | "info" | "error" | "warning" | "default" | "secondary"> = {
      AVAILABLE: 'success', 
      ASSIGNED: 'info', 
      ACTIVE: 'success',
      FAULTY: 'error',
      IN_REPAIR: 'warning', 
      RETIRED: 'default',
      IN_USE: 'secondary',
      PENDING_INSTALLATION: 'info',
      PENDING_ONBOARDING: 'warning',
      INACTIVE: 'default',
    };
    const chipColor = colorMap[status.toUpperCase()] || 'default';
    return <Chip label={status} color={chipColor} size="small" variant="outlined" sx={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />;
  };

  const nodeInfo = typeMap[type as AssetType] || {
    icon: <ErrorOutlineIcon />,
    label: 'Unknown',
    gradient: 'linear-gradient(135deg, #ccc 0%, #999 100%)'
  };

  return (
    <Box sx={{
      width: nodeWidth,
      height: nodeHeight,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      ...(isFaulty && {
        borderColor: 'error.main',
        boxShadow: '0 0 12px 2px rgba(255, 82, 82, 0.7)',
      })
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: '10px 12px',
        background: nodeInfo.gradient,
        color: '#fff',
        borderRadius: '8px 8px 0 0',
      }}>
        <Box sx={{ display: 'flex', mr: 1, color: 'inherit', mt: '-2px' }}>
          {nodeInfo.icon}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
          {nodeInfo.label}
        </Typography>
      </Box>
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, backgroundColor: 'background.default' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'text.primary' }}>
          {name}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            Status:
          </Typography>
          {status ? getStatusChip(status) : <Typography variant="caption" color="textSecondary">N/A</Typography>}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            {type === 'customer' ? 'Customer ID:' : 'Model/ID:'}
          </Typography>
          <Typography variant="caption" color="text.primary" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
            {details.customer_id || details.model || '---'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.05)',
  flexDirection: 'column'
};

export const TopologyPage: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

  const [searchType, setSearchType] = useState<'customer' | 'fdh'>('customer');
  const [searchOptions, setSearchOptions] = useState<SearchSuggestion[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SearchSuggestion | null>(null);
  
  const selectedEntityRef = useRef(selectedEntity); // <-- useRef is now imported

  const [loading, setLoading] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    selectedEntityRef.current = selectedEntity;
  }, [selectedEntity]);
  
  useEffect(() => {
    const controller = new AbortController();
    if (selectedEntity === null) {
      setSearchOptions([]);
    }
    return () => controller.abort();
  }, [selectedEntity]);

  const handleSearchChange = async (event: React.SyntheticEvent, value: string) => {
    if (!value || value.length < 2) {
      setSearchOptions([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const response = await api.get<SearchSuggestion[]>('/api/topology/search', {
        params: { query: value }
      });
      const filteredOptions = response.data.filter(opt => opt.type === searchType);
      setSearchOptions(filteredOptions);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchOptions([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSearchTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'customer' | 'fdh',
  ) => {
    if (newType !== null) {
      setSearchType(newType);
      setSelectedEntity(null);
      setSearchOptions([]);
    }
  };

  const fetchAndLayoutTopology = useCallback(async (entity: SearchSuggestion | null) => {
    if (!entity) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const url = `/api/topology/${entity.type}/${entity.id}`;
      const response = await api.get<TopologyNode>(url);

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      const traverse = (node: TopologyNode) => {
        const isFaulty = node.status === 'FAULTY';
        
        newNodes.push({
          id: node.id,
          type: 'custom',
          data: {
            name: node.name,
            type: node.type,
            status: node.status,
            details: node.details
          },
          position: { x: 0, y: 0 }
        });

        node.children.forEach(child => {
          const isChildFaulty = child.status === 'FAULTY';
          const isLinkActive = (child.status === 'ACTIVE' || child.status === 'ASSIGNED') && !isChildFaulty && !isFaulty;

          newEdges.push({
            id: `e-${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            type: 'smoothstep',
            animated: isLinkActive,
            style: { 
              strokeWidth: 2,
              stroke: isFaulty || isChildFaulty ? '#F44336' : '#555',
            }
          });
          traverse(child);
        });
      };

      traverse(response.data);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load topology.');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  const handleRefreshClick = () => {
    if (selectedEntity) {
      fetchAndLayoutTopology(selectedEntity);
    }
  };

  useEffect(() => {
    const handleRefetchOnFocus = () => {
      if (document.visibilityState === 'visible' && selectedEntityRef.current) {
        fetchAndLayoutTopology(selectedEntityRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleRefetchOnFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleRefetchOnFocus);
    };
  }, [fetchAndLayoutTopology]);
  
  
  useLayoutEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.25, duration: 800 });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [nodes, fitView]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexShrink: 0 }}>Network Topology</Typography>
        <ToggleButtonGroup
          value={searchType}
          exclusive
          onChange={handleSearchTypeChange}
          size="small"
        >
          <ToggleButton value="customer">Customer</ToggleButton>
          <ToggleButton value="fdh">FDH</ToggleButton>
        </ToggleButtonGroup>
        <Autocomplete
          fullWidth
          value={selectedEntity}
          onChange={(event, newValue) => {
            setSelectedEntity(newValue);
            fetchAndLayoutTopology(newValue);
          }}
          onInputChange={handleSearchChange}
          options={searchOptions}
          getOptionLabel={(option) => option.label || ''}
          isOptionEqualToValue={(option, value) => option.id === value.id && option.type === value.type}
          loading={loadingSearch}
          renderInput={(params) => (
            <TextField
              {...params}
              label={`Search for a ${searchType}...`}
              InputProps={{
                ...params.InputProps,
                endAdornment: ( // <-- This now works because InputAdornment is imported
                  <>
                    {loadingSearch ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <Tooltip title="Refresh Topology">
          <span>
            <IconButton // <-- This now works because IconButton is imported
              onClick={handleRefreshClick}
              disabled={!selectedEntity || loading}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      <Paper sx={{ flexGrow: 1, position: 'relative' }}>
        {loading && (
          <Box sx={{ ...overlayStyle, zIndex: 10 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Building Topology...</Typography>
          </Box>
        )}
        {error && (
          <Box sx={{ ...overlayStyle, zIndex: 9 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        {!loading && !error && nodes.length === 0 && (
          <Box sx={{ ...overlayStyle, zIndex: 8 }}>
            <Typography variant="h5" color="textSecondary">
              Please search for a Customer or FDH to begin.
            </Typography>
          </Box>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: '#303030' }}
        >
          <Controls />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </Paper>
    </Box>
  );
};

// Helper component to provide React Flow context
export const TopologyPageWrapper: React.FC = () => (
  <ReactFlowProvider>
    <TopologyPage />
  </ReactFlowProvider>
);

// We export the wrapper
export default TopologyPageWrapper;