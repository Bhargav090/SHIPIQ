/**
 * Domain types and validation helpers.
 * Keeping these separate so the optimizer stays pure and testable.
 */

/**
 * @typedef {Object} Cargo
 * @property {string} id   - e.g. "C1"
 * @property {number} volume - cubic volume, must be > 0
 */

/**
 * @typedef {Object} Tank
 * @property {string} id       - e.g. "T1"
 * @property {number} capacity - max cubic volume, must be > 0
 */

/**
 * @typedef {Object} Allocation
 * @property {string} tankId
 * @property {string} cargoId
 * @property {number} volume - amount loaded into this tank
 */

/**
 * @typedef {Object} OptimizationResult
 * @property {Allocation[]} allocations
 * @property {Object} summary
 * @property {Object[]} cargoBreakdown - per-cargo loaded vs remaining
 * @property {Object[]} tankBreakdown    - per-tank fill status
 */

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

/**
 * Validate a single cargo entry from the API payload.
 */
function validateCargo(item, index) {
  const errors = [];
  const prefix = `cargos[${index}]`;

  if (!item || typeof item !== 'object') {
    return [`${prefix}: must be an object`];
  }
  if (!item.id || typeof item.id !== 'string' || !item.id.trim()) {
    errors.push(`${prefix}.id: required non-empty string`);
  }
  if (typeof item.volume !== 'number' || !Number.isFinite(item.volume) || item.volume <= 0) {
    errors.push(`${prefix}.volume: must be a positive number`);
  }

  return errors;
}

/**
 * Validate a single tank entry from the API payload.
 */
function validateTank(item, index) {
  const errors = [];
  const prefix = `tanks[${index}]`;

  if (!item || typeof item !== 'object') {
    return [`${prefix}: must be an object`];
  }
  if (!item.id || typeof item.id !== 'string' || !item.id.trim()) {
    errors.push(`${prefix}.id: required non-empty string`);
  }
  if (typeof item.capacity !== 'number' || !Number.isFinite(item.capacity) || item.capacity <= 0) {
    errors.push(`${prefix}.capacity: must be a positive number`);
  }

  return errors;
}

/**
 * Validate full input payload for POST /input.
 */
function validateInputPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  if (!Array.isArray(payload.cargos) || payload.cargos.length === 0) {
    errors.push('cargos: must be a non-empty array');
  } else {
    payload.cargos.forEach((c, i) => errors.push(...validateCargo(c, i)));
  }

  if (!Array.isArray(payload.tanks) || payload.tanks.length === 0) {
    errors.push('tanks: must be a non-empty array');
  } else {
    payload.tanks.forEach((t, i) => errors.push(...validateTank(t, i)));
  }

  // Catch duplicate IDs early — avoids confusing allocation output
  if (errors.length === 0) {
    const cargoIds = payload.cargos.map((c) => c.id);
    const tankIds = payload.tanks.map((t) => t.id);

    const dupCargo = findDuplicates(cargoIds);
    const dupTank = findDuplicates(tankIds);

    if (dupCargo.length) errors.push(`duplicate cargo ids: ${dupCargo.join(', ')}`);
    if (dupTank.length) errors.push(`duplicate tank ids: ${dupTank.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid input data', errors);
  }

  return {
    cargos: payload.cargos.map((c) => ({ id: c.id.trim(), volume: c.volume })),
    tanks: payload.tanks.map((t) => ({ id: t.id.trim(), capacity: t.capacity })),
  };
}

function findDuplicates(ids) {
  const seen = new Set();
  const dups = new Set();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups];
}

/**
 * Sample data from the SHIPIQ assignment brief.
 * Note: the brief lists tanks with the same table as cargos (likely a typo).
 * Here tanks mirror those capacities as T1–T10 for demo purposes.
 */
const SAMPLE_CARGOS = [
  { id: 'C1', volume: 1234 },
  { id: 'C2', volume: 4352 },
  { id: 'C3', volume: 3321 },
  { id: 'C4', volume: 2456 },
  { id: 'C5', volume: 5123 },
  { id: 'C6', volume: 1879 },
  { id: 'C7', volume: 4987 },
  { id: 'C8', volume: 2050 },
  { id: 'C9', volume: 3678 },
  { id: 'C10', volume: 5432 },
];

const SAMPLE_TANKS = [
  { id: 'T1', capacity: 4000 },
  { id: 'T2', capacity: 3500 },
  { id: 'T3', capacity: 5000 },
  { id: 'T4', capacity: 2800 },
  { id: 'T5', capacity: 6000 },
  { id: 'T6', capacity: 2200 },
  { id: 'T7', capacity: 4500 },
  { id: 'T8', capacity: 3000 },
  { id: 'T9', capacity: 3800 },
  { id: 'T10', capacity: 5500 },
];

module.exports = {
  ValidationError,
  validateInputPayload,
  SAMPLE_CARGOS,
  SAMPLE_TANKS,
};
