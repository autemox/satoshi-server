/*
 collection of openai functions like simpleQuery, messagesToString, stringToMessages, estimateTokens, shortenMessages
 note needs .env file with OPENAI_API_KEY
*/

import { openAi } from "./openAi";
import dotenv from "dotenv";

dotenv.config();

interface Message {
    role: 'system' | 'user';
    content: string;
}

export class OpenAiUtils {

    LONG_CONVERSATION_SUMMARIZER_USE_GPT3: boolean = false;

    public constructor() {}

    public messagesToString(messages: Message[], systemName = "System", userName = "User", limit = 0): string { 
        const filteredMessages = messages.filter(message => message && typeof message.content !== 'undefined' && !message.content.startsWith("Directive:"));
        const recentMessages = (limit > 0 && limit < filteredMessages.length) ? filteredMessages.slice(-limit) : filteredMessages;
        
        return recentMessages.map(message => `${message.role}: ${message.content}`)
            .join(' \n ')
            .replace(/system/g, systemName)
            .replace(/user/g, userName);
    }

    public getRecentUserMessage(messages: Message[]): string { 
        if (!messages || messages.length === 0) return "";
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                return messages[i].content;
            }
        }
        return "";
    }

    public stringToMessages(str: string): Message[] {
        const pairs = str.split(/\s(?=(system|user):)/i);
        return pairs.map(pair => {
            const [role, ...contentArr] = pair.split(':');
            return {
                role: role.trim().toLowerCase() as 'system' | 'user',
                content: contentArr.join(':').trim()
            };
        });
    }

    public estimateTokens(strOrMsg: string | Message[]): number {
        let str = Array.isArray(strOrMsg) ? this.messagesToString(strOrMsg) : strOrMsg;
        const tokens = str.split(/[\s.,!?;"'(){}\[\]:]+/);
        const nonEmptyTokens = tokens.filter(token => token.length > 0);
        return nonEmptyTokens.length;
    }

    async shortenMessages(messages: Message[], debugQueryLog: {value: string}): Promise<Message[]> {
        
        const totalContentLength = messages.reduce((sum, item) => sum + item.content.length, 0);
        let firstArray: Message[] = [];
        let secondArray: Message[] = [];
        let firstArrayContentLength = 0;
    
        for (let item of messages) {
            if (firstArrayContentLength + item.content.length <= totalContentLength / 2) {
                firstArray.push(item);
                firstArrayContentLength += item.content.length;
            } else {
                secondArray.push(item);
            }
        }
    
        let model = this.LONG_CONVERSATION_SUMMARIZER_USE_GPT3 ? "gpt-3.5-turbo-16k" : "gpt-4-0613";
        let str = this.messagesToString(firstArray);
        let shortStr = await this.simpleQuery(
            "Shorten this conversation preserving only key details (names, actions, emotions), but keep it in conversation format: " + str,
            model,
            debugQueryLog
        );
        if(!shortStr) 
            {
                shortStr = str.substring(0, Math.floor(str.length/2));
                console.error("[openaiUtils shortenMessages] Shortening failed, using half of the conversation instead.");
            }
        firstArray = this.stringToMessages(shortStr);
    
        return firstArray.concat(secondArray);
    }

    public sleep(ms: number): Promise<void> { 
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async simpleQuery(query: string, model: string, debugLog: {value: string}): Promise<string | null> {

        debugLog.value += `\n\n==> ==> ==> ==> ==> ==> ==> ==> ==> ==> OUT:`;
        debugLog.value += `\n[OpenAiUtils simpleQuery] Query: ${query}`;
        
        const result = await this.queryMessages([
            { "role": "system", "content": "You are a helpful assistant." },
            { "role": "user", "content": query }
        ], model);

        debugLog.value += `\n\n==> ==> ==> ==> ==> ==> ==> ==> ==> ==> IN:`;
        debugLog.value += `\n[OpenAiUtils simpleQuery] Result: ${result}`;

        return result;
    }
  
    async queryMessages(messages: Message[], model: string): Promise<string | null> {
        model = (model === '3' || model === "3") ? "gpt-3.5-turbo-16k" : (model === '4' || model === "4") ? "gpt-4-0613" : model;
        const response = await openAi.chat.completions.create({
            model: model,
            messages: messages as any
        });
        return response.choices[0].message.content?.trim() || null;
    }
}

export default OpenAiUtils;
