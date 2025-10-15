import bcrypt from 'bcrypt';        
import jwt from 'jsonwebtoken';
import { UserModel } from './model';

const ROUNDS = 10;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

type RegisterInput = {
  cc: string;               
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'admin' | 'customer';
};

type LoginInput = {
  /** Puede ser email o cc */
  identifier: string;
  password: string;
};

function toPublic(u: any) {
  const id = u.id ?? u._id?.toString?.() ?? u._id;
  return {
    id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    addresses: u.addresses ?? [],
  };
}

/** Registro con CC como _id */
export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const cc = input.cc.trim();

  const emailExists = await UserModel.findOne({ email });
  if (emailExists) { const e:any=new Error('EMAIL_TAKEN'); e.status=409; throw e; }

  const ccExists = await UserModel.findById(cc);
  if (ccExists) { const e:any=new Error('CC_ALREADY_EXISTS'); e.status=409; throw e; }

  const passwordHash = await bcrypt.hash(input.password, ROUNDS);

  const user = await UserModel.create({
    _id: cc,
    email,
    passwordHash,
    name: input.name,
    phone: input.phone,
    role: input.role,                 
    emailVerified: false,
    createdAt: new Date().toISOString(),
    addresses: [],
  });

  return toPublic(user);
}

/** Login con email o cc */
export async function login(input: LoginInput) {
  const id = input.identifier.trim();
  const query = id.includes('@') ? { email: id.toLowerCase() } : { _id: id };
  const user = await UserModel.findOne(query);
  if (!user) {
    const err: any = new Error('INVALID_CREDENTIALS');
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    const err: any = new Error('INVALID_CREDENTIALS');
    err.status = 401;
    throw err;
  }

  const payload = { sub: user._id, role: user.role, emailVerified: user.emailVerified };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET!,         { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TTL });

  return {
    accessToken,
    refreshToken,
    user: toPublic(user),
  };
}

/** Listado */
export async function list() {
  const docs = await UserModel.find();
  const items = docs.map(toPublic);
  return { items, total: items.length };
}

export async function getById(id: string) {
  const u = await UserModel.findById(id);
  if (!u) {
    const err: any = new Error('USER_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  return toPublic(u);
}

/** Perfil del usuario autenticado */
export async function getMe(userId: string) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any = new Error('USER_NOT_FOUND'); e.status = 404; throw e; }
  return toPublic(u);
}

export async function updateMe(
  userId: string,
  data: Partial<{ name: string; phone: string }>
) {
  const u = await UserModel.findByIdAndUpdate(userId, data, { new: true });
  if (!u) { const e:any = new Error('USER_NOT_FOUND'); e.status = 404; throw e; }
  return toPublic(u);
}

/** Direcciones */
export async function getAddresses(userId: string) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any = new Error('USER_NOT_FOUND'); e.status = 404; throw e; }
  return u.addresses ?? [];
}

export async function addAddress(
  userId: string,
  addr: { id: string; city: string; postalCode: string; address: string }
) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any = new Error('USER_NOT_FOUND'); e.status = 404; throw e; }

  u.addresses = u.addresses || [];
  if (u.addresses.some(a => a.id === addr.id)) {
    const e:any = new Error('ADDRESS_ID_TAKEN');
    e.status = 409;
    throw e;
  }

  u.addresses.push(addr);
  await u.save();
  return (u.addresses ?? []);
}

export async function updateAddress(
  userId: string,
  addrId: string,
  data: Partial<{ city: string; postalCode: string; address: string }>
) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any = new Error('USER_NOT_FOUND'); e.status = 404; throw e; }

  const idx = (u.addresses ?? []).findIndex(a => a.id === addrId);
  if (idx === -1) { const e:any = new Error('ADDRESS_NOT_FOUND'); e.status = 404; throw e; }
  if (typeof data.city === 'string') u.addresses![idx].city = data.city;
  if (typeof data.postalCode === 'string') u.addresses![idx].postalCode = data.postalCode;
  if (typeof data.address === 'string') u.addresses![idx].address = data.address;

  await u.save();
  return u.addresses![idx]; 
}

export async function removeAddress(userId: string, addrId: string) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any = new Error('USER_NOT_FOUND'); e.status = 404; throw e; }
  const before = u.addresses?.length ?? 0;
  u.addresses = (u.addresses ?? []).filter(a => a.id !== addrId);
  if ((u.addresses?.length ?? 0) === before) {
    const e:any = new Error('ADDRESS_NOT_FOUND'); e.status = 404; throw e;
  }
  await u.save();
  return (u.addresses ?? []);
}
