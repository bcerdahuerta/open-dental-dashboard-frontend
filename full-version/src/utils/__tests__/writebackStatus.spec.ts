import { describe, expect, it } from 'vitest';

import { getWritebackStatusPresentation } from '@/utils/writebackStatus';

describe('writeback status presentation', () => {
  it('maps new transient statuses to friendly labels', () => {
    expect(getWritebackStatusPresentation('RETRY_DEFERRED')).toEqual({
      label: 'Retry deferred',
      color: 'warning',
    });
    expect(getWritebackStatusPresentation('BLOCKED_ECONNECTOR')).toEqual({
      label: 'Blocked: eConnector',
      color: 'error',
    });
    expect(getWritebackStatusPresentation('SHEETS_RETRYING')).toEqual({
      label: 'Retrying Sheets',
      color: 'deep-orange',
    });
  });

  it('falls back safely for unknown statuses', () => {
    expect(getWritebackStatusPresentation('FUTURE_STATUS')).toEqual({
      label: 'FUTURE_STATUS',
      color: 'grey',
    });
  });
});
