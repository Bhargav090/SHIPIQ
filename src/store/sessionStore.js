/**
 * In-memory session store.
 * Fine for a single-instance deployment and interview scope.
 * Swap this for Redis/DB if you need multi-instance or persistence later.
 */

const { SAMPLE_CARGOS, SAMPLE_TANKS } = require('../domain/types');

const state = {
  cargos: null,
  tanks: null,
  result: null,
  lastOptimizedAt: null,
};

function setInput(cargos, tanks) {
  state.cargos = cargos;
  state.tanks = tanks;
  // Clear stale results whenever input changes
  state.result = null;
  state.lastOptimizedAt = null;
}

function getInput() {
  return {
    cargos: state.cargos,
    tanks: state.tanks,
    hasInput: state.cargos !== null && state.tanks !== null,
  };
}

function setResult(result) {
  state.result = result;
  state.lastOptimizedAt = new Date().toISOString();
}

function getResult() {
  return {
    result: state.result,
    lastOptimizedAt: state.lastOptimizedAt,
    hasResult: state.result !== null,
  };
}

function loadSampleData() {
  setInput(
    SAMPLE_CARGOS.map((c) => ({ ...c })),
    SAMPLE_TANKS.map((t) => ({ ...t }))
  );
}

function reset() {
  state.cargos = null;
  state.tanks = null;
  state.result = null;
  state.lastOptimizedAt = null;
}

module.exports = {
  setInput,
  getInput,
  setResult,
  getResult,
  loadSampleData,
  reset,
};
