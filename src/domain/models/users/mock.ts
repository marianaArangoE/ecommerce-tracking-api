import { User } from './userModel';
export const users: User[] = [
  { id:'u1', email:'mae@example.com', passwordHash:'***', name:'Ana',
    role:'USER', emailVerified:true, createdAt:new Date().toISOString() },
  { id:'u2', email:'admin@example.com', passwordHash:'***', name:'Admin',
    role:'ADMIN', emailVerified:true, createdAt:new Date().toISOString() }
];
