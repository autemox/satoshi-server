/*
 caches DialogueNode objects to avoid re-creating them
 acts as in between DialogueNode and ActManager
 each DialogueNode stores storyName, prompt, hash, messages.  streams these from LLM using StreamMessages
*/

import { DialogueNode } from './DialogueNode';
import { ChatMsg } from '../../../models/ChatMsg';
import { INodeManager } from './INodeManager';
import { GenerateChatMsg } from './GenerateChatMsg';

export class NodeManager implements INodeManager {

    // cache for DialogueNode's use
    private nodes: Map<string, DialogueNode> = new Map(); // cache of nodes
    private currentNode: DialogueNode | undefined; // current active node being streamed, note inactive nodes may still be streaming
    
    constructor(
        public playerName: string, 
        public callbackActManager: (message: ChatMsg) => void, // callback to allow us to send messages from StreamMessages to ActManager (NodeManager and DialogueNode are in between)
        public debugObject: { value: string } = { value: "" })  // debug object for DialogueNode's to log messages to
    {

    }

    public async streamFromNode(prompt: string, storyName: string, onMessage: (message: ChatMsg) => void /*callback from ActManager*/, characterNames: string[], delayMs: number = 100): Promise<void> 
    {
        console.log(`[NodeManager streamFromNode] Streaming from node with prompt length: ${prompt.length} storyName: ${storyName} characterNames: ${characterNames.join(', ')}`);
        
        let newNode = this.nodes.get(DialogueNode.hashPrompt(prompt));

        if(newNode == this.currentNode && this.currentNode != undefined) 
        {
            console.warn(`[NodeManager streamFromNode] Node ${newNode} is already active. Not starting a new stream.`);
            return;
        }
        else if (this.currentNode) 
        {
            this.currentNode.continuationNode = true; // stops callbacks and lets node finish in the background by not cancelling its stream
            this.currentNode = undefined;
        }

        // get the node from the cache
        this.currentNode = newNode;
        if (this.currentNode) 
        {
            if(this.currentNode.streamMessages != undefined) console.warn(`[NodeManager streamFromNode] Node was found but is actively streaming.  Simulation may be incomplete.`);

            // simulate streaming from cache
            var simulationNode = this.currentNode;
            for (const message of simulationNode.messages) 
            {
                if(this.currentNode == simulationNode) onMessage(message); // still active
                if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        else 
        {
            // create node using LLM
            this.currentNode = this.createNode(prompt, storyName, characterNames);
        }
    }

    public handleStreamedMessage(message: ChatMsg): void 
    {
        if (!this.currentNode) throw new Error("No current node.  Blocking message: " + message.message+" from act manager.");
        this.callbackActManager(message); // forward message to ActManager
    }

    public createNode(prompt: string, storyName: string, characterNames: string[]): DialogueNode 
    {
        const node = new DialogueNode(prompt, storyName, this, false);
        node.startNewStreamMessages(characterNames);
        this.addNode(node);
        return node;
    }

    public addNode(node: DialogueNode): void { // called to by DialogueNode during creation of continuation nodes
        this.nodes.set(node.hash, node);
    }
   
    public removeNode(hash: string): void { // called by dialogue nodes that were abandoned/stream cancelled
        if (this.nodes.has(hash)) {
            this.nodes.delete(hash);
        }
    }
}