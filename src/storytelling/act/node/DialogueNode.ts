/*
 stores storyName, prompt, hash, and messages
 allows the game to reuse prompts without requerying the server
 streams from StreamMessages and creates new nodes as needed 
 - continuation nodes are not supposed to forward anything to the nodemanager.  only the first node
 - its intentional to create a new node anytime theres a player message.  that is how we create multiple nodes from one stream
*/

import { ChatMsg } from '../../../models/ChatMsg';
import { IStreamMessages } from './../../utils/deepseek/IStreamMessages';
import { StreamMessages } from './../../utils/deepseek/StreamMessages';
import { GenerateChatMsg } from './GenerateChatMsg';
import { INodeManager } from './INodeManager';
import { NodeManager } from './NodeManager';
import { StreamEndReason } from './../../utils/deepseek/StreamingClient';
import { Chat } from 'openai/resources/chat';


export class DialogueNode 
{
    public messages: ChatMsg[] = [];
    public streamMessages: IStreamMessages|undefined;
    private nextNode: DialogueNode | undefined; // next node to continue the dialogue if stream doesnt end
    public hash: string; // unique identifier for this node, based on the prompt

    constructor(
        public prompt: string, 
        public storyName: string, 
        private nodeManager: INodeManager,
        public continuationNode: boolean = false) // whether this node is a continuation of a previous node)
    {
        // hash the prompt
        this.hash = DialogueNode.hashPrompt(prompt);

    }
    
    public static hashPrompt(prompt: string): string { // creates a 10 character unique hash 'name' for the node based on prompt
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(prompt).digest('hex');
        return hash.slice(0, 10);
    }

    startNewStreamMessages(characterNames: string[]): void 
    {
        // if firing this func, this node is the 'first node' created by NodeManager
        console.log(`[DialogueNode startNewStreamMessages] Starting new stream for node: ${this.hash} characterNames: ${characterNames.join(', ')}`);
        this.streamMessages = new StreamMessages(this.nodeManager.playerName, characterNames, this.nodeManager.debugObject, this.handleStreamedMessage.bind(this), this.handleStreamEnded.bind(this));
        this.streamMessages.startStream(this.prompt);
    }

    addMessage(message: ChatMsg): void 
    {
        this.messages.push(message);
    }

    public async handleStreamedMessage(message: ChatMsg): Promise<void> 
    {
        if(this.nextNode != undefined) {

            // this node is complete, continue the stream to the next node
            //console.log(`[DialogueNode handleStreamedMessage] Continuing stream to next node: ${this.nextNode.hash}`);
            await this.nextNode.handleStreamedMessage(message);
            return;
        }
        
        // cache and forward to NodeManager
        //console.log(`[DialogueNode handleStreamedMessage] Adding message to cache: ${message.name}: ${message.message}`);
        this.addMessage(message);
        if(!this.continuationNode) this.nodeManager.handleStreamedMessage(message);

        // if the message is from the player
        if (message.name.toLowerCase() === this.nodeManager.playerName.toLowerCase()) {
            
            console.log(`[ActManager handleStreamedMessage] Player message generated: ${message.message}`);
            await this.completeNode(); // finalize the node after the player message
        }
    }

    private async handleStreamEnded(reason: StreamEndReason): Promise<void> 
    {
        if(this.nextNode != undefined) {

            // this node is complete, continue the stream to the next node
            await this.nextNode.handleStreamEnded(reason);
            return;
        }

        console.log(`[DialogueNode handleStreamEnded] Stream ended. node: ${this.hash} with reason: ${reason} message count: ${this.messages.length}`);

        if (reason === StreamEndReason.USER_CANCELLED || this.messages.length == 0)
        {
            // abandoned node, destroy this instance and remove from NodeManager's list
            this.nodeManager.removeNode(this.hash);
            return;
        }

        this.completeNode(false);
    }

    private async completeNode(makeNewNode: boolean = true): Promise<void> 
    {
        console.log(`[DialogueNode completeNode] Completing node: ${this.hash} with ${this.messages.length} messages.`);

        // clean up StreamMessages
        if(this.streamMessages) this.streamMessages = undefined;

        // FIRST (before any awaits) create a new node for the stream to continue onto
        if(makeNewNode) {
            this.nextNode = new DialogueNode(this.getNextPrompt(), this.storyName, this.nodeManager, true);
            this.nodeManager.addNode(this.nextNode);
            console.log(`[DialogueNode completeNode] Created next node: ${this.nextNode.hash} and added to NodeManager.`);
        }

        // calculate how many player messages are at the end of the messages array before a non player message
        const existingMessageAmount = [...this.messages].reverse().findIndex(msg => msg.name.toLowerCase() !== this.nodeManager.playerName.toLowerCase());
        const playerMessagesAtEnd = existingMessageAmount === -1 ? this.messages.length : existingMessageAmount;

        // do we need a first player message?
        if(playerMessagesAtEnd == 0) 
        {
            console.log(`[DialogueNode handleStreamEnded] Last message was not from the player, completing node without player message.`);

            // generate a first player message
            const firstPlayerMessage = await GenerateChatMsg.GeneratePlayerChatMsg(this.getNextPrompt(), this.messages, this.nodeManager.debugObject, this.nodeManager.playerName)
            this.addMessage(firstPlayerMessage);
            if(!this.continuationNode) this.nodeManager.handleStreamedMessage(firstPlayerMessage); // forward to NodeManager

            // generate second player message
            await this.generateAndAddAltChatMsg();
        }
        else if(playerMessagesAtEnd == 1) {
            console.log(`[DialogueNode handleStreamEnded] Last message was from the player, completing node with existing player message.`);
            
            // generate second player message
            await this.generateAndAddAltChatMsg();
        }
        else console.log(`[DialogueNode handleStreamEnded] We already have 2 player messages.`);
    }

    private async generateAndAddAltChatMsg(): Promise<ChatMsg> {

        // generate an alternative player message for response option #2  
        const alternateMsg = await GenerateChatMsg.GenerateAlternativeChatMsg(this.getNextPrompt(), this.messages, this.nodeManager.debugObject);
        this.addMessage(alternateMsg); // cache
        if(!this.continuationNode) this.nodeManager.handleStreamedMessage(alternateMsg); // forward to NodeManager
        console.log(`[DialogueNode completeNode] Sent final message to node manager: ${alternateMsg.name}: ${alternateMsg.message}`);
        return alternateMsg;
    }

    private getNextPrompt(): string {
        return this.prompt + "" + ChatMsg.messagesToString(this.messages);
    }
}