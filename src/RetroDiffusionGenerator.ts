//---------
// Uses RetroDiffusion API to generate a 4-directional, 4-frame walk animation spritesheet based on a simple string prompt
//---------


import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SpritesheetOptions {
  prompt: string;
  seed?: number;
  outputPath?: string;
}

export class RetroDiffusionGenerator {
  private readonly apiKey: string;
  private readonly apiUrl: string = 'https://api.retrodiffusion.ai/v1/inferences';

  constructor() {
    const apiKey = process.env.RETRO_DIFFUSION_API_KEY;
    
    if (!apiKey) {
      throw new Error('RETRO_DIFFUSION_API_KEY is not set in environment variables');
    }
    
    this.apiKey = apiKey;
  }

  /**
   * Generate a 4-directional, 4-frame walk animation spritesheet
   * @param options Configuration options for the spritesheet
   * @returns Promise with the base64 image data
   */
  async generateWalkingSpritesheet(options: SpritesheetOptions): Promise<string> {
    const { 
      prompt,
      seed = Math.floor(Math.random() * 1000000),
      outputPath
    } = options;

    // Exactly match the format in the API documentation examples
    const payload = {
      prompt,
      width: 48, // Animations only support 48x48
      height: 48,
      model: "RD_FLUX",
      num_images: 1,
      seed,
      prompt_style: "animation_four_angle_walking",
      return_spritesheet: true
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    try {
      // Make the API request with minimal parameters
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'X-RD-Token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if we got a proper response
      if (!response.data) {
        console.error('Empty response data');
        throw new Error('Empty response from Retro-Diffusion API');
      }
      
      console.log('Response structure:', Object.keys(response.data));
      
      if (!response.data.base64_images || !response.data.base64_images[0]) {
        console.error('API Response (no base64_images):', JSON.stringify(response.data, null, 2));
        throw new Error('No base64_images found in API response');
      }

      const base64Image = response.data.base64_images[0];
      
      // Save the image if outputPath is provided
      if (outputPath) {
        this.saveBase64Image(base64Image, outputPath);
        console.log(`Spritesheet saved to ${outputPath}`);
      }

      // Log remaining credits
      if (response.data.remaining_credits !== undefined) {
        console.log(`Remaining credits: ${response.data.remaining_credits}`);
      }
      
      return base64Image;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('API Error Details:', error.response.data);
          console.error('API Error Status:', error.response.status);
          console.error('API Error Headers:', error.response.headers);
          
          // Check for specific error messages
          const errorData = error.response.data;
          if (typeof errorData === 'object' && errorData.detail) {
            console.error('Error details:', errorData.detail);
          }
          
          throw new Error(`Retro-Diffusion API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          console.error('Request was made but no response received');
          throw new Error(`No response received from Retro-Diffusion API: ${error.message}`);
        } else {
          console.error('Request Error:', error.message);
          throw new Error(`Request Configuration Error: ${error.message}`);
        }
      }
      
      console.error('Unknown Error:', error);
      throw error;
    }
  }

  /**
   * Save a base64 image to a file
   * @param base64Image Base64 encoded image data
   * @param outputPath Path to save the image
   */
  private saveBase64Image(base64Image: string, outputPath: string): void {
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(outputPath, imageBuffer);
  }
}

// Example usage:
/*
async function main() {
  const generator = new RetroDiffusionGenerator();
  
  try {
    await generator.generateWalkingSpritesheet({
      prompt: "red sorceress",
      outputPath: "./red-sorceress-spritesheet.png"
    });
    console.log("Spritesheet generated successfully!");
  } catch (error) {
    console.error("Error generating spritesheet:", error);
  }
}

main();
*/