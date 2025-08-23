export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;      
  role: string;
  emailVerified: boolean;
  createdAt: string;
}
