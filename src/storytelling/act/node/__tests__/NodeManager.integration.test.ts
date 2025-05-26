// to test, use: npx jest NodeManager.integration.test.ts

import { NodeManager } from './../NodeManager';
import { ChatMsg } from '../../../../models/ChatMsg';

describe('NodeManager Integration Tests', () => {
    let nodeManager: NodeManager;
    let receivedMessages: ChatMsg[] = [];

    beforeEach(() => {
        receivedMessages = [];
        
        // Create real NodeManager with callback to capture messages
        nodeManager = new NodeManager(
            "John", 
            (message: ChatMsg) => {
                receivedMessages.push(message);
                console.log(`[Test Callback] Received: ${message.name}: ${message.message}`);
            }
        );
        
        jest.clearAllMocks();
    });

    test('should create and stream real dialogue through full NodeManager lifecycle with multiple nodes', async () => {
        const prompt = "Write a conversation set in a fantasy world between Jackie and Katie meeting Player John to talk about centaur hunting. It should be 6-8 lines of dialogue.";
        const storyName = "test-story";
        const characterNames = ["Jackie", "Katie"];
        let streamedMessages: ChatMsg[] = [];

        // Start streaming from NodeManager
        await nodeManager.streamFromNode(
            prompt,
            storyName,
            (message: ChatMsg) => {
                streamedMessages.push(message);
                console.log(`[Stream Callback] ${message.name}: ${message.message}`);
            },
            characterNames
        );

        // Wait much longer for the streaming and AI generation to complete
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Log all received messages
        console.log('\n=== MESSAGES FROM STREAM CALLBACK ===');
        streamedMessages.forEach((msg, i) => {
            console.log(`${i + 1}. ${msg.name}: ${msg.message}`);
        });

        console.log('\n=== MESSAGES FROM ACT MANAGER CALLBACK ===');
        receivedMessages.forEach((msg, i) => {
            console.log(`${i + 1}. ${msg.name}: ${msg.message}`);
        });

        // Log all cached nodes with their messages
        logAllCachedNodes(nodeManager);

        // Verify NodeManager received and forwarded messages
        expect(receivedMessages.length).toBeGreaterThan(0);
        expect(streamedMessages.length).toBeGreaterThan(0);

        // Should have messages from all characters including the player
        const streamMessageNames = streamedMessages.map(m => m.name);
        const receivedMessageNames = receivedMessages.map(m => m.name);
        
        expect(streamMessageNames).toContain("John");
        expect(streamMessageNames).toContain("Jackie");
        expect(streamMessageNames).toContain("Katie");
        expect(receivedMessageNames).toContain("John");

        // Should have multiple player messages (indicating multiple nodes were created)
        const playerMessages = streamedMessages.filter(m => m.name === "John");
        expect(playerMessages.length).toBeGreaterThan(2); // Multiple nodes should create multiple player messages

        console.log(`\nTotal messages: ${streamedMessages.length}`);
        console.log(`Player messages: ${playerMessages.length}`);
        console.log(`Expected multiple nodes created based on player message count`);

    }, 90000); // 90 second timeout for the longer conversation + wait time
});

function logAllCachedNodes(nodeManager: NodeManager): void {
    // Access the private nodes map via reflection
    const nodes = (nodeManager as any).nodes as Map<string, any>;
    
    console.log(`\n=== CACHED NODES SUMMARY (${nodes.size} total) ===`);
    nodes.forEach((node, hash) => {
        console.log(`\nNode Hash: ${hash}`);
        console.log(`Messages Count: ${node.messages.length}`);
        console.log('Messages:');
        node.messages.forEach((msg: ChatMsg, i: number) => {
            console.log(`  ${i + 1}. ${msg.name}: ${msg.message}`);
        });
        
        // Check if last 2 messages are from player
        const lastTwo = node.messages.slice(-2);
        const lastTwoFromPlayer = lastTwo.every((msg: ChatMsg) => msg.name.toLowerCase() === nodeManager.playerName.toLowerCase());
        console.log(`Last 2 messages from player: ${lastTwoFromPlayer}`);
    });
    console.log('=== END CACHED NODES ===\n');
}