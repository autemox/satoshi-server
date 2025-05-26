// to test, use: npx jest PromptBuilder.test.ts

import { GameState } from './../../GameState';
import { ChatMsg } from '../../../models/ChatMsg';
import { PromptBuilder } from './../PromptBuilder';

describe('PromptBuilder', () => {
  let gameState: GameState;
  let promptBuilder: PromptBuilder;
  
  beforeEach(() => {
    gameState = new GameState(null as any); // Mock actManager
    promptBuilder = new PromptBuilder(gameState);
  });

  describe('buildDialoguePrompt', () => {
    it('should debug the final prompt output', async () => {
      const mockMessages = [
        { name: "John", message: "Hey everyone!" },
        { name: "Mary", message: "Hello John, how are you?" },
        { name: "Ron", message: "Good to see you mate!" }
      ];

      const result = await promptBuilder.buildDialoguePrompt(
        3,
        ["Ron casts a spell", "Mary laughs"],
        "John",
        ["Mary", "Ron"],
        mockMessages as any
      );
      
      console.log("=== FINAL PROMPT OUTPUT ===");
      console.log(result);
      console.log("=== END PROMPT ===");
      
      expect(result).toBeDefined(); // Just check it exists
    });
  });
});