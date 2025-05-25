export interface IStreamMessages {

    // Generates character dialogue from a storytelling prompt
    startStream(prompt: string): void;
    
    // cancel the stream
    cancelStream(): void;
  }