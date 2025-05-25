/*
 starts an LLM stream and delivers chunks to the callback from StreamMessages
 needs .env file with OPENAI_API_KEY or DEEPSEEK_API_KEY
*/

import axios, { AxiosResponse } from 'axios';

// Stream class to hold all stream-related data
class Stream {
    isActive: boolean;
    request: any;
    jsonBuffer: string;
    log: string;
    prompt: string;
    id: string;
    abortController: AbortController;

    constructor(id: string, prompt: string) {
        this.isActive = true;
        this.request = null;
        this.jsonBuffer = '';
        this.log = '';
        this.prompt = prompt;
        this.id = id;
        this.abortController = new AbortController();
    }
}

export enum StreamEndReason {
    DONE_STRING = "DONE_STRING (SERVER CANCELLED)",
    END_EVENT = "END_EVENT (SERVER CANCELLED)",
    USER_CANCELLED = "USER_CANCELLED"
  }

export class StreamingClient {
    private apiKey: string;

    private API_NAME: string = 'OpenAI'; // 'DeepSeek'
    private API_URL: string = 'https://api.openai.com/v1/chat/completions'; //'https://api.deepseek.com/chat/completions';
    private API_MODEL = "gpt-4";   // deepseek-chat, gpt-4
    private API_HEADERS_ACCEPT = "text/event-stream"; // open ai uses "text/event-stream", deepseek uses "application/json"

    private streams: Stream[] = []; // Array to store all streams
    private cancelledIds: Set<string> = new Set(); // track old ids that have been cancelled
    private streamIdCount = 0;
    private currentId: string = 'NONE';
    
    private onContentCallback: (content: string) => void;
    private onEndStreamCallback: (reason: StreamEndReason) => void;
    private debugQueryLog: {value: string }; // debug log object to append to

    constructor(onContentCallback: (content: string) => void,
        onEndStreamCallback: (reason: StreamEndReason) => void,
        debugQueryLog: {value: string}
    ) {
        this.apiKey = this.API_NAME == 'DeepSeek' ? process.env.DEEPSEEK_API_KEY || "" : process.env.OPENAI_API_KEY || "";
        this.onContentCallback = onContentCallback;
        this.onEndStreamCallback = onEndStreamCallback;
        this.debugQueryLog = debugQueryLog;
    }

    public async startStream(prompt: string): Promise<void> {
        // Create new stream ID
        this.streamIdCount++;
        const streamId = `stream_${this.streamIdCount}`;
        this.currentId = streamId;
        
        // Create and store new stream
        const stream = new Stream(streamId, prompt);
        this.streams.push(stream);

        // Log
        console.log(`[StreamingClient startStream] Starting stream: ${streamId} with prompt: ${prompt}`);
        this.debugQueryLog.value += `\n🎬🎬🎬 StreamingClient startStream ${streamId}\n`;
        this.debugQueryLog.value += `AWAITING RESPONSE.\n`;
        this.debugQueryLog.value += `-------------\n`;

        // Set up stream data
        const data = {
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt }
            ],
            model: this.API_MODEL,
            stream: true,
            temperature: 1.0,
            max_tokens: 2048
        };

        try {
            stream.request = await axios.post(this.API_URL, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': this.API_HEADERS_ACCEPT
                },
                responseType: 'stream',
                signal: stream.abortController.signal
            });
            const response = await stream.request;

            response.data.on('data', (chunk: Buffer) => {

                if (this.cancelledIds.has(streamId)) return; // If the request was cancelled, don't process

                // Find stream in array
                const currentStream = this.streams.find(s => s.id === streamId);
                if (!currentStream || !currentStream.isActive) return;

                // Find json piece in chunk
                const jsonStrings = chunk.toString().split('data: ');

                // Handle starting and ending data packets, which are often incomplete
                jsonStrings[0] = currentStream.jsonBuffer + jsonStrings[0];
                currentStream.jsonBuffer = jsonStrings.pop() || '';

                // Iterate json packets
                jsonStrings.forEach(jsonString => {
                    try {
                        if (jsonString.trim() === '') return; // Check for empty string

                        // Check if stream is done method 1
                        if (jsonString.trim() === '[DONE]') {
                            this.streamEnded(streamId, StreamEndReason.DONE_STRING);
                            return;
                        }

                        // Collect json content and post to callback
                        const json = JSON.parse(jsonString.trim());
                        const content = json.choices[0]?.delta?.content || '';
                        currentStream.log += content;
                        if (content != '') this.onContentCallback(content);

                        // Check if stream is done method 2
                        if (json.choices[0]?.finish_reason) {
                            this.streamEnded(streamId, json.choices[0].finish_reason);
                            return;
                        }
                    } catch (error) {
                        console.warn('Error parsing JSON from API:', error);
                    }
                });
            });

            // Check if stream is done method 3
            response.data.on('end', () => {
                this.streamEnded(streamId, StreamEndReason.END_EVENT);
            });

        } catch (error) {
            console.error('Error streaming from API:', error);
            // Find and mark stream as inactive
            const streamIndex = this.streams.findIndex(s => s.id === streamId);
            if (streamIndex !== -1) this.streams[streamIndex].isActive = false;
        }
    }

    public cancelStream(): void {
        if (this.currentId == "NONE") return;

        this.cancelledIds.add(this.currentId);
        
        const currentStream = this.streams.find(s => s.id === this.currentId);
        if (currentStream) {
            currentStream.abortController.abort();
            this.streamEnded(this.currentId, StreamEndReason.USER_CANCELLED);
        } else {
            console.warn('[StreamingClient cancelStream] No active stream to cancel');
        }
    }

    private streamEnded(id: string, reason: StreamEndReason): void {
        // Find the stream
        const streamIndex = this.streams.findIndex(s => s.id === id);
        if (streamIndex === -1) return;
        
        const stream = this.streams[streamIndex];
        if (!stream.isActive) return; // streams already been ended before
        stream.isActive = false;

        // Log
        console.log(`[StreamingClient streamEnded] Stream ended: ${id} ${reason} original prompt: ${stream.prompt}`);
        this.debugQueryLog.value += `\n🎬🎬🎬 StreamingClient streamEnded: ${id} ${reason}\n`;
        this.debugQueryLog.value += `PROMPT:\n`;
        this.debugQueryLog.value += `${stream.prompt}\n`;
        this.debugQueryLog.value += `FULL RESPONSE:\n`;
        this.debugQueryLog.value += `${stream.log}\n`;
        this.debugQueryLog.value += `-------------\n`;

        // Cleanup
        this.cancelledIds.add(id);
        if (this.currentId === id) this.currentId = 'NONE'; // Don't set to '' because we want to ignore remaining packets
        
        // Keep the stream in the array for now, but this could be cleaned up on a timer later
        //setTimeout(() => { const delayedIndex = this.streams.findIndex(s => s.id === id); if (delayedIndex !== -1) { this.streams.splice(delayedIndex, 1); } }, 1000);  // Wait 500ms before removing the stream

        this.onEndStreamCallback(reason);
    }
}