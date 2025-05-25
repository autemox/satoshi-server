// to test, use: npx jest StreamMessages.integration.test.ts

import { StreamMessages } from './../StreamMessages';
import { ChatMsg } from '../../../../models/ChatMsg';

describe('StreamMessages Integration Test', () => {

  test('should generate conversation between John and Mary about dogs', async () => {

      console.log('Starting StreamMessages integration test');
      
      const receivedMessages: ChatMsg[] = [];
      const debugLog = { value: '' };
      
      async function getCharacterNames() 
      {
          console.log('getCharacterNames called');
          return ['John', 'Mary'];
      }

      function handleStreamedMessage(message: ChatMsg) 
      {
          receivedMessages.push(message);
          console.log(`[Test HandleMessageStream] Message ${receivedMessages.length}.  ${message.name}: ${message.message}`);
          
          if (receivedMessages.length >= 3) {
              console.log('Received 3 messages, cancelling stream');
              streamMessages.cancelStream();
          }
      }
      
      const streamMessages = new StreamMessages(
          'John',
          ['Mary'],
          debugLog,
          handleStreamedMessage
      );

      const prompt = `Continue this conversation between John and Mary about dogs:
John: Hi Mary
Mary: Hi John`;

      console.log('Starting stream with prompt:', prompt);
      streamMessages.startStream(prompt);

      return new Promise((resolve) => {

          const checkCompletion = () => {

              if (receivedMessages.length >= 3 || debugLog.value.includes('streamEnded')) 
            {
                  console.log('Test completed');
                  console.log('Final messages:', receivedMessages);
                  console.log('Debug log:', debugLog.value);
                  resolve(undefined);
              } else 
              {
                  setTimeout(checkCompletion, 100);
              }
          };
          setTimeout(checkCompletion, 1000);
      });
  }, 30000);
});