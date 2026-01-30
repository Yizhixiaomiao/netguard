export enum Vendor {
  CISCO = 'Cisco IOS',
  HUAWEI = 'Huawei VRP',
  JUNIPER = 'Juniper Junos',
  ARISTA = 'Arista EOS',
  HP = 'HP Comware'
}

export interface SwitchDevice {
  id: string;
  name: string;
  ip: string;
  vendor: Vendor;
  location: string;
  lastBackup?: string;
}

export interface ConfigBackup {
  id: string;
  switchId: string;
  timestamp: string;
  content: string;
  version?: string;
}

export interface AuditIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  description: string;
  lineContent?: string;
  remediation: string;
}

export interface AuditReport {
  id: string;
  backupId: string;
  timestamp: string;
  issues: AuditIssue[];
  summary: string;
  score: number;
}
