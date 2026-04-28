export interface WritebackStatusPresentation {
  label: string;
  color: string;
}

const STATUS_PRESENTATION: Record<string, WritebackStatusPresentation> = {
  PENDING: { label: 'Pending', color: 'warning' },
  POLLING: { label: 'Polling', color: 'primary' },
  EXTRACTING: { label: 'Extracting', color: 'primary' },
  EXECUTING: { label: 'Executing', color: 'primary' },
  EXTRACTED: { label: 'Extracted', color: 'info' },
  EXECUTED: { label: 'Executed', color: 'info' },
  PARTIAL: { label: 'Partial', color: 'orange' },
  RETRY_DEFERRED: { label: 'Retry deferred', color: 'warning' },
  BLOCKED_ECONNECTOR: { label: 'Blocked: eConnector', color: 'error' },
  SHEETS_RETRYING: { label: 'Retrying Sheets', color: 'deep-orange' },
  SYNCING: { label: 'Syncing', color: 'primary' },
  SYNCED: { label: 'Synced', color: 'success' },
  DONE: { label: 'Done', color: 'success' },
  FAILED: { label: 'Failed', color: 'error' },
  EXTRACT_FAILED: { label: 'Extract Failed', color: 'error' },
  SYNC_FAILED: { label: 'Sync Failed', color: 'error' },
  SUCCESS: { label: 'Success', color: 'success' },
  SKIPPED: { label: 'Skipped', color: 'grey' },
  RECORDED: { label: 'Recorded', color: 'info' },
  REVERSED: { label: 'Reversed', color: 'warning' },
};

export function getWritebackStatusPresentation(status: string): WritebackStatusPresentation {
  return STATUS_PRESENTATION[status] ?? { label: status || 'Unknown', color: 'grey' };
}
