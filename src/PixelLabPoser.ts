//----
// Creates a single sprite frame in a single direction
// Uses PixelLab API and the skeleton data from aseprite to generate a pose
// To add new poses, create a 4 new skeleton file's using aseprite and place them in the public/skeletons directory
// Called by PixelLabSpriteSheetGenerator, which compiles 4 direction sprites to a 'pose spritesheet'
//----

import axios from 'axios';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// a keypoint is a point on the skeleton, e.g., head, hand, foot as created by the aseprite app with pixellab extension
type Keypoint = { 
  label: string;
  x: number;  // normalized (%) for 64x64
  y: number;
  z_index?: number;
};

// produced by the pixel lab extension for aseprite using File > Export Skeleton for API
type SkeletonData = {
  pose_keypoints: Keypoint[][];
};

export class PixelPoser {
  private readonly apiUrl = 'https://api.pixellab.ai/v1/animate-with-skeleton';
  private readonly apiKey = process.env.PIXEL_LAB_API_KEY ?? '';
  private readonly imageSize = { width: 64, height: 64 };

  constructor() {
    if (!this.apiKey) {
      throw new Error('❌ PIXEL_LAB_API_KEY not found in .env');
    }
  }

  async generatePose(base64Image: string, pose: string, direction: string): Promise<Buffer|null> {
    console.log(`🦴 Generating pose: "${pose}", direction: "${direction}"`);

    // Load reference skeleton (reference).  This is the same for all retrodiffusion generated sprites
    const referencePath = path.join(process.cwd(), 'public', 'skeletons', `default-${direction}.json`);
    const referenceData = JSON.parse(fs.readFileSync(referencePath, 'utf-8')) as SkeletonData;
    console.log(`🦴 reference data loaded from: ${referencePath}`);

    // Load target pose skeleton (e.g., falling).  create this with aseprite  > pixel lab extension > animate with skeleton > export skeleton for API
    const posePath = path.join(process.cwd(), 'public', 'skeletons', `${pose}-${direction}.json`);
    const poseData = JSON.parse(fs.readFileSync(posePath, 'utf-8')) as SkeletonData;
    console.log(`🦴 Pose data loaded from: ${posePath}`);
    
    // check validity of skeletons, each json should have exactly 1 skeleton frame in it
    if (referenceData.pose_keypoints.length > 1) throw new Error(`❌ referenceData contains more than one skeleton frame (found ${referenceData.pose_keypoints.length})`);
    if (poseData.pose_keypoints.length > 1) throw new Error(`❌ poseData contains more than one skeleton frame (found ${poseData.pose_keypoints.length})`);
    if (!referenceData.pose_keypoints?.[0] || !poseData.pose_keypoints?.[0]) throw new Error('❌ Skeleton JSON files are missing pose_keypoints');

    // Convert normalized keypoints to absolute positions
    const toAbsolute = (frame: Keypoint[]): Keypoint[] =>
      frame.map(kp => ({
        ...kp,
        x: Math.round(kp.x * this.imageSize.width),
        y: Math.round(kp.y * this.imageSize.height)
      }));;
      
      const payload = {
        image_size: this.imageSize,
        guidance_scale: 4,
        view: 'low top-down',
        direction,
        isometric: false,
        oblique_projection: false,
        skeleton_keypoints: [
          referenceData.pose_keypoints[0],  // Frame 1 — frozen
          referenceData.pose_keypoints[0],  // Frame 2 — frozen (duplicate of frame 1)
          poseData.pose_keypoints[0]        // Frame 3 — to generate
        ],
        reference_image: {
          type: 'base64',
          base64: base64Image
        },
        inpainting_images: [
          { type: 'base64', base64: base64Image },  // Freeze frame 1
          { type: 'base64', base64: base64Image },  // Freeze frame 2
          null                                      // Generate frame 3
        ],
        mask_images: [
          null,
          null,
          null
        ],
        color_image: {
          type: 'base64',
          base64: base64Image // lock avaialble palette colors
        }
      };

    // Debug payload, if needed
    //console.log(`📦 Payload Preview: { image_size: ${JSON.stringify(payload.image_size)}, guidance_scale: ${payload.guidance_scale}, view: "${payload.view}", direction: "${payload.direction}", skeleton_keypoints: [Frame1: ${payload.skeleton_keypoints[0].length} points, Frame2: ${payload.skeleton_keypoints[1].length} points, Frame3: ${payload.skeleton_keypoints[2].length} points], reference_image: base64 (${payload.reference_image.base64.length} bytes), inpainting_images: [base64 (${payload.inpainting_images[0]?.base64.length ?? 0} bytes), ${payload.inpainting_images[1] === null ? 'null' : 'non-null'}, ${payload.inpainting_images[2] === null ? 'null' : 'non-null'}], mask_images: [${payload.mask_images.join(', ')}] }`);
    
    try {

      // Api Request
      const res = await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 180000 // 180 seconds (3 minutes)
      });

      // Response received
      console.log(`✅ Generated pose successfully!`);
      const images = res.data.images ?? [];
      console.log(`🖼️ Frames returned: ${images.length}`);

      if (images.length > 0) {

        // Save single sprite to a temp folder
        let lastBuffer: Buffer | null = null;
        images.forEach((img: { base64: string }, index: number) => {
          const suffix = index + 1;
          const outputPath = path.join(process.cwd(), "public", "images", "temp", `${pose}-${direction}-${suffix}.png`);
          const buffer = Buffer.from(img.base64, 'base64');
          fs.writeFileSync(outputPath, buffer);
          console.log(`💾 Saved: ${pose}-${direction}-${suffix}.png`);
          if (suffix === 3) {
            lastBuffer = buffer;
          }
        });

        // Return single sprite to the function caller- likely PixelLabSpriteSheetGenerator
        return lastBuffer;
      }
    } catch (err: any) {
      console.error('❌ API Error:', err.response?.data || err.message);
    }

    return null;
  }
}