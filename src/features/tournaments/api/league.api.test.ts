import { describe, it, expect } from 'vitest';

import { resetLeagueMetricsInMetadata } from './league.api';

describe('resetLeagueMetricsInMetadata', () => {
  it('should reset metrics without affecting other metadata keys', () => {
    const originalMetadata = {
      someOtherKey: 'value',
      league: {
        metrics: {
          goals: 5,
          assists: 3,
        },
        otherLeagueData: 'preserved',
      },
      anotherTopLevelKey: 123,
    };

    const result = resetLeagueMetricsInMetadata(originalMetadata);

    // Check metrics is reset to empty object
    expect(result.league).toEqual({
      otherLeagueData: 'preserved',
      metrics: {},
    });

    // Check other top-level keys are preserved
    expect(result.someOtherKey).toBe('value');
    expect(result.anotherTopLevelKey).toBe(123);
  });

  it('should handle null metadata', () => {
    const result = resetLeagueMetricsInMetadata(null);

    expect(result).toEqual({
      league: {
        metrics: {},
      },
    });
  });

  it('should handle undefined metadata', () => {
    const result = resetLeagueMetricsInMetadata(undefined);

    expect(result).toEqual({
      league: {
        metrics: {},
      },
    });
  });

  it('should handle metadata without league key', () => {
    const originalMetadata = {
      someKey: 'value',
    };

    const result = resetLeagueMetricsInMetadata(originalMetadata);

    expect(result).toEqual({
      someKey: 'value',
      league: {
        metrics: {},
      },
    });
  });

  it('should handle metadata with league but no metrics', () => {
    const originalMetadata = {
      league: {
        otherData: 'preserved',
      },
    };

    const result = resetLeagueMetricsInMetadata(originalMetadata);

    expect(result).toEqual({
      league: {
        otherData: 'preserved',
        metrics: {},
      },
    });
  });

  it('should not mutate the original metadata', () => {
    const originalMetadata = {
      league: {
        metrics: { goals: 5 },
      },
    };

    const originalCopy = JSON.parse(JSON.stringify(originalMetadata));
    resetLeagueMetricsInMetadata(originalMetadata);

    // Original should not be modified
    expect(originalMetadata).toEqual(originalCopy);
  });
});
