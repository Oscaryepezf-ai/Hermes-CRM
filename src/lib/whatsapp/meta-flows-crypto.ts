// Cifrado/descifrado para el Flow Endpoint de Meta WhatsApp Flows.
// Meta cifra el payload con AES-GCM. La clave AES viene cifrada con RSA-OAEP.
// Ref: https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourflowendpoint

import {
  createPrivateKey,
  privateDecrypt,
  constants,
  createDecipheriv,
  createCipheriv,
} from "crypto"

interface EncryptedFlowRequest {
  encrypted_aes_key: string
  encrypted_flow_data: string
  initial_vector: string
}

interface DecryptedFlowRequest {
  data:   any
  aesKey: Buffer
  iv:     Buffer
}

/**
 * Descifra el payload que Meta envía al flow endpoint.
 * 1. Descifra la clave AES con la clave privada RSA (OAEP / SHA-256)
 * 2. Descifra el body con AES-GCM usando esa clave y el IV
 */
export function decryptFlowRequest(
  body:          EncryptedFlowRequest,
  privateKeyPem: string,
): DecryptedFlowRequest {
  const privateKey = createPrivateKey(privateKeyPem)

  // 1. Descifrar clave AES
  const aesKey = privateDecrypt(
    {
      key:      privateKey,
      padding:  constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(body.encrypted_aes_key, "base64"),
  )

  // 2. Descifrar datos con AES-GCM (128 o 256 según longitud de clave)
  const iv        = Buffer.from(body.initial_vector, "base64")
  const encrypted = Buffer.from(body.encrypted_flow_data, "base64")

  const TAG_LENGTH  = 16
  const ciphertext  = encrypted.subarray(0, -TAG_LENGTH)
  const authTag     = encrypted.subarray(-TAG_LENGTH)

  const algorithm = aesKey.length === 32 ? "aes-256-gcm" : "aes-128-gcm"
  const decipher  = createDecipheriv(algorithm, aesKey, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return {
    data:   JSON.parse(decrypted.toString("utf8")),
    aesKey,
    iv,
  }
}

/**
 * Cifra la respuesta que devuelve el flow endpoint a Meta.
 * Usa el mismo AES key pero con el IV "volteado" bit a bit.
 */
export function encryptFlowResponse(
  response: object,
  aesKey:   Buffer,
  iv:       Buffer,
): string {
  const flippedIv = Buffer.from(iv.map(b => (~b) & 0xff))

  const algorithm = aesKey.length === 32 ? "aes-256-gcm" : "aes-128-gcm"
  const cipher    = createCipheriv(algorithm, aesKey, flippedIv)

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf8"),
    cipher.final(),
  ])

  return Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64")
}
