// to test, use: npx jest GenerateChatMsg.integration.test.ts
import { GenerateChatMsg } from '../GenerateChatMsg';
import { ChatMsg } from '../../../../models/ChatMsg';

describe('GenerateChatMsg Integration Test', () => {

    test('should generate player chat message', async () => {

        console.log('Starting GeneratePlayerChatMsg test');
        
        const debugLog = { value: '' };
        
        const messages: ChatMsg[] = [
            new ChatMsg('John', 'What should we do about the dragon problem?'),
            new ChatMsg('Mary', 'Maybe we should gather more information first?')
        ];

        const prompt = 'You are adventurers planning your next quest in a fantasy tavern.';
        const playerName = 'Player';

        console.log('Calling GeneratePlayerChatMsg with prompt:', prompt);
        console.log('Player name:', playerName);
        console.log('Messages:', messages);

        const result = await GenerateChatMsg.GeneratePlayerChatMsg(prompt, messages, debugLog, playerName);

        console.log('Generated player response:', result);
        console.log('Debug log:', debugLog.value);

        expect(result).toBeTruthy();
        expect(result.name).toBe(playerName);
        expect(result.message.length).toBeGreaterThan(10);
    }, 30000);

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
       expect(result).toBeInstanceOf(ChatMsg);
       expect(result.message.length).toBeGreaterThan(10);
   }, 30000);
});