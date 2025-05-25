/*
 caches DialogueNode objects to avoid re-creating them
 acts as in between StreamMessages and ActManager

 DialogueNode stores storyName, prompt, hash, and messages
 hashPrompt creates a the hash, a unique string based on the prompt
*/

import { DialogueNode } from './DialogueNode';
import { ChatMsg } from '../../../models/ChatMsg';
import { INodeManager } from './INodeManager';
import { GenerateChatMsg } from './GenerateChatMsg';

export class NodeManager implements INodeManager {

    // cache for DialogueNode's use
    public playerName: string;
    public characterNames: string[] = [];
    public debugObject: { value: string } = { value: "" }; // debug object for DialogueNode's to log messages to

    private callbackActManager: (message: ChatMsg) => void; // callback to allow us to send messages from StreamMessages to ActManager (NodeManager acts as an in between for caching)
    private nodes: Map<string, DialogueNode> = new Map(); // cache of nodes

    private currentNode: DialogueNode | undefined;
    
    constructor(playerName: string, callbackActManager: (message: ChatMsg) => void)
    {
        this.playerName = playerName;
        this.callbackActManager = callbackActManager;
    }

    public async streamFromNode(prompt: string, storyName: string, onMessage: (message: ChatMsg) => void /*callback from ActManager*/, getCharacterNames: () => Promise<string[]>, delayMs: number = 100): Promise<void> 
    {
        // allow current node to finish in the background by not cancelling its stream
        if (this.currentNode) this.currentNode = undefined;

        // get list of character names
        this.characterNames = await getCharacterNames ? getCharacterNames() : [];

        // get the node from the cache
        this.currentNode = this.nodes.get(hash);
        if (!this.currentNode) {

            // stream from an LLM
            this.currentNode = this.createNode(prompt, storyName);
            this.currentNode.startNewStreamMessages();
        }
        else 
        {
            // simulate streaming from cache
            var simulationNode = this.currentNode;
            for (const message of simulationNode.messages) {
                if(this.currentNode == simulationNode) onMessage(message); // still active
                if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    public handleStreamedMessage(message: ChatMsg): void 
    {
        if (!this.currentNode) throw new Error("No current node to add message to.");
            
        // start a new node to continue streaming dialogue
        var newNodePrompt = this.currentNode.prompt + ""+ ChatMsg.messagesToString(this.currentNode.messages); // simulate what the prompt will be for the next node
        this.currentNode = this.createNode(newNodePrompt, this.currentNode.storyName); // now new messages coming in will be added to this new node not our other one
    }

    createNode(prompt: string, storyName: string): DialogueNode 
    {
        const hash = this.hashPrompt(prompt);
        const node = new DialogueNode(prompt, hash, storyName, this);
        this.nodes.set(hash, node);
        return node;
    }

    // called by dialogue nodes that were abandoned/stream cancelled
    removeNode(hash: string): void {
        if (this.nodes.has(hash)) {
            this.nodes.delete(hash);
        }
    }
}