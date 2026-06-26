const { optimizeCargoAllocation } = require('../domain/CargoOptimizer');
const sessionStore = require('../store/sessionStore');
const logger = require('../utils/logger');

class AllocationService {
  /**
   * Save cargo + tank data for a later optimize run.
   */
  saveInput(cargos, tanks) {
    sessionStore.setInput(cargos, tanks);
    logger.info('Input saved', { cargoCount: cargos.length, tankCount: tanks.length });
    return { cargoCount: cargos.length, tankCount: tanks.length };
  }

  /**
   * Run the greedy allocator on whatever input is currently stored.
   */
  runOptimization() {
    const { cargos, tanks, hasInput } = sessionStore.getInput();

    if (!hasInput) {
      const err = new Error('No input data found. POST /input first.');
      err.statusCode = 400;
      throw err;
    }

    const start = Date.now();
    const result = optimizeCargoAllocation(cargos, tanks);
    const durationMs = Date.now() - start;

    sessionStore.setResult(result);

    logger.info('Optimization complete', {
      durationMs,
      totalLoaded: result.summary.totalLoaded,
      tanksUsed: result.summary.tanksUsed,
    });

    return { ...result, meta: { durationMs, optimizedAt: sessionStore.getResult().lastOptimizedAt } };
  }

  /**
   * Return the last optimization output (if any).
   */
  getResults() {
    const { result, lastOptimizedAt, hasResult } = sessionStore.getResult();

    if (!hasResult) {
      const err = new Error('No results yet. POST /optimize first.');
      err.statusCode = 404;
      throw err;
    }

    return { ...result, meta: { optimizedAt: lastOptimizedAt } };
  }

  loadSampleData() {
    sessionStore.loadSampleData();
    const { cargos, tanks } = sessionStore.getInput();
    logger.info('Sample data loaded');
    return { cargoCount: cargos.length, tankCount: tanks.length };
  }
}

module.exports = new AllocationService();
