import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Fab, Drawer, Typography, IconButton, Paper, TextField,
  CircularProgress, Tooltip, Stack, Chip
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
}

// --- NEW: Updated Prompt Guides ---
const plannerPrompts = [
  "List pending customers",
  "List all faulty devices",
  "Suggest 3 available ONTs",
  "Who is on splitter SPL-CHN-ADY-01-01?",
  "Mark asset 'ONT-SN-...' as FAULTY",
];

const techPrompts = [
  "What are my pending tasks?",
  "Troubleshoot: No light on ONT",
  "Mark task 1 as COMPLETED",
  "What is the status of 'RTR-SN-...'?",
];
// ---------------------

export const SmartAssistant: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: `Hi ${user?.full_name || user?.username}! I'm your smart assistant. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggle = () => setOpen(!open);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: input,
    };
    
    // --- NEW: Add user message and create history ---
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create chat history for the AI (excluding the initial welcome message)
    const history = newMessages
      .filter(msg => msg.id !== 1) // Remove the first message
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
    // We only need history, not the current message (which is passed separately)
    history.pop(); 
    // --- END NEW ---

    try {
      // This calls the backend endpoint
      const response = await api.post('/api/ai/chat', {
        message: input,
        history: history // <-- NEW: Send the conversation history
      });

      let aiText: any = response.data.response;
      if (typeof aiText === 'object') {
        try {
          aiText = JSON.stringify(aiText, null, 2);
        } catch (e) {
          aiText = String(aiText);
        }
      }

      const aiMessage: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: String(aiText),
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (err: any) {
      console.error("AI chat error:", err);
      let errorText = "Sorry, I'm having trouble connecting to my brain right now. Please try again later.";
      if (err.response && err.response.data && err.response.data.detail) {
        errorText = `Error: ${err.response.data.detail}`;
      }
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: errorText,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const getPrompts = () => {
    switch(user?.role) {
      case 'PLANNER':
      case 'ADMIN':
        return plannerPrompts;
      case 'TECHNICIAN':
        return techPrompts;
      default:
        return [];
    }
  };

  return (
    <>
      <Tooltip title="Smart Assistant">
        <Fab
          color="primary"
          onClick={handleToggle}
          sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1301 }}
        >
          <SmartToyIcon />
        </Fab>
      </Tooltip>
      <Drawer
        anchor="right"
        open={open}
        onClose={handleToggle}
        sx={{ zIndex: 1300 }}
      >
        <Box
          sx={{
            width: 400,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          }}
        >
          {/* Header */}
          <Paper
            square
            elevation={3}
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Typography variant="h6">Smart Assistant</Typography>
            <IconButton onClick={handleToggle}>
              <CloseIcon />
            </IconButton>
          </Paper>

          {/* Message List */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            <Stack spacing={2}>
              {messages.map((msg) => (
                <Paper
                  key={msg.id}
                  elevation={1}
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                    color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </Typography>
                </Paper>
              ))}
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', p: 1.5 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                    Assistant is thinking...
                  </Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>
          
          {/* Prompt Guides */}
          {messages.length <= 1 && (
             <Box sx={{ p: 2, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
               <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                 Try asking me:
               </Typography>
               <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                 {getPrompts().map(prompt => (
                   <Chip
                     key={prompt}
                     label={prompt}
                     onClick={() => handlePromptClick(prompt)}
                     size="small"
                     variant="outlined"
                   />
                 ))}
               </Stack>
             </Box>
          )}

          {/* Input Area */}
          <Paper
            square
            elevation={3}
            sx={{
              p: 2,
              flexShrink: 0,
              bgcolor: 'background.default',
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                size="small"
                variant="outlined"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <IconButton color="primary" onClick={handleSend} disabled={isLoading || input.trim() === ''}>
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </Box>
      </Drawer>
    </>
  );
};

export default SmartAssistant;