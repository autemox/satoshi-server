// to test, use: npx jest ActManagerWithNodes.integration.test.ts
import { ActManagerWithNodes } from './../ActManagerWithNodes';
import { GameState } from '../../GameState';
import { ChatMsg } from '../../../models/ChatMsg';

describe('ActManagerWithNodes Integration Test', () => {
    test('should stream dialogue and cache nodes properly', async () => {
        
        // Setup
        const gameState = new GameState(null as any); // we'll set actManager after
        const playerName = "John";
        const getCharacterNames = async () => ["Mary", "Ron"];
        const debugQueryLog = { value: "" };
        const storyName = "Test Story";
        
        const streamedMessages: Array<{name: string, message: string, debug?: string}> = [];
        const sendMessageToChatManager = (message: ChatMsg|null, name: string, messageText: string, storyName?: string, debug?: string, source?: string) => {
            streamedMessages.push({name, message: messageText, debug});
        };

        // Create ActManager
        const actManager = new ActManagerWithNodes(
            gameState,
            playerName,
            getCharacterNames,
            debugQueryLog,
            gameState.story.acts[0],
            storyName,
            sendMessageToChatManager
        );

        // Start the act with a player message
        await actManager.handlePlayerMessage("Hello");
            
        // Wait 9 seconds
         await new Promise(resolve => setTimeout(resolve, 1200)); 

        // Output A: What got streamed to the player
        console.log('\n=== STREAMED MESSAGES ===');
        streamedMessages.forEach((msg, index) => {
            console.log(`${index + 1}. ${msg.name}: ${msg.message}`);
            if(msg.debug) console.log(`   Debug: ${msg.debug}`);
        });

        // Output B: Full structure of cached nodes
        console.log('\n=== CACHED NODES STRUCTURE ===');
        const nodeManager = (actManager as any).nodeManager;
        const nodes = (nodeManager as any).nodes;
        
        console.log(`Total cached nodes: ${nodes.size}`);
        nodes.forEach((node: any, hash: string) => {
            console.log(`\nNode ${hash}:`);
            console.log(`  Story: ${node.storyName}`);
            console.log(`  Messages: ${node.messages.length}`);
            console.log(`  Continuation: ${node.continuationNode}`);
            console.log(`  Has StreamMessages: ${node.streamMessages !== undefined}`);
            
            node.messages.forEach((msg: ChatMsg, i: number) => {
                console.log(`    ${i + 1}. ${msg.name}: ${msg.message.substring(0, 50)}...`);
            });
        });

        // Output C: Debug query log
        console.log('\n=== DEBUG QUERY LOG ===');
        console.log(debugQueryLog.value);

        // Basic assertions
        expect(streamedMessages.length).toBeGreaterThan(0);
        expect(nodes.size).toBeGreaterThan(0);
        
    }, 15000); // 15 second timeout for LLM calls
});