import bcrypt from 'bcrypt';    
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/users/userModel';
import { generateVerificationToken, sendVerificationEmail } from './emailService';

const ROUNDS = 10;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const MAX_FAILS = 3;        
const LOCK_MINUTES = 15;    

//contrato de los datos de entrada
type RegisterInput = {
  cc: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'admin' | 'customer';
};
type LoginInput = { identifier: string; password: string };


// filtrar los datos sensibles
function toPublic(u: any) {
  const id = u.id ?? u._id?.toString?.() ?? u._id;
  const publicUser: Record<string, any> = {
    id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    addresses: u.addresses ?? [],
  };

  if (!u.emailVerified && u.emailVerificationToken) {
    publicUser.emailVerificationToken = u.emailVerificationToken;
  }

  return publicUser;
}
//determinar el bloqueo de la cuenta
function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60 * 1000);
}

//Registrar usuario nuevo
export async function register(input: RegisterInput) {
  //limpiar datos
  const email = input.email.trim().toLowerCase();
  const cc = input.cc.trim();
  //validacion de duplicados
  //validar email
  const emailExists = await UserModel.findOne({ email });
  if (emailExists) 
    { 
      const e:any=new Error('EMAIL_TAKEN'); 
      e.status=409; throw e; 
    }
  //validar cc
  const ccExists = await UserModel.findById(cc);
  if (ccExists) 
    { 
      const e:any=new Error('CC_ALREADY_EXISTS'); 
      e.status=409; throw e; 
    }
//encriptar contraseña
  const passwordHash = await bcrypt.hash(input.password, ROUNDS);
//crear usuario
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

//login de usuario
export async function login(input: LoginInput) {
  const id = input.identifier.trim();
  //buscar usuario por email o cc
  const query = id.includes('@') ? { email: id.toLowerCase() } : { _id: id };
  const user = await UserModel.findOne(query);
  if (!user) 
    {
       const err:any = new Error('INVALID_CREDENTIALS'); 
       err.status = 401; 
       throw err; 
    }

  // ta bloqueado?
const isLocked = user.lockUntil && user.lockUntil.getTime() > Date.now();
  if (isLocked) {
    const err:any = new Error('ACCOUNT_LOCKED');
    err.status = 423;
    err.unlockAt = user.lockUntil;
    throw err;
  }
// verificar contraseña
  const passwordIsCorrect = await bcrypt.compare(input.password, user.passwordHash);
//contraseña incorrecta
  if (!passwordIsCorrect) 
    {
    const fails = (user.failedLoginCount ?? 0) + 1;
    user.failedLoginCount = fails;

    if (fails >= MAX_FAILS) {
      user.lockUntil = addMinutes(new Date(), LOCK_MINUTES);
      user.failedLoginCount = 0;
    }
//guardar el estado, bloqueador o contador
    await user.save();

    const stillLocked = user.lockUntil && user.lockUntil.getTime() > Date.now();
    const err:any = new Error(stillLocked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS');
    err.status = stillLocked ? 423 : 401;
    err.unlockAt = user.lockUntil;
    throw err;
  }

//contraseña correcta
  user.failedLoginCount = 0;
  user.lockUntil = null;
//info que le woa dar al token 
  const payload = { sub: user._id, role: user.role, emailVerified: user.emailVerified };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET!,         { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TTL });

  // guardar refresh
  //toca pasar de dias a minutos (sacaba un error :v)
  const refreshExp = addMinutes(new Date(), 7 * 24 * 60);
  user.refreshTokens = user.refreshTokens ?? [];
  user.refreshTokens.push({ token: refreshToken, expiresAt: refreshExp });

  await user.save();

  return { accessToken, refreshToken, user: toPublic(user) };
}

//renovar el token si el refresh no se ha invalidado con el logout
export async function refresh(refreshToken: string) {
  let payload: any;
  // el token es válido?
  try 
  {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
  }catch {
    const e:any = new Error('INVALID_REFRESH'); 
    e.status = 401; 
    throw e;
  }
//encontrar el usuario 
  const user = await UserModel.findById(payload.sub);
  if (!user) 
    { 
      const e:any = new Error('USER_NOT_FOUND'); 
      e.status=404; 
      throw e; 
    }
//sigue activo el refresh? no se ha hecho logout o expirado?
  const entry = (user.refreshTokens ?? []).find(rt => rt.token === refreshToken && rt.expiresAt > new Date());
  if (!entry) 
    { 
      const e:any = new Error('REFRESH_REVOKED_OR_EXPIRED'); 
      e.status = 401; 
      throw e; 
    }
//generar nuevos tokens
  const newPayload = { sub: user._id, role: user.role, emailVerified: user.emailVerified };
  const accessToken = jwt.sign(newPayload, process.env.JWT_SECRET!, { expiresIn: ACCESS_TTL });
  const newRefresh  = jwt.sign(newPayload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TTL });
  const newExp = addMinutes(new Date(), 7 * 24 * 60);

  // eliminar el token viejo 
  user.refreshTokens = (user.refreshTokens ?? []).filter(rt => rt.token !== refreshToken);
  user.refreshTokens.push({ token: newRefresh, expiresAt: newExp });
  await user.save();

  return { accessToken, refreshToken: newRefresh };
}

//logout
export async function logout(userId: string | undefined, refreshToken: string) {
  if (!userId) 
    { 
      const e:any=new Error('UNAUTHORIZED'); 
      e.status=401; 
      throw e; 
    }
  const u = await UserModel.findById(userId);
  if (!u) 
    { 
      const e:any=new Error('USER_NOT_FOUND'); 
      e.status=404; 
      throw e; 
    }
  // eliminar el refresh token
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

//perfil propio
export async function getMe(userId: string) {
  const u = await UserModel.findById(userId);
  if (!u) { const e:any=new Error('USER_NOT_FOUND'); e.status=404; throw e; }
  return toPublic(u);
}
// actualizar perfil

type UpdateMeInput = Partial<{
  name: string;
  phone: string;
  password: string;
}>;
export async function updateMe(
  userId: string,
  data: UpdateMeInput,
  
) {
    const update: Record<string, unknown> = {};
  if (typeof data.name === 'string') 
  {
    const name = data.name.trim();
    if (name.length > 0) update.name = name;
  }
  if (typeof data.phone === 'string') {
    const phone = data.phone.trim();
    if (phone.length > 0) update.phone = phone;
  }
  if (typeof data.password === 'string') {
    const password = data.password.trim();
    if (password.length > 0) {
      const passwordHash = await bcrypt.hash(password, ROUNDS);
      update.passwordHash = passwordHash;
    }
  }
  //
  if (Object.keys(update).length === 0) {
    const err: any = new Error('NO_FIELDS_TO_UPDATE');
    err.status = 400;
    throw err;
  }
    const u = await UserModel.findByIdAndUpdate(
    userId,
    { $set: update },
    {
      new: true,            
      runValidators: true,  
      context: 'query'     
    }
  );
    if (!u) {
    const err: any = new Error('USER_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  return toPublic(u);
}

/** Direcciones */
export async function getAddresses(userId: string) {
  if (!userId || typeof userId !== 'string') {
    const err: any = new Error('INVALID_USER_ID');
    err.status = 400;
    throw err;
  }
  const user = await UserModel.findById(userId)
    .select('addresses')
    .lean();

  if (!user) {
    const err: any = new Error('USER_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  return user.addresses;
}
// agregar dirección
export async function addAddress(
  userId: string,
  addr: { 
    id: string; 
    city: string; 
    postalCode: string; 
    address: string 
  }
) {
  if (!userId || typeof userId !== 'string') {
    const err: any = new Error('INVALID_USER_ID');
    err.status = 400;
    throw err;
  }
    if (!addr || typeof addr !== 'object') {
    const err: any = new Error('INVALID_ADDRESS_DATA');
    err.status = 400;
    throw err;
  }
  const user = await UserModel.findById(userId);
  if (!user) {
    const err: any = new Error('USER_NOT_FOUND');
    err.status = 404;
    throw err;
  }
  user.addresses = user.addresses || [];
  const exists = user.addresses.some(a => a.id === addr.id);
  if (exists) {
    const err: any = new Error('ADDRESS_ID_TAKEN');
    err.status = 409;
    throw err;
  }
  user.addresses.push(addr);
  await user.save();
  return user.addresses;
}
// actualizar dirección por id
type AddressUpdate = Partial<{
  city: string;
  postalCode: string;
  address: string;
}>;
export async function updateAddress(
  userId: string,
  addrId: string,
  data: AddressUpdate
) {
  if (!userId || typeof userId !== 'string') {
    const err: any = new Error('INVALID_USER_ID');
    err.status = 400;
    throw err;
  }
  if (!addrId || typeof addrId !== 'string') {
    const err: any = new Error('INVALID_ADDRESS_ID');
    err.status = 400;
    throw err;
  }
//limpiar y validar datos
  const toSet: Record<string, string> = {};
  if (typeof data.city === 'string' && data.city.trim().length > 0) {
    toSet['addresses.$[addr].city'] = data.city.trim();
  }
  if (typeof data.postalCode === 'string' && data.postalCode.trim().length > 0) {
    toSet['addresses.$[addr].postalCode'] = data.postalCode.trim();
  }
  if (typeof data.address === 'string' && data.address.trim().length > 0) {
    toSet['addresses.$[addr].address'] = data.address.trim();
  }

 //validar que no se este intentando actualizar con datos vacios
  if (Object.keys(toSet).length === 0) {
    const err: any = new Error('NO_FIELDS_TO_UPDATE');
    err.status = 400;
    throw err;
  }
  const updatedUser = await UserModel.findOneAndUpdate(
    { _id: userId, 'addresses.id': addrId },        
    { $set: toSet },                                 
    {
      new: true,                                     
      runValidators: true,                           
      context: 'query',
      arrayFilters: [{ 'addr.id': addrId }],         
      projection: { addresses: 1 }                   
    }
  ).lean();

  if (!updatedUser) {
// puede ser que no exista el usuario o la dirección
    const userExists = await UserModel.exists({ _id: userId });
    const err: any = new Error(userExists ? 'ADDRESS_NOT_FOUND' : 'USER_NOT_FOUND');
    err.status = 404;
    throw err;
  }

  const updatedAddr = (updatedUser.addresses || []).find((a: any) => a.id === addrId);
// por si las flys
  if (!updatedAddr) {
    const err: any = new Error('ADDRESS_NOT_FOUND');
    err.status = 404;
    throw err;
  }

  return updatedAddr;
}
// eliminar direccion
export async function removeAddress(userId: string, addrId: string) {
  const result = await UserModel.findOneAndUpdate(
    { _id: userId, 'addresses.id': addrId },
    { $pull: { addresses: { id: addrId } } },
    { new: true, projection: { addresses: 1 } }
  ).lean();

  if (!result) {
    const exists = await UserModel.exists({ _id: userId });
    const err: any = new Error(exists ? 'ADDRESS_NOT_FOUND' : 'USER_NOT_FOUND');
    err.status = 404;
    throw err;
  }

  return result.addresses ?? [];
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
