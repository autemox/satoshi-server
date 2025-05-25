import { INodeManager } from "./../INodeManager";
import { DialogueNode } from "./../DialogueNode";
import { ChatMsg } from '../../../../models/ChatMsg';


export class MockNodeManager implements INodeManager {
    
    playerName: string = "John";
    characterNames: string[] = ["Jackie", "Katie"];
    debugObject: { value: string } = { value: "" };
    
    private nodes: Map<string, DialogueNode> = new Map();
    public streamedMessages: ChatMsg[] = []; // for test verification
    public removedNodeHashes: string[] = []; // for test verification
    
    handleStreamedMessage(message: ChatMsg): void {
        this.streamedMessages.push(message);
        console.log(`[MockNodeManager] Received message from ${message.name}: ${message.message}`);
    }
    
    removeNode(hash: string): void {
        this.nodes.delete(hash);
        this.removedNodeHashes.push(hash);
        console.log(`[MockNodeManager] Removed node: ${hash}`);
    }
    
    addNode(node: DialogueNode): void {
        this.nodes.set(node.hash, node);
        console.log(`[MockNodeManager] Added node: ${node.hash}`);
    }
    
    // test helper methods
    getNode(hash: string): DialogueNode | undefined {
        return this.nodes.get(hash);
    }
    
    getAllNodes(): DialogueNode[] {
        return Array.from(this.nodes.values());
    }
    
    logAllCachedNodes(): void {
        console.log(`\n=== CACHED NODES SUMMARY (${this.nodes.size} total) ===`);
        this.nodes.forEach((node, hash) => {
            console.log(`\nNode Hash: ${hash}`);
            console.log(`Messages Count: ${node.messages.length}`);
            console.log('Messages:');
            node.messages.forEach((msg, i) => {
                console.log(`  ${i + 1}. ${msg.name}: ${msg.message}`);
            });
            
            // Check if last 2 messages are from player
            const lastTwo = node.messages.slice(-2);
            const lastTwoFromPlayer = lastTwo.every(msg => msg.name.toLowerCase() === this.playerName.toLowerCase());
            console.log(`Last 2 messages from player: ${lastTwoFromPlayer}`);
        });
        console.log('=== END CACHED NODES ===\n');
    }
    
    clear(): void {
        this.nodes.clear();
        this.streamedMessages = [];
        this.removedNodeHashes = [];
    }
}