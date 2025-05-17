//----
// Express server
// Used to serve a test page at localhost:3016
// and to handle API requests from the satoshi-client project, a unity game
//----

import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import basicAuth from 'express-basic-auth';
import { Main } from './Main';
import path from 'path';
import dotenv from 'dotenv';
import { Routes } from './Routes';
dotenv.config();
import { AuthManager } from './AuthManager';
import cookieParser from 'cookie-parser';
import expressStaticGzip = require('express-static-gzip');

export class HttpServer {
  app: Express;
  port: number;
  main: Main;
  status: string = 'starting';

  constructor(main: Main) {
    this.main = main;
    this.app = express();
    this.port = parseInt(process.env.HTTP_PORT || '3016', 10);

    // View engine setup
    this.app.set('views', path.join(__dirname, '../views')); 
    this.app.set('view engine', 'ejs'); 

    // Middleware
    this.app.use(cookieParser());
    this.app.set('trust proxy', 1);
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.locals.urlPath = process.env.URL_PATH; // URL_PATH is different in development and production.  this allows .ejs files to quickly pull <%= urlPath %> before links
    this.app.locals.urlDomain = process.env.URL_DOMAIN; // URL_PATH is different in development and production.  this allows .ejs files to quickly pull <%= urlPath %> before links
    this.app.use(rateLimit({windowMs: 60 * 1000, max: 99999/*500 req/min*/, message: "Too many requests."}));
    this.app.use(express.json());

    // allow webgl's 'br' encoding for gzip files
    const webglBuildPath = path.join(__dirname, '../../satoshi-server/brawlers/WebBuild');
    this.app.use(
      '/satoshi/brawlers/WebBuild',
      expressStaticGzip(webglBuildPath, {
        enableBrotli: true,
        orderPreference: ['br', 'gz'],
        setHeaders: (res: express.Response, _path: string) => {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      } as any)
    );

    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../public')));

    // Auth routes
    const authManager = new AuthManager(this.main); // Auth API routes
    this.app.post('/api/auth/login', (req, res) => authManager.login(req, res));
    this.app.get('/api/auth/logout', (req, res) => authManager.logout(req, res));
    this.app.get('/api/auth/check', (req, res) => authManager.checkAuth(req, res));

    // Routes
    const routes = new Routes(this.main);
    this.app.use(routes.getRouter());

    // begin listening
    this.app.listen(this.port, () => {
      console.log(`Server running at http://localhost:${this.port}/`);
      this.status = 'running';
    });
  }

  getStatus(): string {
    return this.status;
  }
}