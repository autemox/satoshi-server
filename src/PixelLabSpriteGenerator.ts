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

export class PixelLabSpriteGenerator {
  private readonly apiUrl = 'https://api.pixellab.ai/v1/animate-with-skeleton';
  private readonly imageSize = { width: 64, height: 64 };

  constructor() {
  }

  // Generates a pose from another image using rotation
  async generatePoseFromRotation(
    base64Image: string, 
    fromDirection: string, 
    toDirection: string, 
    fromView: string = 'side', 
    toView: string = 'side', 
    apiKey?: string, 
    lockPaletteColors: boolean = true,
    imageGuidanceScale: number = 3,
  ): Promise<Buffer|null> {
    console.log(`🔄 Rotating image from "${fromDirection}" to "${toDirection}"`);
    
    // Strip data URL prefix if present
    const cleanedBase64 = this.StripDataUrl(base64Image);
    
    // Prepare API payload based on documentation
    const payload = {
      image_size: this.imageSize,
      image_guidance_scale: imageGuidanceScale, // Default from docs
      from_view: fromView,
      to_view: toView,
      from_direction: fromDirection,
      to_direction: toDirection,
      isometric: false,
      oblique_projection: false,
      from_image: {
        type: 'base64',
        base64: cleanedBase64
      },
      ...(lockPaletteColors ? {
        color_image: {
          type: 'base64',
          base64: cleanedBase64 // Lock available palette colors
        }
      } : {})
    };
    
    // Try up to 5 times
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`🔄 Attempt ${attempt} of 5`);
      
      try {
        // Use provided API key or fallback to environment variable
        apiKey = this.CheckApiKey(apiKey); // Check if the API key is valid
        
        // Make API request
        console.log('API Key being sent:', apiKey); 
        const res = await axios.post('https://api.pixellab.ai/v1/rotate', payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000 // 10 minutes
        });
        
        console.log(`✅ Rotated image successfully!`);
        
        // Extract image from response
        if (res.data && res.data.image && res.data.image.base64) {
          const buffer = Buffer.from(res.data.image.base64, 'base64');
          return buffer;
        } else {
          console.error('❌ Unexpected API response format');
        }
      } catch (err: any) {
        console.error('❌ API Error:', err.response?.data || err.message);
      }
      
      // Wait before retrying
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.error('❌ All rotation retry attempts failed');
    return null;
  }

    // takes a pose string and direction and finds relavent json files from pose
    async generatePose(base64Image: string, pose: string, direction: string): Promise<Buffer|null> {
      console.log(`🦴 Generating pose: "${pose}", direction: "${direction}"`);
  
      // Load reference skeleton (reference)
      const referencePath = path.join(process.cwd(), 'public', 'skeletons', `default-${direction}.json`);
      const referenceData = JSON.parse(fs.readFileSync(referencePath, 'utf-8')) as SkeletonData;
      console.log(`🦴 reference data loaded from: ${referencePath}`);
  
      // Load target pose skeleton
      const posePath = path.join(process.cwd(), 'public', 'skeletons', `${pose}-${direction}.json`);
      const poseData = JSON.parse(fs.readFileSync(posePath, 'utf-8')) as SkeletonData;
      console.log(`🦴 Pose data loaded from: ${posePath}`);
      
      // Validate skeletons
      if (referenceData.pose_keypoints.length > 1) 
        throw new Error(`❌ referenceData contains more than one skeleton frame (found ${referenceData.pose_keypoints.length})`);
      if (poseData.pose_keypoints.length > 1) 
        throw new Error(`❌ poseData contains more than one skeleton frame (found ${poseData.pose_keypoints.length})`);
      if (!referenceData.pose_keypoints?.[0] || !poseData.pose_keypoints?.[0]) 
        throw new Error('❌ Skeleton JSON files are missing pose_keypoints');
  
      // Call the base method with the loaded skeletons
      return this.generatePoseWithSkeletons(base64Image, referenceData.pose_keypoints[0], poseData.pose_keypoints[0], direction, pose, undefined);
    }

    // New method - takes 2 skeletons + 1 reference image
  async generatePoseWithSkeletons(base64Image: string, referenceSkeleton: Keypoint[], skeletonToGenerateFrom: Keypoint[], direction: string, poseForSaveFile?: string, apiKey?: string, lockPaletteColors = true): Promise<Buffer|null> {
    
    console.log(`🦴 Generating pose with provided skeletons, direction: "${direction}"`);
    console.log(`🦴 base64Image details: ${base64Image}`);
    console.log(`🦴 referenceSkeleton details: ${JSON.stringify(referenceSkeleton)}`);
    console.log(`🦴 skeletonToGenerateFrom details: ${JSON.stringify(skeletonToGenerateFrom)}`);
    console.log(`🦴 direction: ${direction}`);
    console.log(`🦴 poseForSaveFile: ${poseForSaveFile}`);
    console.log(`🦴 apiKey: ${apiKey}`);
    console.log(`🦴 ------------`);

    // Call the advanced method by duplicating the reference skeleton and image
    return this.generatePoseWithMultipleSkeletons(
      base64Image,          // Reference image #1
      base64Image,          // Duplicate
      referenceSkeleton,    // Reference skeleton #1
      referenceSkeleton,    // Duplicate
      skeletonToGenerateFrom,       // Target skeleton to generate an image from this skeleton
      direction,
      poseForSaveFile,
      apiKey,
      lockPaletteColors
    );
  }

  StripDataUrl(input: string): string {
    // Check if it's a data URL and strip the prefix if present
    const matches = input.match(/^data:image\/\w+;base64,(.*)$/);
    return matches ? matches[1] : input;
  }

  // Check if the API key is valid
  CheckApiKey(apiKey: string | undefined): string {

      // Check if API key is provided
      if(!apiKey || apiKey === '' || apiKey.length<5) 
        {
            console.log('❌ API Key is missing or invalid, using development key');
            apiKey = process.env.PIXEL_LAB_API_KEY_DEVELOPMENT; // PIXEL_LAB_API_KEY_DEVELOPMENT is purposely not set on the aws server, since other people can use the lysle.net/skeleton app
  
            if(!apiKey || apiKey === '' || apiKey.length<5)
            {
                console.log('❌ API Key is missing or invalid, using development key');
                throw new Error('❌ API Key is missing or invalid');
            }
        }
    return apiKey;
  }

  // Advanced method - takes 3 skeletons + 2 reference images, this has the retry logic
  async generatePoseWithMultipleSkeletons(
    base64Image1: string,
    base64Image2: string,
    skeleton1: Keypoint[],
    skeleton2: Keypoint[],
    skeletonToGenerateFrom: Keypoint[],
    direction: string,
    poseForSaveFile?: string,
    apiKey?: string,
    lockPaletteColors: boolean = true
  ): Promise<Buffer|null> {
    console.log(`🦴 Generating pose with multiple skeletons, direction: "${direction}"`);
    
    // Try up to 5 times
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`🔄 Attempt ${attempt} of 5`);
      
      const result = await this.generatePoseWithMultipleSkeletonsWithoutRetry(
        base64Image1,
        base64Image2,
        skeleton1,
        skeleton2,
        skeletonToGenerateFrom,
        direction,
        poseForSaveFile,
        apiKey,
        lockPaletteColors
      );
      
      if (result) return result; // Success!
      
      // Wait 2 seconds before retrying
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.error('❌ All retry attempts failed');
    return null;
  }

  sanitizeKeypoints(keypoints: Keypoint[]): Keypoint[] {
  return keypoints.map(kp => ({
    ...kp,
    z_index: kp.z_index !== undefined ? Math.round(kp.z_index) : undefined,
  }));
}
  
  // Performs the actual API call without retry logic
  private async generatePoseWithMultipleSkeletonsWithoutRetry(
    base64Image1: string,
    base64Image2: string,
    skeleton1: Keypoint[],
    skeleton2: Keypoint[],
    skeletonToGenerateFrom: Keypoint[],
    direction: string,
    poseForSaveFile?: string,
    apiKey?: string,
    lockPaletteColors: boolean = true
  ): Promise<Buffer|null> {

    // convert date url images to base64 string only images
    base64Image1 = this.StripDataUrl(base64Image1);
    base64Image2 = this.StripDataUrl(base64Image2);
    console.log(`🦴 base64Image1: ${base64Image1.length} bytes`);
    console.log(`🦴 base64Image2: ${base64Image2.length} bytes`);

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
          this.sanitizeKeypoints(skeleton1),  // Frame 1 — frozen
          this.sanitizeKeypoints(skeleton2),  // Frame 2 — frozen (duplicate of frame 1)
          this.sanitizeKeypoints(skeletonToGenerateFrom)        // Frame 3 — to generate
        ],
        reference_image: {
          type: 'base64',
          base64: base64Image1
        },
        inpainting_images: [
          { type: 'base64', base64: base64Image1 },  // Freeze frame 1
          { type: 'base64', base64: base64Image2 },  // Freeze frame 2
          null                                      // Generate frame 3
        ],
        mask_images: [
          null,
          null,
          null
        ],
        ...(lockPaletteColors ? {
          color_image: {
            type: 'base64',
            base64: base64Image1 // Lock available palette colors
          }
        } : {})
      };

      // Debug payload, if needed
      //console.log(`📦 Payload Preview: { image_size: ${JSON.stringify(payload.image_size)}, guidance_scale: ${payload.guidance_scale}, view: "${payload.view}", direction: "${payload.direction}", skeleton_keypoints: [Frame1: ${payload.skeleton_keypoints[0].length} points, Frame2: ${payload.skeleton_keypoints[1].length} points, Frame3: ${payload.skeleton_keypoints[2].length} points], reference_image: base64 (${payload.reference_image.base64.length} bytes), inpainting_images: [base64 (${payload.inpainting_images[0]?.base64.length ?? 0} bytes), ${payload.inpainting_images[1] === null ? 'null' : 'non-null'}, ${payload.inpainting_images[2] === null ? 'null' : 'non-null'}], mask_images: [${payload.mask_images.join(', ')}] }`);
    
    try {

      apiKey = this.CheckApiKey(apiKey); // Check if the API key is valid

      // Api Request
      console.log('API Key being sent:', apiKey); 
      const res = await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 600000 // 10 minutes
      });

      // Response received
      console.log(`✅ Generated pose successfully!`);
      const images = res.data.images ?? [];
      console.log(`🖼️ Frames returned: ${images.length}`);

      if (images.length > 0) {

        // Get the last image (the generated frame)
        const lastImage = images[images.length - 1];
        const buffer = Buffer.from(lastImage.base64, 'base64');
        
        // Only save to disk if we have a pose name
        if (poseForSaveFile !== '') {
          const outputPath = path.join(process.cwd(), "public", "images", "temp", `${poseForSaveFile}-${direction}.png`);
          fs.writeFileSync(outputPath, buffer);
          console.log(`💾 Saved: ${poseForSaveFile}-${direction}.png`);
        }
        
        // Return the buffer
        return buffer;
      }
      
      return null;

    } catch (err: any) {
      console.error('❌ API Error:', err.response?.data || err.message);
    }

    return null;
  }
}