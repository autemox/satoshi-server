//-----
// This is the Main project file, this project displays a simple page to the viewer that says "Hello World"
//-----

import { HttpServer } from './HttpServer';
import { ExampleClass } from './ExampleClass';
import { RetroDiffusionGenerator } from './RetroDiffusionGenerator';
import { kebabCase } from 'string-ts';

export class Main {

  public httpServer: HttpServer;
  public exampleClass: ExampleClass;

  constructor() {
    
    this.exampleClass = new ExampleClass(this);
    this.httpServer = new HttpServer(this);

    //this.generateSpritesheet("chicken");
  }

  async generateSpritesheet(prompt: string) {

    console.log("Generating spritesheet...");
    const generator = new RetroDiffusionGenerator();
    try {
      await generator.generateWalkingSpritesheet({
        prompt,
        outputPath: "./public/images/spritesheets/"+kebabCase(prompt)+".png"
      });
      console.log("Spritesheet generated successfully!");
    } catch (error) {
      console.error("Error generating spritesheet:", error);
    }
  }
}