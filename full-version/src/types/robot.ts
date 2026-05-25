/** Robot/workstation heartbeat monitoring domain types. */

export type RobotWorkstationStatus = 'HEALTHY' | 'STALE';

export interface RobotWorkstation {
  id: string;
  workstation_name: string;
  status: RobotWorkstationStatus;
  first_seen_at: string;
  last_seen_at: string;
  alerted_stale: boolean;
  alerted_at: string | null;
  last_recovered_at: string | null;
  created_at: string;
  updated_at: string;
}

export function getRobotStatusColor(status: RobotWorkstationStatus | string): string {
  if (status === 'STALE') return 'error';
  return 'success';
}
