const { optimizeCargoAllocation } = require('../../src/domain/CargoOptimizer');

describe('CargoOptimizer', () => {
  describe('basic allocation', () => {
    it('loads a single cargo into a single tank when it fits', () => {
      const result = optimizeCargoAllocation(
        [{ id: 'C1', volume: 100 }],
        [{ id: 'T1', capacity: 200 }]
      );

      expect(result.allocations).toEqual([
        { tankId: 'T1', cargoId: 'C1', volume: 100 },
      ]);
      expect(result.summary.totalLoaded).toBe(100);
      expect(result.summary.unloadedVolume).toBe(0);
    });

    it('splits one cargo across multiple tanks', () => {
      const result = optimizeCargoAllocation(
        [{ id: 'C1', volume: 500 }],
        [
          { id: 'T1', capacity: 200 },
          { id: 'T2', capacity: 200 },
          { id: 'T3', capacity: 200 },
        ]
      );

      expect(result.allocations).toHaveLength(3);
      expect(result.summary.totalLoaded).toBe(500);
      expect(result.allocations.every((a) => a.cargoId === 'C1')).toBe(true);
    });

    it('never mixes two cargo ids in the same tank', () => {
      const result = optimizeCargoAllocation(
        [
          { id: 'C1', volume: 300 },
          { id: 'C2', volume: 300 },
        ],
        [{ id: 'T1', capacity: 500 }]
      );

      // Only one tank — largest cargo (equal here, stable sort) gets it
      expect(result.allocations).toHaveLength(1);
      const tankIds = new Set(result.allocations.map((a) => a.tankId));
      expect(tankIds.size).toBe(result.allocations.length);
    });
  });

  describe('greedy sorting behaviour', () => {
    it('prioritises larger cargos when tank space is limited', () => {
      const result = optimizeCargoAllocation(
        [
          { id: 'C_small', volume: 100 },
          { id: 'C_big', volume: 400 },
        ],
        [{ id: 'T1', capacity: 300 }]
      );

      expect(result.allocations[0].cargoId).toBe('C_big');
      expect(result.allocations[0].volume).toBe(300);
      expect(result.summary.totalLoaded).toBe(300);
    });

    it('uses largest tanks first for a split cargo', () => {
      const result = optimizeCargoAllocation(
        [{ id: 'C1', volume: 700 }],
        [
          { id: 'T_small', capacity: 200 },
          { id: 'T_big', capacity: 500 },
        ]
      );

      expect(result.allocations[0]).toEqual({
        tankId: 'T_big',
        cargoId: 'C1',
        volume: 500,
      });
      expect(result.allocations[1]).toEqual({
        tankId: 'T_small',
        cargoId: 'C1',
        volume: 200,
      });
    });
  });

  describe('edge cases', () => {
    it('returns empty allocations when there are no tanks', () => {
      expect(() =>
        optimizeCargoAllocation([{ id: 'C1', volume: 100 }], [])
      ).not.toThrow();
    });

    it('handles cargo larger than total tank capacity', () => {
      const result = optimizeCargoAllocation(
        [{ id: 'C1', volume: 10_000 }],
        [
          { id: 'T1', capacity: 100 },
          { id: 'T2', capacity: 100 },
        ]
      );

      expect(result.summary.totalLoaded).toBe(200);
      expect(result.summary.unloadedVolume).toBe(9800);
      expect(result.summary.limitingFactor).toBe('tank_capacity');
    });

    it('handles more tank capacity than cargo (leftover empty space)', () => {
      const result = optimizeCargoAllocation(
        [{ id: 'C1', volume: 50 }],
        [
          { id: 'T1', capacity: 500 },
          { id: 'T2', capacity: 500 },
        ]
      );

      expect(result.summary.totalLoaded).toBe(50);
      expect(result.summary.tanksUsed).toBe(1);
      expect(result.summary.limitingFactor).toBe('cargo');
    });

    it('only loads one cargo type per tank even if space remains', () => {
      // 20 different cargos, 1 tank — tank can hold 500 but only ONE cargo id
      const cargos = Array.from({ length: 20 }, (_, i) => ({
        id: `C${i}`,
        volume: 100,
      }));
      const tanks = [{ id: 'T1', capacity: 500 }];

      const result = optimizeCargoAllocation(cargos, tanks);
      expect(result.summary.totalLoaded).toBe(100);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].volume).toBe(100);
    });

    it('does not mutate input arrays', () => {
      const cargos = [{ id: 'C1', volume: 100 }];
      const tanks = [{ id: 'T1', capacity: 200 }];
      const cargosCopy = JSON.stringify(cargos);
      const tanksCopy = JSON.stringify(tanks);

      optimizeCargoAllocation(cargos, tanks);

      expect(JSON.stringify(cargos)).toBe(cargosCopy);
      expect(JSON.stringify(tanks)).toBe(tanksCopy);
    });
  });

  describe('assignment sample data', () => {
    const { SAMPLE_CARGOS, SAMPLE_TANKS } = require('../../src/domain/types');

    it('produces a valid allocation for the brief sample cargos', () => {
      const result = optimizeCargoAllocation(SAMPLE_CARGOS, SAMPLE_TANKS);

      expect(result.allocations.length).toBeGreaterThan(0);
      expect(result.summary.totalLoaded).toBeLessThanOrEqual(
        result.summary.totalCargoAvailable
      );
      expect(result.summary.totalLoaded).toBeLessThanOrEqual(
        result.summary.totalTankCapacity
      );

      // Each tank appears at most once
      const tankIds = result.allocations.map((a) => a.tankId);
      expect(new Set(tankIds).size).toBe(tankIds.length);
    });
  });

  describe('large dataset performance', () => {
    it('optimizes 10k cargos and 10k tanks within reasonable time', () => {
      const cargos = Array.from({ length: 10_000 }, (_, i) => ({
        id: `C${i}`,
        volume: 100 + (i % 500),
      }));
      const tanks = Array.from({ length: 10_000 }, (_, i) => ({
        id: `T${i}`,
        capacity: 150 + (i % 400),
      }));

      const start = Date.now();
      const result = optimizeCargoAllocation(cargos, tanks);
      const durationMs = Date.now() - start;

      expect(result.summary.totalLoaded).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(5000); // should be well under 5s
    });
  });
});
