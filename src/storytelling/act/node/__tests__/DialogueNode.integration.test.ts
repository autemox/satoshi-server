// to test, use: npx jest DialogueNode.integration.test.ts

import { DialogueNode } from './../DialogueNode';
import { MockNodeManager } from './MockNodeManager';
import { ChatMsg } from '../../../../models/ChatMsg';

describe('DialogueNode Integration Tests', () => {
    let mockNodeManager: MockNodeManager;

    beforeEach(() => {
        mockNodeManager = new MockNodeManager();
        mockNodeManager.playerName = "John";
        mockNodeManager.characterNames = ["Jackie", "Katie"];
        jest.clearAllMocks();
    });

    test('should create node and generate real dialogue through full stream lifecycle', async () => {
    const prompt = "Write a conversation set in a fantasy world between Jackie and Katie meeting Player John to talk about centaur hunting. Keep it to 3-4 exchanges.";
    
    const node = new DialogueNode(
        prompt,
        "test-story",
        mockNodeManager
    );

    mockNodeManager.addNode(node);

    // Start the actual streaming process
    node.startNewStreamMessages(["Jackie", "Katie", "John"]);

    // Wait for the real streaming and AI generation to complete
    await new Promise(resolve => setTimeout(resolve, 15000)); // Give it time for real API calls

    // Log all cached nodes with their messages
    mockNodeManager.logAllCachedNodes();

    // Verify the integration worked end-to-end
    expect(mockNodeManager.streamedMessages.length).toBeGreaterThan(0);
    expect(node.messages.length).toBeGreaterThan(0);
    
    // Should have messages from different characters including the player
    const messageNames = mockNodeManager.streamedMessages.map(m => m.name);
    expect(messageNames).toContain("John");

    // Verify the full conversation exists across all cached nodes:
    const allNodes = mockNodeManager.getAllNodes();
    const allMessages = allNodes.flatMap(node => node.messages);
    const allMessageNames = allMessages.map(m => m.name);
    expect(allMessageNames).toContain("John");
    expect(allMessageNames).toContain("Jackie");
    expect(allMessageNames).toContain("Katie");
    
    // Verify each cached node has 2 player messages at the end
    allNodes.forEach(cachedNode => {
        if (cachedNode.messages.length >= 2) {
            const lastTwo = cachedNode.messages.slice(-2);
            expect(lastTwo.every(msg => msg.name === "John")).toBe(true);
        }
    });

    console.log('Generated messages:', mockNodeManager.streamedMessages.map(m => `${m.name}: ${m.message}`));
}, 30000); // Extended timeout for real API calls
});