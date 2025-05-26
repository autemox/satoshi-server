/*
 uses StreamingClient to stream LLM responses.  this takes each chunk of words in handleContent() and 
 once a full message is received, it sends it to handleStreamedMessage() in ActManager via a callback
*/

import { StreamingClient } from './StreamingClient';
import { IStreamMessages } from './IStreamMessages';
import { StreamEndReason } from './StreamingClient';
import { IStreamingClient } from './IStreamingClient';
import { ChatMsg } from '../../../models/ChatMsg';

export class StreamMessages implements IStreamMessages {

    private streamingClient: IStreamingClient;
    private accumulatedContent: string = '';
    private isStreaming: boolean = false; // whether or not we are accepting new content coming in

    constructor(
        private playerName: string,
        private characterNames: string[],
        private debugQueryLog: { value: string }, // inject queryLog object
        private handleStreamedMessage: (message: ChatMsg) => void,
        private handleStreamEnded: (reason: StreamEndReason) => void = (reason: StreamEndReason) => { } 
    ) {
        this.streamingClient = new StreamingClient(this.handleContent.bind(this), this.streamEnded.bind(this), this.debugQueryLog);
    }

    public startStream(storytellingPrompt: string): void {

        // reset/cancel current stream
        if(this.isStreaming) this.cancelStream();

        // start new stream
        console.log('[StreamMessages generateDialogue] Starting chat completion stream...');
        this.isStreaming = true;
        this.streamingClient.startStream(storytellingPrompt);
    }

    // Handle a chunk of data from the stream
    public handleContent(content: string): void {

        if(!this.isStreaming) return; // we dont want to see any more content, which is why we canceled
        this.accumulatedContent += content;
        this.processContent();        // process in seperate async function
    }

    public async processContent(forceProcessFinalLine: boolean = false): Promise<void> {

        if(!this.isStreaming) return; // we dont want to see any more content, which is why we canceled
        
        // split by \n OR "[character name]:" pattern
        const allNames = [...this.characterNames, this.playerName, "System"];
        const namePattern = new RegExp(`(^|\\n)(${allNames.join('|')}):\\s*`, 'g');
        const lines = this.accumulatedContent.split('\n').filter(l => l.trim());

        // process up to 1 line each call
        if(lines.length > 1 || forceProcessFinalLine && lines.length == 1) 
        {
                // console.log(`[StreamMessages processContent] 🟢🟢🟢 Processing line: ${lines[0]}`);
                const messages = ChatMsg.chatTextToMessages(lines[0], this.playerName, [...allNames], "Invalid", allNames[0]);
                if (messages && messages.length > 0) {
                    for (const message of messages) this.handleStreamedMessage(message);
                }

                // remove line from accumulated content
                await this.removeFromAccumulatedContent(lines[0]);
        }
    }

    async removeFromAccumulatedContent(line: string): Promise<void> {
        
        const index = this.accumulatedContent.indexOf(line); // Find the exact position of the line in the accumulated content
        if (index !== -1) {
            this.accumulatedContent = this.accumulatedContent.substring(index + line.length + 1); // Remove the line and the newline character(s) that follow it
        }
    }

    public cancelStream(): void {

        this.streamingClient.cancelStream();
        this.streamEnded(StreamEndReason.USER_CANCELLED);
    }

    public async streamEnded(reason: StreamEndReason) {

        if(this.isStreaming && reason != StreamEndReason.USER_CANCELLED) {
            console.log(`[StreamMessages streamEnded] Stream ended by API, not user.`);
            await this.processContent(true); // attempt to process the final line
        }

        this.accumulatedContent = '';
        this.isStreaming = false;

        // tell the creator stream has end using a callback
        this.handleStreamEnded(reason);
    }
}