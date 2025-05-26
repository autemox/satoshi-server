/*
 
*/

import { OpenAiUtils } from '../../utils/openAi/openAiUtils';
import { ChatMsg } from "../../../models/ChatMsg";

export class GenerateChatMsg {

    static async GeneratePlayerChatMsg(prompt: string, messages: ChatMsg[], debugQueryLog: { value: string }, playerName: string): Promise<ChatMsg> {

        const openAiUtils = new OpenAiUtils();

        // create the query
        const query = `Given the following prompt and conversation context, generate a short phrase or short sentence response from ${playerName}.\n\n` +
        `Prompt: ${prompt}\n\n` +
        `Conversation:\n${ChatMsg.messagesToString(messages)}\n\n` +
        `Player response:`;

        const result = await openAiUtils.simpleQuery(query, "gpt-4-0613", debugQueryLog);
        if (!result) throw new Error("Failed to generate player chat message.");

        const chatMsg:ChatMsg|undefined = ChatMsg.trimMessage(new ChatMsg(playerName, result));
        if(!chatMsg) throw new Error("Generated player chat message '"+result+"' is invalid.");

        return chatMsg;
    }

    static async GenerateAlternativeChatMsg(prompt: string, messages: ChatMsg[], debugQueryLog: { value: string }, style: string = "random"): Promise<ChatMsg> {

        // allow for different styles of the alternative message
        if(style =="random") style = GenerateChatMsg.RandomStyle();
        let styleExtension = style == "none" || style == "" ? 
            `that is different than the player's original response` : 
            `that is **${style}** compared to the player's original response`;
        
        const openAiUtils = new OpenAiUtils();
        const lastMessage = messages.pop();
        if (!lastMessage) throw new Error("No messages provided to generate alternative chat message.");

        // create the query
        const query = `Given the following prompt and conversation, generate a unique response ${styleExtension}.\n\n` +
            `Prompt: ${prompt}\n\n` +
            `Conversation:\n${ChatMsg.messagesToString(messages)}\n\n` +
            `Original response: "${lastMessage.message}"\n\n` +
            `New alternative response:`;

        const result = await openAiUtils.simpleQuery(query, "gpt-4-0613", debugQueryLog);
        if (!result) throw new Error("Failed to generate alternative chat message.");
        
        const chatMsg:ChatMsg|undefined = ChatMsg.trimMessage(new ChatMsg(lastMessage.name, result));
        if(!chatMsg) throw new Error("Generated alternative chat message '"+result+"' is invalid.");
        
        return chatMsg;
    }

    static RandomStyle(): string {

        const styles = [
            "opposite",
            "overly positive",
            "overly negative",
            "funny",
            "bored",
            "sarcastic",
            "curious",
            "confused"
        ];
        return styles[Math.floor(Math.random() * styles.length)];
    }
}
