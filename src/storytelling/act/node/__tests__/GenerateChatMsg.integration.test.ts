// to test, use: npx jest GenerateChatMsg.integration.test.ts
import { GenerateChatMsg } from '../GenerateChatMsg';
import { ChatMsg } from '../../../../models/ChatMsg';

describe('GeneratePlayerMessages Integration Test', () => {

   test('should generate alternative last message with random style', async () => {

       console.log('Starting GeneratePlayerMessages integration test');
       
       const debugLog = { value: '' };
       
       const messages: ChatMsg[] = [
           new ChatMsg('John', 'What should we do about the dragon problem?'),
           new ChatMsg('Player', 'I think we should approach it carefully and try to negotiate first.'),
           new ChatMsg('Mary', 'That sounds reasonable to me.')
       ];

       const prompt = 'You are adventurers planning your next quest in a fantasy tavern.';

       console.log('Calling GenerateAlternative with prompt:', prompt);
       console.log('Messages:', messages);

       const result = await GenerateChatMsg.GenerateAlternativeChatMsg(prompt, messages, debugLog);

       console.log('Generated alternative response:', result);
       console.log('Debug log:', debugLog.value);

       expect(result).toBeTruthy();
       expect(typeof result).toBe('string');
       expect(result != null && result.length).toBeGreaterThan(10);
   }, 30000);
});