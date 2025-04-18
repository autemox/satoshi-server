//-----
// This project utilizes PixelLab and RetroDiffusion API to generate spritesheets
//
// Project Breakdown:
// RetroDiffusion: Creates a walking spritesheet based on a prompt
// PixelLab: Generates poses for the spritesheet using Aseprite skeleton .json files for pose guidance
// Routes: serves a homepage at HTTP_PORT (default: 3016) and API for Unity client/game (e.g. /api/game-init)
//-----

import { HttpServer } from './HttpServer';
import { RetroDiffusionGenerator } from './RetroDiffusionGenerator';
import { kebabCase } from 'string-ts';
import fs from 'fs/promises';
import { PixelLabSpritesheetGenerator } from './PixelLabSpriteSheetGenerator';

export class Main {

  public httpServer: HttpServer;

  constructor() {
    
    this.httpServer = new HttpServer(this);

    // run an example
   // this.getSpritesheetAndPoses ("chicken");
  }

  // generates both the walking spritesheet (with retrodiffusion) and poses (with pixellab) for all 4 directions
  async getSpritesheetAndPoses(testPrompt: string) {

    var fileName = await this.getWalkingSpritesheet(testPrompt); // retrodiffussion: generate walking spritesheet
    if(!fileName) throw new Error("Failed to generate spritesheet");

    var poseFilenames = []; // pixel lab
    poseFilenames[0] = await this.getPoseSpritesheet(fileName, "falling"); 
    poseFilenames[1] = await this.getPoseSpritesheet(fileName, "fighting"); 
    poseFilenames[2] = await this.getPoseSpritesheet(fileName, "punching");

    // check success of all poses
    if (poseFilenames.some(filename => filename === null)) throw new Error("Failed to generate pose spritesheet");

    // If we reach here, all are non-null, so we can safely filter and cast
    const validFilenames: string[] = poseFilenames.filter((filename): filename is string => filename !== null);

    // compile all poses into a single spritesheet
    this.compileSpritesheet([fileName, ...validFilenames]);
  }

  // combines spritesheets from /public/images/spritesheets into a single spritesheet for /public/images/compiled_spritesheets
  async compileSpritesheet(filenames: string[]): Promise<string|null> {
    try {
      if (!filenames || filenames.length === 0) return null;
      
      const { createCanvas, loadImage } = require('canvas');
      const path = require('path');
      const fs = require('fs').promises;
      const outputPath = path.join(process.cwd(), 'public', 'images', 'compiled_spritesheets', filenames[0]);
  
      await fs.mkdir('./public/images/compiled_spritesheets', { recursive: true }).catch(() => {}); // Create dir if needed
      
      // Load all images and calculate dimensions
      const images = await Promise.all(filenames.map(async filename => {
        
        const fullPath = path.join(process.cwd(), 'public', 'images', 'spritesheets', filename);
        return await loadImage(fullPath);
      }));
      
      const height = images[0].height;
      const totalWidth = images.reduce((total, img) => total + img.width, 0);
      
      // Create and draw to canvas
      const canvas = createCanvas(totalWidth, height);
      const ctx = canvas.getContext('2d');
      
      let x = 0;
      for (const img of images) {
        ctx.drawImage(img, x, 0);
        x += img.width; // Stack images horizontally
      }
      
      await fs.writeFile(outputPath, canvas.toBuffer('image/png'));
      console.log(`Compiled spritesheet saved to ${outputPath}`);
      return filenames[0];
    } catch (error) {
      console.error('Error compiling spritesheet:', error);
      return null;
    }
  }

  // checks if we already have a file named kebabCase(prompt)+".png";
  async spritesheetExists(filename: string): Promise<boolean> {

    try {
      console.log(`Checking if spritesheet exists for: ${filename}`);
      const path = require('path');
      const filePath = path.join(process.cwd(), 'public', 'images', 'spritesheets', filename);
      await fs.access(filePath);
      return true;
    } 
    catch {
      return false;
    }
  }

  // gets the filename of the spritesheet for the given pose, and generates it if it doesn't exist
  async getPoseSpritesheet(spriteSheetFileName: string, pose: string): Promise<string|null> {

    // return from cache if possible
    var expectedFileName = spriteSheetFileName.replace(".png","")+"-"+pose+".png";
    if(await this.spritesheetExists(expectedFileName)) return expectedFileName;

    // generate pose spritesheet
    return PixelLabSpritesheetGenerator.getPoseSpritesheet(spriteSheetFileName, pose);
  }

  // gets the filename of the walking spritesheet for the given prompt, and generates it if it doesn't exist
  async getWalkingSpritesheet(prompt: string): Promise<string|null> {

    // return from cache if possible
    var expectedFileName = kebabCase(prompt)+".png";
    if(await this.spritesheetExists(expectedFileName)) return expectedFileName;

    // generate walking spritesheet
    const generator = new RetroDiffusionGenerator();
    const img64 = await generator.generateWalkingSpritesheet({
        prompt,
        outputPath: "./public/images/spritesheets/"+kebabCase(prompt)+".png"
      });

    return !img64 ? null : kebabCase(prompt)+".png";
  }
}