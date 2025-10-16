import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';


export type AppRole = 'admin' | 'customer';

export interface JwtPayload {
  sub: string;               
  role: AppRole;             
  emailVerified: boolean;    
  iat?: number;              
  exp?: number;             
}

export interface AuthReq extends Request {
  user?: JwtPayload;         
  authToken?: string;        
}


function getBearerToken(req: Request): string | undefined {
  const hdr = req.headers.authorization;
  if (hdr?.startsWith('Bearer ')) return hdr.slice(7);
  return undefined;
}


export function requireAuth(req: AuthReq, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'NO_AUTH_HEADER' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    req.authToken = token;

    return next();
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      return res.status(401).json({ error: 'TOKEN_EXPIRED' });
    }
    if (e instanceof JsonWebTokenError) {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
    return res.status(401).json({ error: 'AUTH_ERROR' });
  }
}

//quiero un rol especifico
export function requireRole(role: AppRole) {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    next();
  };
}

//quiero cualquiera de estos roles
export function requireAnyRole(roles: AppRole[]) {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    next();
  };
}

//quiero que sea el mismo usuario o admin
export function requireSelfOrAdmin() {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const isSelf = req.params?.id && req.params.id === req.user.sub;

    // Si es el mismo usuario o tiene rol admin le pasa
    if (isSelf || req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'FORBIDDEN' });
  };
}

//correo verificado(no se como seguirlo :cc)
export function requireVerifiedEmail(req: AuthReq, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
  }

  next();
}
