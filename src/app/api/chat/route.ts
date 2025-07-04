import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;
    
    const systemMessage = {
      role: 'system',
      content: 'You are a helpful AI assistant. When users want to generate images, you must instruct them to use the /image command followed by their description. For example: "To generate an image, please use the /image command like this: /image [your description here]". Do not attempt to generate images yourself - only guide users to use the /image command.'
    };
    
    const messagesWithSystem = [systemMessage, ...messages];
    
    console.log('Sending request to Hack Club AI:', { messages: messagesWithSystem });
    
    const response = await fetch('https://ai.hackclub.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: messagesWithSystem,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    console.log('Hack Club AI response status:', response.status);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream available');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          let hasContent = false;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            console.log('Raw chunk:', chunk);
            buffer += chunk;
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              
              console.log('Processing line:', trimmedLine);
              
              let data = trimmedLine;
              if (trimmedLine.startsWith('data: ')) {
                data = trimmedLine.slice(6);
              }
              
              console.log('Processing data line:', data);
              if (data === '[DONE]') {
                console.log('Received [DONE] signal');
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              
              try {
                const parsed = JSON.parse(data);
                console.log('Parsed JSON:', parsed);
                console.log('Choices array:', parsed.choices);
                console.log('First choice:', parsed.choices?.[0]);
                console.log('Delta:', parsed.choices?.[0]?.delta);
                const content = parsed.choices?.[0]?.delta?.content;
                console.log('Content check:', { content, isUndefined: content === undefined, isNull: content === null, type: typeof content });
                if (content !== undefined && content !== null) {
                  console.log('Sending content:', content);
                  controller.enqueue(encoder.encode(`data: ${content}\n\n`));
                  hasContent = true;
                  console.log('hasContent set to true');
                }
                if (parsed.choices?.[0]?.finish_reason === 'stop') {
                  console.log('Received stop signal');
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch (e) {
                console.log('Error:', e);
                continue;
              }
            }
          }
          
          console.log('Final hasContent state:', hasContent);
          if (!hasContent) {
            console.log('No content received, sending error message');
            controller.enqueue(encoder.encode('data: Sorry, I encountered an issue processing your request. Please try again.\n\n'));
          }
          
          console.log('Stream finished');
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode('data: An error occurred while processing your request.\n\n'));
        } finally {
          reader.releaseLock();
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
