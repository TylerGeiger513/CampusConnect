import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    // Add any other properties as needed
  }
}

declare global {
  namespace Express {
    interface Request {
      session: import("express-session").Session & Partial<import("express-session").SessionData>;
    }
  }
}
export {};
