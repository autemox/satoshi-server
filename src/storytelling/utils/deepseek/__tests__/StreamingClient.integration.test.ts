// to test, use: npx jest StreamingClient.integration.test.ts

import { StreamingClient, StreamEndReason } from '../StreamingClient';

jest.setTimeout(20000);

describe('StreamingClient Integration Test', () => {
  test('should receive at least 3 packets and cancel stream', (done) => {
    const receivedChunks: string[] = [];
    const debugLog = { value: '' };

    const client = new StreamingClient(
      (content: string) => {
        console.log('[TEST RECEIVED CHUNK]:', content);
        receivedChunks.push(content);

        if (receivedChunks.length >= 3) {
          client.cancelStream();
        }
      },
      (reason) => {
        console.log('[TEST STREAM ENDED]:', reason);

        try {
          expect(receivedChunks.length).toBeGreaterThanOrEqual(3);
          expect(reason).toBe(StreamEndReason.USER_CANCELLED);
          done();
        } catch (error) {
          done(error);
        }
      },
      debugLog
    );

    client.startStream('Hello! List every part of the bill of rights.');
  });
});