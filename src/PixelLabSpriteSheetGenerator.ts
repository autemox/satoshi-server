//-----
// utilizes PixelLabPoser.ts to create 4 sprites, each facing a different direction (north, east, south, west)
//-----

import fs from 'fs/promises';
import { readFileSync } from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { PixelLabSpriteGenerator } from './PixelLabSpriteGenerator';

export class PixelLabSpritesheetGenerator 
{
  // generates 1 pose in 4 directions based on an existing retrodifussion walking spritesheet and aseprite pose skeleton data
  static async getPoseSpritesheet(
    spriteSheetFileName: string,
    pose: string
  ): Promise<string | null> {
    console.log("attempting to generate pose.  spriteSheetFileName:", spriteSheetFileName, " pose:", pose);

    const directions = ['north', 'east', 'south', 'west'];

    const imageBuffer = readFileSync("./public/images/spritesheets/" + spriteSheetFileName);
    const spriteSheet = await loadImage(imageBuffer);

    const frameSize = spriteSheet.height/4; // determine frame size by dividing height of spritesheet by 4.  this allows for different size spritesheets
    const targetSize = 64; // must be 64 for pixel lab 

    const directionBase64s: Record<string, string> = {};
    for (let i = 0; i < directions.length; i++) {
      
      // Extract 48x48 from the source
      const extractCanvas = createCanvas(frameSize, frameSize);
      const extractCtx = extractCanvas.getContext('2d');
      extractCtx.clearRect(0, 0, frameSize, frameSize);
      extractCtx.drawImage(
        spriteSheet,
        frameSize, i * frameSize,     // column #1
        frameSize, frameSize,
        0, 0,
        frameSize, frameSize
      );

      // Create a new 64x64 canvas and center the 48x48 frame
      const targetCanvas = createCanvas(targetSize, targetSize);
      const targetCtx = targetCanvas.getContext('2d');
      targetCtx.clearRect(0, 0, targetSize, targetSize);

      const offset = (targetSize - frameSize) / 2;
      targetCtx.drawImage(
        extractCanvas,
        0, 0,
        frameSize, frameSize,
        offset, offset,
        frameSize, frameSize
      );

      // Convert to base64
      const base64 = targetCanvas.toDataURL().replace(/^data:image\/png;base64,/, '');
      directionBase64s[directions[i]] = base64;
    }

    const pixelPoser = new PixelLabSpriteGenerator();

    // helper function for retry logic
    const tryGeneratePose = async (baseImage: string, pose: string, direction: string, maxAttempts = 5) => {
      for (let i = 0; i < maxAttempts; i++) {
        const result = await pixelPoser.generatePose(baseImage, pose, direction);
        if (result) return result;
      }
      throw new Error(`Failed to generate ${direction} pose after ${maxAttempts} attempts`);
    };

    // Generate all poses with retry logic
    const base64NorthSprite = await tryGeneratePose(directionBase64s.north, pose, 'north');
    const base64EastSprite = await tryGeneratePose(directionBase64s.east, pose, 'east');
    const base64SouthSprite = await tryGeneratePose(directionBase64s.south, pose, 'south');
    const base64WestSprite = await tryGeneratePose(directionBase64s.west, pose, 'west');

    // put the 4 sprites into a single spritesheet
    if (base64EastSprite && base64WestSprite && base64NorthSprite && base64SouthSprite) {
        console.log("generating pose spritesheet with 4 directional images");
      
        const croppedSize = frameSize; // from earlier
        const sourceSize = targetSize; // from earlier
        const cropOffset = (sourceSize - croppedSize) / 2;
      
        // Create final combined spritesheet canvas (48x48 per sprite)
        const sheetCanvas = createCanvas(croppedSize, croppedSize * 4);
        const sheetCtx = sheetCanvas.getContext('2d');
        const allSprites = [base64NorthSprite, base64EastSprite, base64SouthSprite, base64WestSprite];
      
        for (let i = 0; i < allSprites.length; i++) {
          const imgBuffer = allSprites[i];
          if (!imgBuffer) return null;
      
          const img = await loadImage(imgBuffer);
      
          // Crop 48x48 centered in 64x64
          sheetCtx.drawImage(
            img,
            cropOffset, cropOffset,
            croppedSize, croppedSize,
            0, i * croppedSize,
            croppedSize, croppedSize
          );
        }
      
        var filename = `${spriteSheetFileName.replace('.png', '')}-${pose}.png`;
        const finalPath = `./public/images/spritesheets/${filename}`;
        const outBuffer = sheetCanvas.toBuffer('image/png');
        await fs.writeFile(finalPath, outBuffer);
        console.log(`💾 Saved combined pose sheet: ${finalPath}`);
      
        return filename;
      }
      else 
      {
        console.error("Error generating pose images: ", base64EastSprite, base64WestSprite, base64NorthSprite, base64SouthSprite);
        return null;
      }
  }
}