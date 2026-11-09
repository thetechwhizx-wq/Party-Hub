/**
 * validators.js — Message and action validators
 * Party Hub shared module
 */

/** Max message size in bytes */
const MAX_MSG_BYTES = 100 * 1024;

/**
 * Validate a message envelope shape.
 * @param {*} msg
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateMessageShape(msg) {
  if (!msg || typeof msg !== 'object') {
    return { valid: false, reason: 'Message is not an object' };
  }
  if (!msg.type || typeof msg.type !== 'string') {
    return { valid: false, reason: 'Missing or invalid type' };
  }
  if (!msg.roomId || typeof msg.roomId !== 'string') {
    return { valid: false, reason: 'Missing or invalid roomId' };
  }
  if (!msg.playerId || typeof msg.playerId !== 'string') {
    return { valid: false, reason: 'Missing or invalid playerId' };
  }
  return { valid: true };
}

/**
 * Check message byte size.
 * @param {object} msg
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateMessageSize(msg) {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(msg)).length;
    if (bytes > MAX_MSG_BYTES) {
      return { valid: false, reason: `Message too large: ${bytes} bytes (max ${MAX_MSG_BYTES})` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Message could not be serialized' };
  }
}

/**
 * Combined validation.
 * @param {*} msg
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateMessage(msg) {
  const shapeResult = validateMessageShape(msg);
  if (!shapeResult.valid) return shapeResult;
  return validateMessageSize(msg);
}

/**
 * Validate a room code (6-char uppercase alphanumeric).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidRoomCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code.trim());
}

/**
 * Validate a display name.
 * @param {string} name
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateDisplayName(name) {
  if (typeof name !== 'string') return { valid: false, reason: 'Name must be a string' };
  const trimmed = name.trim();
  if (trimmed.length < 1) return { valid: false, reason: 'Name cannot be empty' };
  if (trimmed.length > 24) return { valid: false, reason: 'Name must be 24 characters or less' };
  return { valid: true };
}
