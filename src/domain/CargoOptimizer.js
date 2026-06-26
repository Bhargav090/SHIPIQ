/**
 * Core allocation logic — greedy algorithm with capacity-aware sorting.
 *
 * Problem rules (short version):
 *   - A cargo CAN be split across multiple tanks.
 *   - Each tank holds cargo from exactly ONE cargo id (no mixing).
 *   - Goal: load as much total cargo volume as possible.
 *
 * Strategy:
 *   1. Sort cargos largest-first  → prioritise big items while tanks are free.
 *   2. Sort tanks largest-first   → fill big tanks first to reduce fragmentation.
 *   3. Walk cargos in order, assign each to the next available tank until
 *      the cargo is fully loaded or we run out of tanks.
 *
 * Why greedy?
 *   Exact optimality would need heavier machinery (ILP / DP). For real-time
 *   API use and large datasets, greedy + sorting is fast O(C log C + T log T + allocations)
 *   and gives solid results. Trade-off is documented in README.
 */

/**
 * @param {import('./types').Cargo[]} cargos
 * @param {import('./types').Tank[]} tanks
 * @returns {import('./types').OptimizationResult}
 */
function optimizeCargoAllocation(cargos, tanks) {
  // Work on copies — don't mutate caller data
  const sortedCargos = [...cargos].sort((a, b) => b.volume - a.volume);
  const sortedTanks = [...tanks].sort((a, b) => b.capacity - a.capacity);

  const allocations = [];
  let tankPointer = 0;

  // Track how much of each cargo is still unloaded
  const remainingByCargo = new Map(sortedCargos.map((c) => [c.id, c.volume]));

  for (const cargo of sortedCargos) {
    let remaining = remainingByCargo.get(cargo.id);

    // Keep grabbing tanks until this cargo is done or tanks run out
    while (remaining > 0 && tankPointer < sortedTanks.length) {
      const tank = sortedTanks[tankPointer];
      const loadAmount = Math.min(remaining, tank.capacity);

      allocations.push({
        tankId: tank.id,
        cargoId: cargo.id,
        volume: loadAmount,
      });

      remaining -= loadAmount;
      remainingByCargo.set(cargo.id, remaining);
      tankPointer += 1;
    }
  }

  return buildResult(cargos, tanks, allocations, remainingByCargo);
}

/**
 * Put together the full response with summary stats and breakdowns.
 */
function buildResult(cargos, tanks, allocations, remainingByCargo) {
  const totalCargoAvailable = sum(cargos, 'volume');
  const totalTankCapacity = sum(tanks, 'capacity');
  const totalLoaded = sum(allocations, 'volume');

  const cargoBreakdown = cargos.map((cargo) => {
    const remaining = remainingByCargo.get(cargo.id) ?? cargo.volume;
    const loaded = cargo.volume - remaining;
    return {
      cargoId: cargo.id,
      totalVolume: cargo.volume,
      loadedVolume: loaded,
      remainingVolume: remaining,
      fullyLoaded: remaining === 0,
    };
  });

  // Build a quick lookup: tankId -> allocation
  const allocationByTank = new Map(allocations.map((a) => [a.tankId, a]));

  const tankBreakdown = tanks.map((tank) => {
    const alloc = allocationByTank.get(tank.id);
    const loadedVolume = alloc ? alloc.volume : 0;
    return {
      tankId: tank.id,
      capacity: tank.capacity,
      cargoId: alloc ? alloc.cargoId : null,
      loadedVolume,
      emptyVolume: tank.capacity - loadedVolume,
      utilizationPercent: round2((loadedVolume / tank.capacity) * 100),
    };
  });

  const limitingFactor =
    totalCargoAvailable <= totalTankCapacity ? 'cargo' : 'tank_capacity';

  return {
    allocations,
    summary: {
      totalLoaded,
      totalCargoAvailable,
      totalTankCapacity,
      unloadedVolume: totalCargoAvailable - totalLoaded,
      tankUnusedCapacity: totalTankCapacity - totalLoaded,
      cargoUtilizationPercent: round2((totalLoaded / totalCargoAvailable) * 100),
      tankUtilizationPercent: round2((totalLoaded / totalTankCapacity) * 100),
      tanksUsed: allocations.length,
      tanksAvailable: tanks.length,
      limitingFactor,
    },
    cargoBreakdown,
    tankBreakdown,
  };
}

function sum(items, field) {
  return items.reduce((acc, item) => acc + item[field], 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { optimizeCargoAllocation };
