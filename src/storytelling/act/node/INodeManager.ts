import { DialogueNode } from './DialogueNode';
import { ChatMsg } from './../../../models/ChatMsg';

export interface INodeManager {
    
    playerName: string;
    characterNames: string[];
    debugObject: { value: string };
    
    handleStreamedMessage(message: ChatMsg): void;
    removeNode(hash: string): void;
    addNode(node: DialogueNode): void;
}