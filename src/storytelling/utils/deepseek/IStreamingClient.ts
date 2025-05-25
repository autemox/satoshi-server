export interface IStreamingClient {

    // Starts a stream
    startStream(prompt: string): Promise<void>;
    
    // Cancels a stream
    cancelStream(): void;
}