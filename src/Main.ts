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
import path from 'path';

export class Main {

  public httpServer: HttpServer;

  constructor() {
    
    this.httpServer = new HttpServer(this);

    // run an example 
    this.runExamples();
  }

  async runExamples() {

    // check known spritesheets
    await this.getSpritesheetAndPoses ("fire sorceress");
  }

  // determine what poses we have (ignore 'default') by looking at the json's in public/skeletons folder
  async determinePoses(): Promise<string[]> {

    // check public/skeletons for json files
    const skeletonPath = path.join(process.cwd(), 'public', 'skeletons');
    const allFiles = await fs.readdir(skeletonPath);

    // Extract poses that have all 4 directional JSON files
    const poseCounts: { [pose: string]: Set<string> } = {};
    for (const file of allFiles) {
      const match = file.match(/^(.+)-(east|north|south|west)\.json$/);
      if (match) {
        const poseName = match[1];
        const direction = match[2];
        if (poseName !== 'default') {
          if (!poseCounts[poseName]) poseCounts[poseName] = new Set();
          poseCounts[poseName].add(direction);
        }
      }
    }

    // found valid poses
    return Object.entries(poseCounts)
      .filter(([_, directions]) => directions.size === 4)
      .map(([poseName]) => poseName);
  }

  // generates both the walking spritesheet (with retrodiffusion) and poses (with pixellab) for all 4 directions
  async getSpritesheetAndPoses(testPrompt: string) {

    var fileName = await this.getWalkingSpritesheet(testPrompt); // retrodiffussion: generate walking spritesheet
    if(!fileName) throw new Error("Failed to generate spritesheet");

    // determine which poses have json files
    var eligiblePoses = await this.determinePoses();
    console.log("Queuing Pose Spritesheet generation for eligible poses:", eligiblePoses);

    // go through each pose and getPoseSpritesheet
    var poseFilenames = []; // pixel lab
    for (const pose of eligiblePoses) {
      poseFilenames.push(await this.getPoseSpritesheet(fileName, pose));
    }

    // check success of all poses
    if (poseFilenames.some(filename => filename === null)) throw new Error("Failed to generate pose spritesheet");

    // If we reach here, all are non-null, so we can safely filter and cast
    const validFilenames: string[] = poseFilenames.filter((filename): filename is string => filename !== null);

    // compile all poses into a single spritesheet
    await this.compileSpritesheet([fileName, ...validFilenames]);
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