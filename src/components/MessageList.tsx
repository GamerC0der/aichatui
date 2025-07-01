import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  isLoading?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onRegenerate?: (messageId: string) => void;
}

export default function MessageList({ messages, isLoading, onRegenerate }: MessageListProps) {
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());

  const handleCopy = async (messageId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessages(prev => new Set(prev).add(messageId));
    setTimeout(() => {
      setCopiedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      });
    }, 750);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative group ${message.isUser ? '' : 'flex items-start gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl p-1 -m-1 transition-colors duration-200'}`}>
              <div className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-4 py-3 ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600'
              }`}>
                {message.isUser ? (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                ) : (
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          return (
                            <code
                              className={`${className} ${inline ? 'bg-slate-100 dark:bg-slate-600 px-1 py-0.5 rounded text-xs' : 'block bg-slate-100 dark:bg-slate-600 p-3 rounded-lg text-xs overflow-x-auto'}`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre({ children }) {
                          return <pre className="bg-slate-100 dark:bg-slate-600 p-3 rounded-lg text-xs overflow-x-auto">{children}</pre>;
                        },
                        p({ children }) {
                          return <p className="mb-2 last:mb-0">{children}</p>;
                        },
                        ul({ children }) {
                          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                        },
                        ol({ children }) {
                          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                        },
                        li({ children }) {
                          return <li className="text-sm">{children}</li>;
                        },
                        blockquote({ children }) {
                          return <blockquote className="border-l-4 border-slate-300 dark:border-slate-500 pl-4 italic text-slate-600 dark:text-slate-400">{children}</blockquote>;
                        },
                        h1({ children }) {
                          return <h1 className="text-lg font-bold mb-2">{children}</h1>;
                        },
                        h2({ children }) {
                          return <h2 className="text-base font-bold mb-2">{children}</h2>;
                        },
                        h3({ children }) {
                          return <h3 className="text-sm font-bold mb-1">{children}</h3>;
                        },
                        table({ children }) {
                          return <div className="overflow-x-auto"><table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600">{children}</table></div>;
                        },
                        th({ children }) {
                          return <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 bg-slate-50 dark:bg-slate-600 text-left text-xs font-medium">{children}</th>;
                        },
                        td({ children }) {
                          return <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs">{children}</td>;
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              
              {!message.isUser && onRegenerate && message.id !== '1' && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onRegenerate(message.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:scale-110 transform"
                    title="Regenerate response"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCopy(message.id, message.content)}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:scale-110 transform"
                    title="Copy response"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {copiedMessages.has(message.id) ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-700 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-600">
              <div className="flex space-x-1">
                {[0, 0.1, 0.2].map((delay, i) => (
                  <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 