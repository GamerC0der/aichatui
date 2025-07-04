'use client';

import { useState } from 'react';

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
};

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isTyping?: boolean;
  onRegenerate?: () => void;
}

export function MessageList({ messages, isLoading, isTyping }: MessageListProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isImageUrl = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || url.includes('pollinations.ai');
  };

  const appendNoLogo = (url: string) => {
    if (url.includes('pollinations.ai')) {
      if (url.includes('?')) {
        if (!url.includes('nologo=')) {
          return url + '&nologo=true';
        }
      } else {
        return url + '?nologo=true';
      }
    }
    return url;
  };

  const formatMessage = (content: string) => {
    if (isImageUrl(content)) {
      const imgUrl = appendNoLogo(content);
      return (
        <div style={{ marginTop: '0.5rem' }}>
          <img
            src={imgUrl}
            alt="Generated image"
            style={{
              maxWidth: '300px',
              maxHeight: '200px',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              border: '1px solid #e0e0e0',
              transition: 'all 0.2s ease',
              objectFit: 'cover'
            }}
            onClick={() => setSelectedImage(imgUrl)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{
            fontSize: '0.75rem',
            color: '#a0a0a0',
            marginTop: '0.5rem',
            fontStyle: 'italic'
          }}>
            Click to view full size
          </div>
        </div>
      );
    }
    
    if (content.includes('/image')) {
      const parts = content.split('/image');
      return (
        <div>
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < parts.length - 1 && (
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#f0f0f0',
                  color: '#0f0f0f',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: '1px solid #d0d0d0',
                  margin: '0 0.25rem',
                  fontFamily: 'monospace'
                }}>
                  /image
                </span>
              )}
            </span>
          ))}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '0.5rem',
            borderLeft: '4px solid #007bff'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '1.25rem',
                color: '#007bff'
              }}>
                🎨
              </span>
              <span style={{
                fontWeight: '600',
                color: '#0f0f0f',
                fontSize: '0.875rem'
              }}>
                Image Generation
              </span>
            </div>
            <p style={{
              color: '#6c757d',
              fontSize: '0.875rem',
              margin: '0 0 0.75rem 0',
              lineHeight: '1.4'
            }}>
              To generate an image, use the <code style={{
                backgroundColor: '#e9ecef',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                color: '#0f0f0f'
              }}>/image</code> command followed by your description.
            </p>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              color: '#0f0f0f'
            }}>
              /image a beautiful sunset over mountains
            </div>
          </div>
        </div>
      );
    }
    
    return content;
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '1rem 0',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      {messages.map((message) => (
        <div
          key={message.id}
          style={{
            display: 'flex',
            justifyContent: message.isUser ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}
        >
          {!message.isUser && (
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#0f0f0f',
              flexShrink: 0
            }}>
              AI
            </div>
          )}
          
          <div style={{
            maxWidth: '70%',
            backgroundColor: message.isUser ? '#ffffff' : '#f5f5f5',
            color: message.isUser ? '#0f0f0f' : '#0f0f0f',
            padding: '1rem 1.25rem',
            borderRadius: '1rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            border: message.isUser ? 'none' : '1px solid #e0e0e0',
            position: 'relative',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {message.isStreaming && (
              <div style={{
                position: 'absolute',
                right: '0.5rem',
                top: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <div style={{
                  width: '2px',
                  height: '2px',
                  backgroundColor: message.isUser ? '#0f0f0f' : '#ffffff',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite'
                }} />
                <div style={{
                  width: '2px',
                  height: '2px',
                  backgroundColor: message.isUser ? '#0f0f0f' : '#ffffff',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite 0.2s'
                }} />
                <div style={{
                  width: '2px',
                  height: '2px',
                  backgroundColor: message.isUser ? '#0f0f0f' : '#ffffff',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite 0.4s'
                }} />
              </div>
            )}
            
            {formatMessage(message.content)}
            
            <div style={{
              fontSize: '0.75rem',
              color: message.isUser ? 'rgba(15, 15, 15, 0.7)' : '#a0a0a0',
              marginTop: '0.5rem',
              textAlign: 'right'
            }}>
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
          
          {message.isUser && (
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#0f0f0f',
              flexShrink: 0
            }}>
              You
            </div>
          )}
        </div>
      ))}
      
      {isTyping && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#0f0f0f',
            flexShrink: 0
          }}>
            AI
          </div>
          <div style={{
            backgroundColor: '#f5f5f5',
            color: '#0f0f0f',
            padding: '1rem 1.25rem',
            borderRadius: '1rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
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
            <span style={{ fontSize: '0.875rem', color: '#a0a0a0' }}>
              AI is typing...
            </span>
          </div>
        </div>
      )}
      
      {selectedImage && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease-out',
            overflow: 'auto',
          }} 
          onClick={() => setSelectedImage(null)}
        >
          <div style={{
            position: 'relative',
            maxWidth: '100vw',
            maxHeight: '100vh',
            animation: 'scaleIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src={appendNoLogo(selectedImage || '')}
              alt="Full size image"
              style={{
                maxWidth: '100vw',
                maxHeight: '100vh',
                borderRadius: '1rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                objectFit: 'contain',
                display: 'block',
                margin: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: '-1rem',
                right: '-1rem',
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '50%',
                width: '3rem',
                height: '3rem',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: '#0f0f0f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
              }}
            >
              ×
            </button>
            <div style={{
              position: 'absolute',
              bottom: '-3rem',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              Click outside to close
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
} 