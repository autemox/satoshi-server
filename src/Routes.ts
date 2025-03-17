import { Router, Request, Response } from 'express';
import { Main } from './Main';
const fs = require('fs').promises;
const path = require('path');


export class Routes 
{
  private router: Router;
  private main: Main;

  constructor(main: Main) 
  {
    this.main = main;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void 
  {
    // Home page route
    this.router.get('/', async (req: Request, res: Response) => {
      try {
        
        const viewData = {  
            title: `New Project`,
            content: `Welcome to your new TypeScript project! ${this.main.exampleClass.getServerStatusString()}`, 
        };
        res.render('index', { viewData });

    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).send('Server error');
      }
    });

    //api/generate-spritesheet
    this.router.post('/api/generate-spritesheet', async (req, res) => {
      try {

        const prompt = req.body.prompt;
        console.log('/api/generate-spritesheet called.  Prompt: ', prompt);
        console.log('Request headers:', req.headers);
        console.log('Raw body:', req.body); // This should show your JSON data
        if (!prompt) {
          res.status(400).json({ error: 'Prompt is required' });
          return;
        }
        
        const filename:string|null = await this.main.generateSpritesheet(prompt);
        console.log('Ran generateSpritesheet().  Result filename: ', filename);
        if(!filename) {
          res.status(500).json({ error: 'Failed to generate spritesheet' });
          return;
        }

        res.json({ filename, success: true });

      } catch (error) {
        console.error('Error generating spritesheet:', error);
        res.status(500).json({ error: 'Failed to generate spritesheet' });
      }
    });

    this.router.get('/api/game-init', async (req, res) => {
      try {
        // Get all files from the spritesheets directory
        const spritesheetsDir = path.join(process.cwd(), 'public', 'images', 'spritesheets');
        const files = await fs.readdir(spritesheetsDir);
        
        // Create the response object
        const gameInitData = {
          spriteSheetFiles: files
        };
        
        res.json(gameInitData);
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