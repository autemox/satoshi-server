//----
// This is an example of a express server, which many of my typescript projects use
//----

import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import basicAuth from 'express-basic-auth';
import { ExampleClass } from './ExampleClass';
import { Main } from './Main';
import path from 'path';
import dotenv from 'dotenv';
import { Routes } from './Routes';
dotenv.config();

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
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.locals.urlPath = process.env.URL_PATH; // URL_PATH is different in development and production.  this allows .ejs files to quickly pull <%= urlPath %> before links
    this.app.locals.urlDomain = process.env.URL_DOMAIN; // URL_PATH is different in development and production.  this allows .ejs files to quickly pull <%= urlPath %> before links
    this.app.use(rateLimit({windowMs: 60 * 1000, max: 60/*60 req/min*/, message: "Too many requests."}));
    this.app.use(express.json());

    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../public')));

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