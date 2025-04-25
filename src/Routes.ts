//---------
// Contains the routes for the express server
// Handles the API requests from the satoshi-client unity game
// Also handles the / route for the web interface
//---------

import { Router, Request, Response } from 'express';
import { Main } from './Main';
import { PixelPoser } from './PixelLabPoser';
const fs = require('fs').promises;
const path = require('path');


export class Routes 
{
  private router: Router;
  private main: Main;

  private rateLimiter: { [ip: string]: number } = {};
  private limitToOneCallEveryXMinutes: number = 5; // 5 minutes

  constructor(main: Main) 
  {
    this.main = main;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void 
  {
    // generate route
    this.router.post('/generate-compiled-spritesheet', async (req: Request, res: Response) => {
      try {
        const prompt = req.body.prompt;
        console.log('/generate-compiled-spritesheet route called. Prompt:', prompt);
        
        // Get user IP address
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        
        // Check if user is rate limited
        const now = Date.now();
        const lastRequest = this.rateLimiter[ip] || 0;
        
        if (now - lastRequest < this.limitToOneCallEveryXMinutes * 60 * 1000) {

          // User is rate limited
          return res.redirect(process.env.URL_PATH+'/?alert=' + encodeURIComponent('Please wait at least 5 minutes between generations'));
        }
        
        // Update the rate limiter with current timestamp
        this.rateLimiter[ip] = now;
        
        // Process the prompt in background
        this.main.getSpritesheetAndPoses(prompt);
    
        // redirect to / with an alert
        res.redirect(process.env.URL_PATH+'/?alert=' + encodeURIComponent('Now generating spritesheets... please refresh this page in 5 minutes'));
        
      } catch (error) {
        console.error('Error processing generation request:', error);
        res.status(500).send('Server error');
      }
    });
    
    // Home page route
    this.router.get('/skeleton', async (req: Request, res: Response) => {
      try {

        const viewData = { };
        res.render('skeletonTool', { viewData });
      } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).send('Server error');
      }
    });
        
    // Home page route
    this.router.get('/', async (req: Request, res: Response) => {
      try {
        
        // using html, display all images in images/spritesheets for content
        const spritesheetsDir = path.join(process.cwd(), 'public', 'images', 'compiled_spritesheets');
        const files = await fs.readdir(spritesheetsDir);
        const content = files.map((file: string) => {
          if (file.startsWith('.')) return ''; // ignore hidden files like .ds_store
          const filePath = path.join(process.env.URL_PATH+'/images/compiled_spritesheets', file);
          return `<div class="spritesheet-container">
            <img src="${filePath}" alt="${file}" style="image-rendering: pixelated;">
          </div>`;
        }).join('');

        const viewData = {  
            title: `Lysle.net Spritesheet Generator`,
            content,
            alert: req.query.alert || null,
        };
        res.render('index', { viewData });

    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).send('Server error');
      }
    });

    // Add this to your setupRoutes method in the Routes class
    this.router.post('/api/generate-from-skeleton', async (req: Request, res: Response) => {
      try {
        console.log('/api/generate-from-skeleton called');
        
        // Log the entire request body for debugging
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const { refImage, refImage2 = null, refSkeleton1, refSkeleton2 = null, skeletonToGenerateFrom, direction = "west" } = req.body;
        
        // Log the extracted values
        console.log('refImage length:', refImage ? refImage.length : 'undefined');
        console.log('refSkeleton1:', refSkeleton1 ? `Array with ${refSkeleton1.length} items` : 'undefined');
        console.log('skeletonToGenerateFrom:', skeletonToGenerateFrom ? `Array with ${skeletonToGenerateFrom.length} items` : 'undefined');
        console.log('direction:', direction);
        
        if (!refImage || !refSkeleton1 || !skeletonToGenerateFrom) {
          console.log('Missing required fields!');
          return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        try {
          let pixelPoser = new PixelPoser();
          console.log('PixelPoser created successfully');
          
          let imageBuffer = refImage2 && refSkeleton2
            ? await pixelPoser.generatePoseWithMultipleSkeletons(refImage, refImage2, refSkeleton1, refSkeleton2, skeletonToGenerateFrom, direction)
            : await pixelPoser.generatePoseWithSkeletons(refImage, refSkeleton1, skeletonToGenerateFrom, direction);
          
          if (!imageBuffer) {
            console.log('No image buffer returned from PixelPoser');
            return res.status(500).json({ success: false, error: 'Failed to generate image' });
          }
          
          console.log('Image generated successfully, buffer size:', imageBuffer.length);
          res.json({ success: true, image: imageBuffer.toString('base64') });
          
        } catch (error: any) {
          console.error('Error in PixelPoser:', error);
          return res.status(500).json({ success: false, error: `PixelPoser error: ${error.message || 'Unknown error'}` });
        }
      } catch (error) {
        console.error('Error generating image from skeleton:', error);
        res.status(500).json({ success: false, error: 'Server error while generating image' });
      }
    });

    //api/generate-spritesheet
    this.router.post('/api/generate-spritesheet', async (req, res) => {
      try {

        const prompt = req.body.value;
        console.log('/api/generate-spritesheet called.  Prompt: ', prompt);
        console.log('Request headers:', req.headers);
        console.log('Raw body:', req.body); // This should show your JSON data
        if (!prompt) {
          res.status(400).json({ error: 'Prompt is required' });
          return;
        }
        
        const filename:string|null = await this.main.getWalkingSpritesheet(prompt);
        console.log('Ran generateSpritesheet().  Result filename: ', filename);
        if(!filename) {
          res.status(500).json({ error: 'Failed to generate spritesheet' });
          return;
        }

        // create the response value containing the filename
        res.json({ value: filename, success: true });

      } catch (error) {
        console.error('Error generating spritesheet:', error);
        res.status(500).json({ error: 'Failed to generate spritesheet' });
      }
    });

    this.router.post('/api/game-init', async (req, res) => {
      try {
        // Get all files from the spritesheets directory
        const value = req.body.value; // Get the 'id' of the client
        console.log('Received game-init request from id:', value); // Log it only for now
        
        const spritesheetsDir = path.join(process.cwd(), 'public', 'images', 'spritesheets');
        const files = await fs.readdir(spritesheetsDir);
        
        // Create the response object containing filenames
        res.json({ values: files });

      } catch (error) {
        console.error('Error reading spritesheet directory:', error);
        res.status(500).json({ error: 'Failed to load spritesheet files' });
      }
    });
  }

  public getRouter(): Router 
  {
        return this.router;
  }
}