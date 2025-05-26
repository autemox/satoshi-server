/*
// Entry point of the application
*/

import { Main } from './src/Main';

import { ActManagerWithNodes } from './src/storytelling/act/ActManagerWithNodes';
import { GameState } from './src/storytelling/GameState';
import { ChatMsg } from './src/models/ChatMsg';

const main = new Main();

// Test ActManager directly
async function testActManager() {
    console.log("🎬 Testing ActManager...");
    
    const gameState = new GameState(null as any);
    const playerName = "John";
    const getCharacterNames = async () => ["Mary", "Ron"];
    const debugQueryLog = { value: "" };
    const storyName = "Test Story";
    
    const streamedMessages: Array<{name: string, message: string}> = [];
    const sendMessageToChatManager = (lastPlayerMessage: string, name: string, message:string, debug?: string, source?: string) => {
        console.log(`📨 Message from ${name}: ${message}`);
        streamedMessages.push({name, message});
    };

    const actManager = new ActManagerWithNodes(
        gameState,
        playerName,
        getCharacterNames,
        debugQueryLog,
        gameState.story.acts[0],
        storyName,
        sendMessageToChatManager
    );

    await actManager.handlePlayerMessage("Hello");
    
    console.log("✅ ActManager test started, waiting 10 seconds for responses...");
    
    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    // Output A: What got streamed to the player
    console.log('\n=== STREAMED MESSAGES ===');
    streamedMessages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.name}: ${msg.message}`);
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
            console.log(`    ${i + 1}. ${msg.name}: ${msg.message.substring(0, 200)}`);
        });
    });

    console.log('\n🎯 Debug complete!');
}

// Run the test
testActManager().catch(console.error);

let debug: number = 0;
setInterval(() => {
    debug++;  // set breakpoint here to pause script
}, 1000);