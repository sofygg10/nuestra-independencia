/**
 * Cifrado de los datos con la contraseña (Web Crypto: PBKDF2 → AES-GCM 256).
 * El repositorio es público, así que lo que se guarda o se sube siempre va cifrado.
 */

const ITERATIONS = 310_000
const APP = 'nuestra-independencia'

export interface Sealed {
  app: typeof APP
  v: 1
  /** Fecha de guardado (no es secreta): sirve para elegir la copia más nueva */
  savedAt: string
  salt: string
  iv: string
  data: string
}

export interface Session {
  key: CryptoKey
  salt: Uint8Array
}

const toB64 = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

export function isSealed(x: unknown): x is Sealed {
  const s = x as Sealed
  return !!s && s.app === APP && s.v === 1 && typeof s.data === 'string' && typeof s.salt === 'string'
}

export async function deriveSession(password: string, salt = crypto.getRandomValues(new Uint8Array(16))): Promise<Session> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return { key, salt }
}

export async function seal(value: unknown, session: Session): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(value))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, session.key, plain))
  return { app: APP, v: 1, savedAt: new Date().toISOString(), salt: toB64(session.salt), iv: toB64(iv), data: toB64(cipher) }
}

/** Descifra con la contraseña. Lanza error si la contraseña no es correcta. */
export async function unseal<T>(sealed: Sealed, password: string): Promise<{ value: T; session: Session }> {
  const session = await deriveSession(password, fromB64(sealed.salt))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) as BufferSource }, session.key, fromB64(sealed.data) as BufferSource)
  return { value: JSON.parse(new TextDecoder().decode(plain)) as T, session }
}
