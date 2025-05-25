// to test, use: npx jest DialogueNode.test.ts

import { DialogueNode } from '../DialogueNode';
import { MockNodeManager } from './MockNodeManager';
import { ChatMsg } from '../../../../models/ChatMsg';
import { StreamEndReason } from '../../../utils/deepseek/StreamingClient';

// Mock GenerateChatMsg to control test flow
jest.mock('./../GenerateChatMsg', () => ({
   GenerateChatMsg: {
       GeneratePlayerChatMsg: jest.fn().mockResolvedValue("Generated player response"),
       GenerateAlternativeChatMsg: jest.fn().mockResolvedValue("Alternative player response")
   }
}));

// Mock StreamingClient to control stream behavior
jest.mock('../../../utils/deepseek/StreamingClient', () => ({
   StreamingClient: jest.fn().mockImplementation((handleContent, streamEnded, debugLog) => ({
       startStream: jest.fn().mockImplementation((prompt) => {
           // Simulate streaming behavior based on prompt
           setTimeout(() => {
               if (prompt.includes("10 messages")) {
                   // Simulate 10 message conversation
                   handleContent("John: Hello there!\n");
                   handleContent("Katie: Hi John! How are you?\n");
                   handleContent("Player: I'm doing great, thanks for asking.\n");
                   handleContent("John: That's wonderful to hear.\n");
                   handleContent("Katie: What brings you here today?\n");
                   handleContent("Player: Just exploring the area.\n");
                   handleContent("John: This is a beautiful place to explore.\n");
                   handleContent("Katie: We love showing visitors around.\n");
                   handleContent("Player: That's very kind of you both.\n");
                   handleContent("John: Our pleasure entirely.\n");
                   streamEnded(StreamEndReason.DONE_STRING);
               } else {
                   // Simulate 3 message conversation that ends
                   handleContent("John: Welcome to our town!\n");
                   handleContent("Katie: We hope you enjoy your stay.\n");
                   handleContent("John: Feel free to ask if you need anything.\n");
                   streamEnded(StreamEndReason.DONE_STRING);
               }
           }, 10);
       }),
       cancelStream: jest.fn()
   })),
   StreamEndReason: {
       NATURAL_END: 'NATURAL_END',
       USER_CANCELLED: 'USER_CANCELLED'
   }
}));

describe('DialogueNode Integration Tests', () => {
   let mockNodeManager: MockNodeManager;

   beforeEach(() => {
       mockNodeManager = new MockNodeManager();
       mockNodeManager.playerName = "Player";
       mockNodeManager.characterNames = ["John", "Katie"];
       jest.clearAllMocks();
   });

   test('should handle continuation pattern with 10 messages', (done) => {
       const node = new DialogueNode(
           "Write dialogue for 10 messages between Player, John and Katie meeting",
           "test-hash-1",
           "test-story",
           mockNodeManager
       );

       mockNodeManager.addNode(node);

       // Start the stream
       node.startNewStreamMessages();

       // Wait for processing to complete
       setTimeout(() => {
           expect(mockNodeManager.streamedMessages.length).toBeGreaterThan(8);
           expect(mockNodeManager.streamedMessages.some(m => m.name === "Player")).toBe(true);
           expect(mockNodeManager.streamedMessages.some(m => m.name === "John")).toBe(true);
           expect(mockNodeManager.streamedMessages.some(m => m.name === "Katie")).toBe(true);
           done();
       }, 100);
   });

   test('should handle stream ending with 3 messages', (done) => {
       const node = new DialogueNode(
           "Write 3 messages starting with John and Katie, ending with John speaking",
           "test-hash-2", 
           "test-story",
           mockNodeManager
       );

       mockNodeManager.addNode(node);

       // Start the stream
       node.startNewStreamMessages();

       // Wait for processing to complete
       setTimeout(() => {
           expect(mockNodeManager.streamedMessages.length).toBeGreaterThanOrEqual(3);
           expect(mockNodeManager.streamedMessages[0].name).toBe("John");
           expect(mockNodeManager.streamedMessages.some(m => m.name === "Katie")).toBe(true);
           
           // Should have generated player messages via GenerateChatMsg
           const { GenerateChatMsg } = require('./../GenerateChatMsg');
           expect(GenerateChatMsg.GeneratePlayerChatMsg).toHaveBeenCalled();
           expect(GenerateChatMsg.GenerateAlternativeChatMsg).toHaveBeenCalled();
           
           done();
       }, 100);
   });
});