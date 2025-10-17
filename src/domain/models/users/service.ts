import bcrypt from 'bcrypt';            // o 'bcryptjs' si prefieres
import jwt from 'jsonwebtoken';
import { UserModel } from './model';
import { generateVerificationToken, sendVerificationEmail } from '../../services/emailService';

const ROUNDS = 10;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const MAX_FAILS = 3;        // intentos permitidos
const LOCK_MINUTES = 15;    // bloqueo temporal

type RegisterInput = {
  cc: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'admin' | 'customer';
};

type LoginInput = { identifier: string; password: string };

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

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60 * 1000);
}

/** Registro con CC como _id y rol elegido */
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
    failedLoginCount: 0,
    lockUntil: null,
    refreshTokens: [],
  });

  // Enviar email de verificación después del registro
  try {
    await generateAndSendVerificationToken(user._id);
  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    // No fallar el registro si el email falla
  }

  return toPublic(user);
}

/** Login con email o cc + bloqueo por intentos + almacenamiento de refresh */
export async function login(input: LoginInput) {
  const id = input.identifier.trim();
  const query = id.includes('@') ? { email: id.toLowerCase() } : { _id: id };
  const user = await UserModel.findOne(query);
  if (!user) { const err:any=new Error('INVALID_CREDENTIALS'); err.status=401; throw err; }

  // ¿bloqueado?
  const isLocked = user.lockUntil && user.lockUntil instanceof Date && user.lockUntil.getTime() > Date.now();
  if (isLocked) {
    const err:any = new Error('ACCOUNT_LOCKED');
    err.status = 423;
    err.unlockAt = user.lockUntil;
    throw err;
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    const fails = (user.failedLoginCount ?? 0) + 1;
    user.failedLoginCount = fails;

    if (fails >= MAX_FAILS) {
      user.lockUntil = addMinutes(new Date(), LOCK_MINUTES);
      user.failedLoginCount = 0; // opcional: reset cuando se bloquea
    }

    await user.save();

    const stillLocked = user.lockUntil && user.lockUntil instanceof Date && user.lockUntil.getTime() > Date.now();
    const err:any = new Error(stillLocked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS');
    err.status = stillLocked ? 423 : 401;
    err.unlockAt = user.lockUntil;
    throw err;
  }

  // éxito → limpiar bloqueo/contador
  user.failedLoginCount = 0;
  user.lockUntil = null;

  const payload = { sub: user._id, role: user.role, emailVerified: user.emailVerified };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET!,         { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TTL });

  // guardar refresh
  const refreshExp = addMinutes(new Date(), 7 * 24 * 60); // 7 días
  user.refreshTokens = user.refreshTokens ?? [];
  user.refreshTokens.push({ token: refreshToken, expiresAt: refreshExp });

  await user.save();

  return { accessToken, refreshToken, user: toPublic(user) };
}

/** Emitir nuevo access + rotar refresh (si el recibido es válido y no revocado) */
export async function refresh(refreshToken: string) {
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
  } catch {
    const e:any=new Error('INVALID_REFRESH'); e.status=401; throw e;
  }

  const user = await UserModel.findById(payload.sub);
  if (!user) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }

  const entry = (user.refreshTokens ?? []).find(rt => rt.token === refreshToken && rt.expiresAt > new Date());
  if (!entry) { const e:any=new Error('REFRESH_REVOKED_OR_EXPIRED'); e.status=401; throw e; }

  const newPayload = { sub: user._id, role: user.role, emailVerified: user.emailVerified };
  const accessToken = jwt.sign(newPayload, process.env.JWT_SECRET!, { expiresIn: ACCESS_TTL });
  const newRefresh  = jwt.sign(newPayload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TTL });
  const newExp = addMinutes(new Date(), 7 * 24 * 60);

  user.refreshTokens = (user.refreshTokens ?? []).filter(rt => rt.token !== refreshToken);
  user.refreshTokens.push({ token: newRefresh, expiresAt: newExp });
  await user.save();

  return { accessToken, refreshToken: newRefresh };
}

/** Revocar refresh (logout) */
export async function logout(userId: string | undefined, refreshToken: string) {
  if (!userId) { const e:any=new Error('UNAUTHORIZED'); e.status=401; throw e; }
  const u = await UserModel.findById(userId);
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }
  u.refreshTokens = (u.refreshTokens ?? []).filter(rt => rt.token !== refreshToken);
  await u.save();
  return { ok: true };
}

/** Listado */
export async function list() {
  const docs = await UserModel.find();
  const items = docs.map(toPublic);
  return { items, total: items.length };
}

export async function getById(id: string) {
  const u = await UserModel.findById(id);
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }
  return toPublic(u);
}

/** Perfil */
export async function getMe(userId: string) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }
  return toPublic(u);
}

export async function updateMe(
  userId: string,
  data: Partial<{ name: string; phone: string; role: 'admin' | 'customer' }>
) {
  const update: any = {};
  if (typeof data.name === 'string') update.name = data.name;
  if (typeof data.phone === 'string') update.phone = data.phone;
  if (data.role && (data.role === 'admin' || data.role === 'customer')) update.role = data.role;

  const u = await UserModel.findByIdAndUpdate(userId, { $set: update }, { new: true });
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }
  return toPublic(u);
}

/** Direcciones */
export async function getAddresses(userId: string) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }
  return u.addresses ?? [];
}

export async function addAddress(
  userId: string,
  addr: { id: string; city: string; postalCode: string; address: string }
) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }

  u.addresses = u.addresses || [];
  if (u.addresses.some((a: any) => a.id === addr.id)) {
    const e:any=new Error('ADDRESS_ID_TAKEN'); e.status=409; throw e;
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
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }

  const idx = (u.addresses ?? []).findIndex((a: any) => a.id === addrId);
  if (idx === -1) { const e:any=new Error('ADDRESS_NOT_FOUND'); e.status=404; throw e; }

  if (typeof data.city === 'string') u.addresses![idx].city = data.city;
  if (typeof data.postalCode === 'string') u.addresses![idx].postalCode = data.postalCode;
  if (typeof data.address === 'string') u.addresses![idx].address = data.address;

  await u.save();
  return u.addresses![idx];
}

export async function removeAddress(userId: string, addrId: string) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }
  const before = u.addresses?.length ?? 0;
  u.addresses = (u.addresses ?? []).filter((a: any) => a.id !== addrId);
  if ((u.addresses?.length ?? 0) === before) {
    const e:any=new Error('ADDRESS_NOT_FOUND'); e.status=404; throw e;
  }
  await u.save();
  return (u.addresses ?? []);
}

/** Verificar email con token */
export async function verifyEmail(token: string) {
  const user = await UserModel.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });

  if (!user) {
    const e:any = new Error('INVALID_OR_EXPIRED_TOKEN');
    e.status = 400;
    throw e;
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return toPublic(user);
}

/** Reenviar email de verificación */
export async function resendVerificationEmail(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    const e:any = new Error('USER_NOT_FOUND');
    e.status = 404;
    throw e;
  }

  if (user.emailVerified) {
    const e:any = new Error('EMAIL_ALREADY_VERIFIED');
    e.status = 400;
    throw e;
  }

  // Generar nuevo token
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = expiresAt;
  await user.save();

  // Enviar email
  await sendVerificationEmail(user.email, user.name, verificationToken);

  return { message: 'Verification email sent successfully' };
}

/** Generar y enviar token de verificación (para registro) */
export async function generateAndSendVerificationToken(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    const e:any = new Error('USER_NOT_FOUND');
    e.status = 404;
    throw e;
  }

  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = expiresAt;
  await user.save();

  // Enviar email
  await sendVerificationEmail(user.email, user.name, verificationToken);

  return { message: 'Verification email sent successfully' };
}
