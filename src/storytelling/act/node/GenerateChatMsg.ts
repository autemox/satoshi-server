/*
 
*/

import { OpenAiUtils } from '../../utils/openAi/openAiUtils';
import { ChatMsg } from "../../../models/ChatMsg";

export class GenerateChatMsg {

    static async GeneratePlayerChatMsg(prompt: string, messages: ChatMsg[], debugQueryLog: { value: string }, playerName: string): Promise<string> {

        const openAiUtils = new OpenAiUtils();

        // create the query
        const query = `Given the following prompt and conversation context, generate a response from ${playerName}.\n\n` +
        `Prompt: ${prompt}\n\n` +
        `Conversation:\n${ChatMsg.messagesToString(messages)}\n\n` +
        `Player response:`;

        const result = await openAiUtils.simpleQuery(query, "gpt-4-0613", debugQueryLog);
        if (!result) throw new Error("Failed to generate player chat message.");
        return result;
    }

    static async GenerateAlternativeChatMsg(prompt: string, messages: ChatMsg[], debugQueryLog: { value: string }, style: string = "random"): Promise<string> {

        // allow for different styles of the alternative message
        if(style =="random") style = GenerateChatMsg.RandomStyle();
        let styleExtension = style == "none" || style == "" ? 
            `that is different than the player's original response` : 
            `that is **${style}** compared to the player's original response`;
        
        const openAiUtils = new OpenAiUtils();
        const lastPlayerMessage = messages.filter(m => m.name.toLowerCase() === 'player').pop();
        const playerResponse = lastPlayerMessage ? lastPlayerMessage.message : "";

        // create the query
        const query = `Given the following prompt and conversation, generate a new player response ${styleExtension}. Make sure it is noticeably different and fun.\n\n` +
            `Prompt: ${prompt}\n\n` +
            `Conversation:\n${ChatMsg.messagesToString(messages)}\n\n` +
            `Original player response: "${playerResponse}"\n\n` +
            `New alternative player response:`;

        const result = await openAiUtils.simpleQuery(query, "gpt-4-0613", debugQueryLog);
        if (!result) throw new Error("Failed to generate alternative chat message.");
        return result;
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
