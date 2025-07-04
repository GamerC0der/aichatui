'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageList } from '@/components/MessageList';

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
};

type Command = {
  name: string;
  description: string;
  usage: string;
  example: string;
};

const COMMANDS: Command[] = [
  {
    name: 'image',
    description: 'Generate an image from text description',
    usage: '/image [prompt]',
    example: '/image a beautiful sunset over mountains'
  },
  {
    name: 'help',
    description: 'Show available commands',
    usage: '/help',
    example: '/help'
  },
  {
    name: 'clear',
    description: 'Clear current chat session',
    usage: '/clear',
    example: '/clear'
  },
  {
    name: 'new',
    description: 'Start a new chat session',
    usage: '/new',
    example: '/new'
  }
];

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const filteredCommands = inputValue.startsWith('/') 
    ? COMMANDS.filter(cmd => 
        cmd.name.toLowerCase().includes(inputValue.slice(1).toLowerCase()) ||
        cmd.description.toLowerCase().includes(inputValue.slice(1).toLowerCase())
      )
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowModal(false);
        setShowCommands(false);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowSettings(false);
        setShowCommands(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (inputValue.startsWith('/') && filteredCommands.length > 0) {
      setShowCommands(true);
      setSelectedCommandIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [inputValue, filteredCommands]);

  const generateId = () => Math.random().toString(36).substring(7);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [{ 
        id: '1', 
        content: 'Hello! I\'m your AI assistant. I can help you with conversations, answer questions, and generate images. Type / to see available commands!', 
        isUser: false,
        timestamp: new Date()
      }],
      createdAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  const handleCommand = async (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].slice(1);
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case 'image':
        if (!args.trim()) {
          setInputValue('/image ');
          inputRef.current?.focus();
          return;
        }
        await handleImageGeneration(args);
        break;
      
      case 'help':
        const helpMessage = `📚 **Available Commands**\n\n${COMMANDS.map(cmd => 
          `**${cmd.usage}** - ${cmd.description}\nExample: \`${cmd.example}\``
        ).join('\n\n')}`;
        
        const helpMsg: Message = {
          id: generateId(),
          content: helpMessage,
          isUser: false,
          timestamp: new Date()
        };
        
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: [...s.messages, helpMsg] }
            : s
        ));
        break;
      
      case 'clear':
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: [] }
            : s
        ));
        break;
      
      case 'new':
        createNewSession();
        break;
      
      default:
        const errorMsg: Message = {
          id: generateId(),
          content: `Unknown command: ${cmd}. Type /help to see available commands.`,
          isUser: false,
          timestamp: new Date()
        };
        
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: [...s.messages, errorMsg] }
            : s
        ));
        return;
    }
  };

  const handleImageGeneration = async (prompt: string) => {
    if (!currentSession) return;
    
    const messageId = generateId();
    const newMessage: Message = { 
      id: messageId, 
      content: '', 
      isUser: false, 
      timestamp: new Date(),
      isStreaming: true
    };
    
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, messages: [...s.messages, newMessage] }
        : s
    ));

    try {
      const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
      if (response.ok) {
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { 
                ...s, 
                messages: s.messages.map(msg => 
                  msg.id === messageId 
                    ? { ...msg, content: response.url, isStreaming: false }
                    : msg
                )
              }
            : s
        ));
      }
    } catch (error) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { 
              ...s, 
              messages: s.messages.map(msg => 
                msg.id === messageId 
                  ? { ...msg, content: 'Error generating image', isStreaming: false }
                  : msg
              )
            }
          : s
      ));
    }
  };

  const handleSend = async (regenerateLastMessage = false) => {
    if (!currentSession) return;
    
    let userMessage: Message;
    let lastUserMessage: Message | undefined;
    
    if (regenerateLastMessage) {
      const userMessages = currentSession.messages.filter(msg => msg.isUser);
      const aiMessages = currentSession.messages.filter(msg => !msg.isUser);
      
      if (userMessages.length === 0 || aiMessages.length === 0) return;
      
      lastUserMessage = userMessages[userMessages.length - 1];
      userMessage = lastUserMessage;
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { 
              ...s, 
              messages: s.messages.filter(msg => msg.id !== aiMessages[aiMessages.length - 1].id)
            }
          : s
      ));
    } else {
      if (!inputValue.trim() || isLoading) return;

      if (inputValue.startsWith('/')) {
        await handleCommand(inputValue);
        setInputValue('');
        setShowCommands(false);
        return;
      }

      userMessage = { 
        id: generateId(), 
        content: inputValue, 
        isUser: true, 
        timestamp: new Date() 
      };
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { 
              ...s, 
              messages: [...s.messages, userMessage],
              title: s.title === 'New Chat' ? inputValue.slice(0, 30) + '...' : s.title
            }
          : s
      ));
      setInputValue('');
    }

    setIsLoading(true);
    setIsTyping(true);
    const responseMessageId = generateId();
    const responseMessage: Message = { 
      id: responseMessageId, 
      content: '', 
      isUser: false, 
      timestamp: new Date(),
      isStreaming: true
    };
    
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, messages: [...s.messages, responseMessage] }
        : s
    ));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage.content }]
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulatedContent = '';
      let streamStartTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content === '[DONE]') continue;
            
            accumulatedContent += content;
            
            setSessions(prev => prev.map(s => 
              s.id === currentSessionId 
                ? { 
                    ...s, 
                    messages: s.messages.map(msg => 
                      msg.id === responseMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  }
                : s
            ));

            if (Date.now() - streamStartTime > 100) {
              setIsTyping(false);
            }
          }
        }
      }

      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { 
              ...s, 
              messages: s.messages.map(msg => 
                msg.id === responseMessageId 
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            }
          : s
      ));
    } catch (error) {
      console.error('Chat error:', error);
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { 
              ...s, 
              messages: s.messages.map(msg => 
                msg.id === responseMessageId 
                  ? { ...msg, content: 'Error: Failed to get response from AI', isStreaming: false }
                  : msg
              )
            }
          : s
      ));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowDown' && showCommands) {
      e.preventDefault();
      setSelectedCommandIndex(prev => 
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp' && showCommands) {
      e.preventDefault();
      setSelectedCommandIndex(prev => 
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === 'Tab' && showCommands && filteredCommands.length > 0) {
      e.preventDefault();
      const selectedCommand = filteredCommands[selectedCommandIndex];
      setInputValue(`/${selectedCommand.name} `);
      setShowCommands(false);
    }
  };

  const selectCommand = (command: Command) => {
    setInputValue(`/${command.name} `);
    setShowCommands(false);
    inputRef.current?.focus();
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: sidebarOpen ? '320px' : '0px',
        backgroundColor: '#1a1a1a',
        borderRight: '1px solid #333333',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        boxShadow: sidebarOpen ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #333333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1a1a1a'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600',
              color: '#ffffff',
              margin: 0
            }}>
              AI Chat
            </h1>
            <p style={{ 
              fontSize: '0.75rem', 
              color: '#a0a0a0', 
              margin: '0.25rem 0 0 0',
              fontWeight: '400'
            }}>
              Powered by Hack Club AI
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'transparent',
              border: '1px solid #333333',
              color: '#a0a0a0',
              cursor: 'pointer',
              fontSize: '1.25rem',
              borderRadius: '0.375rem',
              padding: '0.5rem',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2rem',
              height: '2rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2a2a2a';
              e.currentTarget.style.borderColor = '#404040';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#333333';
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem'
        }}>
          <button
            onClick={createNewSession}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: '#ffffff',
              color: '#0f0f0f',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              fontWeight: '500',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
            }}
          >
            + New Chat
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem',
                  backgroundColor: currentSessionId === session.id ? '#2a2a2a' : 'transparent',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  border: currentSessionId === session.id 
                    ? '1px solid #404040' 
                    : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onClick={() => setCurrentSessionId(session.id)}
                onMouseEnter={(e) => {
                  if (currentSessionId !== session.id) {
                    e.currentTarget.style.background = '#2a2a2a';
                    e.currentTarget.style.borderColor = '#404040';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentSessionId !== session.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                {currentSessionId === session.id && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: '#ffffff',
                    borderRadius: '0 2px 2px 0'
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0, marginLeft: currentSessionId === session.id ? '0.5rem' : '0' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#ffffff'
                  }}>
                    {session.title}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#a0a0a0',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>{session.messages.length} messages</span>
                    <span>•</span>
                    <span>{session.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                    opacity: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.background = '#2a1a1a';
                    e.currentTarget.style.borderColor = '#4a2a2a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #333333',
          backgroundColor: '#1a1a1a'
        }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: 'transparent',
              color: '#a0a0a0',
              border: '1px solid #333333',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2a2a2a';
              e.currentTarget.style.borderColor = '#404040';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#333333';
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#0f0f0f'
      }}>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              zIndex: 10,
              padding: '0.75rem',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              borderRadius: '0.5rem',
              color: '#a0a0a0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2a2a2a';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a1a';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
        )}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          paddingTop: sidebarOpen ? '1.5rem' : '5rem'
        }}>
          {currentSession && (
            <MessageList 
              messages={currentSession.messages} 
              isLoading={isLoading}
              isTyping={isTyping}
            />
          )}
        </div>

        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #333333',
          backgroundColor: '#1a1a1a',
          boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            maxWidth: '80rem',
            margin: '0 auto',
            alignItems: 'flex-end'
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                style={{
                  width: '100%',
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                  border: '1px solid #404040',
                  borderRadius: '0.75rem',
                  padding: '1rem 1.25rem',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                }}
                placeholder="Type a message or / for commands..."
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#404040';
                  e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
                }}
              />
              {isTyping && (
                <div style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#a0a0a0',
                  fontSize: '0.875rem'
                }}>
                  <div style={{
                    width: '2px',
                    height: '2px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  <div style={{
                    width: '2px',
                    height: '2px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite 0.2s'
                  }} />
                  <div style={{
                    width: '2px',
                    height: '2px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite 0.4s'
                  }} />
                </div>
              )}
              
              {showCommands && filteredCommands.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  marginBottom: '0.5rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 100
                }}>
                  {filteredCommands.map((command, index) => (
                    <div
                      key={command.name}
                      style={{
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        backgroundColor: index === selectedCommandIndex ? '#2a2a2a' : 'transparent',
                        borderBottom: index < filteredCommands.length - 1 ? '1px solid #2a2a2a' : 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => selectCommand(command)}
                      onMouseEnter={() => setSelectedCommandIndex(index)}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: '#ffffff',
                          borderRadius: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: '#0f0f0f',
                          fontWeight: '600'
                        }}>
                          {command.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#ffffff',
                            marginBottom: '0.25rem'
                          }}>
                            {command.usage}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#a0a0a0'
                          }}>
                            {command.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleSend()}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? '#404040' : '#ffffff',
                color: isLoading ? '#a0a0a0' : '#0f0f0f',
                padding: '1rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                fontWeight: '500',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
                boxShadow: isLoading ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.2)',
                minWidth: '100px'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
                }
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(15, 15, 15, 0.3)',
                    borderTop: '2px solid #0f0f0f',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Sending...
                </div>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '2.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            maxWidth: '36rem',
            width: '90%',
            border: '1px solid #333333'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#ffffff',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: '#0f0f0f'
              }}>
                ✨
              </div>
              <h2 style={{ 
                fontSize: '2rem', 
                fontWeight: '600', 
                marginBottom: '0.5rem',
                color: '#ffffff'
              }}>
                Welcome to AI Chat!
              </h2>
              <p style={{ 
                color: '#a0a0a0',
                fontSize: '1rem',
                lineHeight: '1.6'
              }}>
                Your intelligent conversation partner powered by advanced AI
              </p>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                marginBottom: '1rem',
                color: '#ffffff'
              }}>
                Available Commands:
              </h3>
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {COMMANDS.map((command) => (
                  <div key={command.name} style={{
                    padding: '1rem',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '0.5rem',
                    border: '1px solid #333333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: '#ffffff',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#0f0f0f'
                    }}>
                      {command.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <code style={{ 
                        color: '#ffffff', 
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        {command.usage}
                      </code>
                      <div style={{ 
                        color: '#a0a0a0', 
                        fontSize: '0.875rem',
                        marginTop: '0.25rem'
                      }}>
                        {command.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setShowModal(false)}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f0f0f',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
              }}
            >
              Start Chatting!
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '2rem',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            maxWidth: '32rem',
            width: '90%',
            border: '1px solid #333333'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600',
                color: '#ffffff'
              }}>
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #333333',
                  color: '#a0a0a0',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  borderRadius: '0.375rem',
                  padding: '0.5rem',
                  transition: 'all 0.2s ease',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2a2a2a';
                  e.currentTarget.style.borderColor = '#404040';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#333333';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#2a2a2a',
                borderRadius: '0.5rem',
                border: '1px solid #333333',
                marginBottom: '1rem'
              }}>
                <h3 style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  color: '#ffffff'
                }}>
                  Chat Statistics
                </h3>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#a0a0a0', fontSize: '0.875rem' }}>
                    Total Sessions: {sessions.length}
                  </span>
                  <span style={{ 
                    color: '#ffffff', 
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {sessions.reduce((acc, s) => acc + s.messages.length, 0)} messages
                  </span>
                </div>
              </div>
              
              <p style={{ 
                color: '#a0a0a0', 
                fontSize: '0.875rem',
                lineHeight: '1.6'
              }}>
                Manage your conversation history and preferences. All data is stored locally in your browser.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setSessions([]);
                  createNewSession();
                  setShowSettings(false);
                }}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: '#2a1a1a',
                  color: '#ef4444',
                  border: '1px solid #4a2a2a',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3a2a2a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2a1a1a';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Clear All
              </button>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: '#2a2a2a',
                  color: '#a0a0a0',
                  border: '1px solid #333333',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3a3a3a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2a2a2a';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
