//-----
// This is the Main project file, this project displays a simple page to the viewer that says "Hello World"
//-----

import { HttpServer } from './HttpServer';
import { ExampleClass } from './ExampleClass';
import { RetroDiffusionGenerator } from './RetroDiffusionGenerator';
import { kebabCase } from 'string-ts';
import fs from 'fs/promises';

export class Main {

  public httpServer: HttpServer;
  public exampleClass: ExampleClass;

  constructor() {
    
    this.exampleClass = new ExampleClass(this);
    this.httpServer = new HttpServer(this);
  }

  async generateSpritesheet(prompt: string): Promise<string|null> {

    // make sure we dont already have a file named kebabCase(prompt)+".png";
    try {
      // Check if file already exists
      await fs.access("./public/images/spritesheets/" + kebabCase(prompt) + ".png");
      return kebabCase(prompt) + ".png"; // Return existing filename
    } catch {
      console.log("New file: " + kebabCase(prompt) + ".png will be generated");
    }

    const generator = new RetroDiffusionGenerator();
    try {
      await generator.generateWalkingSpritesheet({
        prompt,
        outputPath: "./public/images/spritesheets/"+kebabCase(prompt)+".png"
      });
      console.log("Spritesheet generated successfully!");
      return kebabCase(prompt)+".png";
    } catch (error) {
      console.error("Error generating spritesheet:", error);
      return null;
    }
  }
}