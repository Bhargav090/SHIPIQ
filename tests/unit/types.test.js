const { validateInputPayload, ValidationError } = require('../../src/domain/types');

describe('validateInputPayload', () => {
  it('accepts valid payload', () => {
    const result = validateInputPayload({
      cargos: [{ id: 'C1', volume: 100 }],
      tanks: [{ id: 'T1', capacity: 200 }],
    });

    expect(result.cargos[0].id).toBe('C1');
    expect(result.tanks[0].capacity).toBe(200);
  });

  it('trims whitespace from ids', () => {
    const result = validateInputPayload({
      cargos: [{ id: '  C1  ', volume: 100 }],
      tanks: [{ id: ' T1 ', capacity: 200 }],
    });

    expect(result.cargos[0].id).toBe('C1');
    expect(result.tanks[0].id).toBe('T1');
  });

  it('throws ValidationError for negative volume', () => {
    expect(() =>
      validateInputPayload({
        cargos: [{ id: 'C1', volume: -5 }],
        tanks: [{ id: 'T1', capacity: 100 }],
      })
    ).toThrow(ValidationError);
  });
});
