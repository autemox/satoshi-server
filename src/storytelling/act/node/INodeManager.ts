import { ChatMsg } from '../../../models/ChatMsg';
import { DialogueNode } from './DialogueNode';

export interface INodeManager {
    playerName: string;
    debugObject: { value: string };
    
    // Core streaming functionality
    streamFromNode(
        prompt: string, 
        storyName: string, 
        onMessage: (message: ChatMsg) => void, 
        characterNames: string[], 
        delayMs?: number
    ): Promise<void>;
    
    // Message handling
    handleStreamedMessage(message: ChatMsg): void;
    
    // Node management
    createNode(prompt: string, storyName: string, characterNames: string[]): DialogueNode;
    addNode(node: DialogueNode): void;
    removeNode(hash: string): void;
}