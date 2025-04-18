import { Request, Response, NextFunction } from 'express';
import { Main } from './Main';

export class AuthManager {
  private main: Main;
  private adminPassword: string;
  
  constructor(main: Main) {
    this.main = main;
    this.adminPassword = process.env.ADMIN_PASSWORD || 'admin'; // Default for dev only
  }

  // Middleware to check if user is authenticated
  public isAuthenticated(req: Request, res: Response, next: NextFunction): void {
    const authCookie = req.cookies?.uploadAuth;
    
    if (authCookie === this.adminPassword) next();
    else res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  // Login handler
  public login(req: Request, res: Response): void {
    const { password } = req.body;
    
    if (password === this.adminPassword) {
      res.cookie('uploadAuth', password, { 
        maxAge: 24 * 60 * 60 * 1000, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      res.json({ success: true });
    } else res.status(401).json({ success: false, message: 'Invalid password' });
  }

  // Logout handler
  public logout(req: Request, res: Response): void {
    res.clearCookie('uploadAuth');
    res.json({ success: true });
  }

  // Check auth status
  public checkAuth(req: Request, res: Response): void {
    const isAuth = req.cookies?.uploadAuth === this.adminPassword;
    res.json({ authenticated: isAuth });
  }
}