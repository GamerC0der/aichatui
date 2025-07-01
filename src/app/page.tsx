'use client';

import { useState, useEffect } from 'react';
import ModelSelector from '@/components/ModelSelector';
import MessageList from '@/components/MessageList';
import ChatHistory from '@/components/ChatHistory';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', content: 'Hello! I\'m your AI assistant. How can I assist you today?', isUser: false },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llamascout');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [temperature, setTemperature] = useState(0.7);
  const [advancedParams, setAdvancedParams] = useState('{}');
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const savedSystemPrompt = localStorage.getItem('systemPrompt');
    const savedTemperature = localStorage.getItem('temperature');
    const savedAdvancedParams = localStorage.getItem('advancedParams');
    
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
    if (savedTemperature) {
      setTemperature(parseFloat(savedTemperature));
    }
    if (savedAdvancedParams) {
      setAdvancedParams(savedAdvancedParams);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('systemPrompt', systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    localStorage.setItem('temperature', temperature.toString());
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem('advancedParams', advancedParams);
  }, [advancedParams]);

  // Save current session to localStorage
  useEffect(() => {
    if (messages.length > 1) { // Don't save the initial greeting
      const firstUserMessage = messages.find(msg => msg.isUser);
      const sessionData = {
        messages,
        timestamp: Date.now(),
        title: firstUserMessage?.content ? (firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')) : 'New Chat'
      };
      localStorage.setItem(`chat_${currentSessionId}`, JSON.stringify(sessionData));
      
      // Update sessions list
      const existingSessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
      const sessionIndex = existingSessions.findIndex((s: any) => s.id === currentSessionId);
      const sessionInfo = {
        id: currentSessionId,
        title: sessionData.title,
        timestamp: sessionData.timestamp,
        messageCount: messages.length
      };
      
      if (sessionIndex >= 0) {
        existingSessions[sessionIndex] = sessionInfo;
      } else {
        existingSessions.unshift(sessionInfo);
      }
      
      localStorage.setItem('chatSessions', JSON.stringify(existingSessions));
    }
  }, [messages, currentSessionId]);

  const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const loadSession = (sessionId: string) => {
    try {
      const sessionData = localStorage.getItem(`chat_${sessionId}`);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        setMessages(parsed.messages);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const startNewChat = () => {
    setMessages([{ id: '1', content: 'Hello! I\'m your AI assistant. How can I assist you today?', isUser: false }]);
    setCurrentSessionId(generateSessionId());
  };

  const clearAllChats = () => {
    try {
      // Get all session IDs
      const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
      
      // Remove all session data
      sessions.forEach((session: any) => {
        localStorage.removeItem(`chat_${session.id}`);
      });
      
      // Clear sessions list
      localStorage.removeItem('chatSessions');
      
      // Start new chat
      startNewChat();
      
      // Trigger refresh of chat history
      setRefreshTrigger(prev => prev + 1);
      
      // Close settings
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Error clearing chats:', error);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { id: generateMessageId(), content: userMessage, isUser: true }]);
    setInputValue('');
    setIsLoading(true);

    const aiMessageId = generateMessageId();
    setMessages(prev => [...prev, { id: aiMessageId, content: '', isUser: false }]);

    const chatHistory = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          model: selectedModel,
          stream: true,
          temperature: temperature,
          ...JSON.parse(advancedParams)
        })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.content || '';
              if (content) {
                accumulatedContent += content;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              }
            } catch (e) {
              // skip stuff here
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ));
    }
    setIsLoading(false);
  };

  const handleRegenerate = async (messageId: string) => {
    if (isLoading) return;

    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].isUser) return;

    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || !messages[userMessageIndex].isUser) return;

    const userMessage = messages[userMessageIndex].content;
    
    setMessages(prev => prev.filter((_, index) => index !== messageIndex));
    setIsLoading(true);

    const aiMessageId = generateMessageId();
    setMessages(prev => [...prev, { id: aiMessageId, content: '', isUser: false }]);

    const chatHistory = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(0, userMessageIndex + 1).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          model: selectedModel,
          stream: true,
          temperature: temperature,
          ...JSON.parse(advancedParams)
        })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.content || '';
              if (content) {
                accumulatedContent += content;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              }
            } catch (e) {
              // skip stuff here
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again later.' }
          : msg
      ));
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <ChatHistory 
        onLoadSession={loadSession}
        currentSessionId={currentSessionId}
        onNewChat={startNewChat}
        refreshTrigger={refreshTrigger}
      />
      
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 relative">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Chat</h1>
            <p className="text-slate-600 dark:text-slate-400">Your intelligent AI assistant</p>
          </div>
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </div>
        
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-4 right-6 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>/

      <MessageList messages={messages} isLoading={isLoading} onRegenerate={handleRegenerate} />

      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white px-4 py-3 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={() => setIsSettingsOpen(false)}
        />
        
        <div className={`relative ml-auto w-96 max-w-full bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ease-out ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Model
                </label>
                <ModelSelector
                  value={selectedModel}
                  onChange={setSelectedModel}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter system prompt..."
                  className="w-full h-32 resize-none border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Temperature: {temperature}
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-3 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(temperature / 2) * 100}%, #e2e8f0 ${(temperature / 2) * 100}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="absolute -top-6 left-0 right-0 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>0</span>
                    <span>1</span>
                    <span>2</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    Focused
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Balanced
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                    Creative
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Advanced Parameters (JSON)
                </label>
                <textarea
                  value={advancedParams}
                  onChange={(e) => setAdvancedParams(e.target.value)}
                  placeholder='{"max_tokens": 1000, "top_p": 0.9}'
                  className="w-full h-24 resize-none border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add any additional parameters as JSON. These will be merged with the request.
                </p>
                
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Examples:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAdvancedParams('{"max_tokens": 1000, "top_p": 0.9}')}
                      className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Balanced
                    </button>
                    <button
                      onClick={() => setAdvancedParams('{"max_tokens": 2000, "top_p": 0.7, "frequency_penalty": 0.1}')}
                      className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Creative
                    </button>
                    <button
                      onClick={() => setAdvancedParams('{"max_tokens": 500, "top_p": 0.1, "presence_penalty": 0.2}')}
                      className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Focused
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Chat History
                </label>
                <button
                  onClick={clearAllChats}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All Chats
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  This will permanently delete all your chat history and cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
