import { AuditLog } from 'src/types/chart';
import Papa from 'papaparse';

const DB_NAME = 'ki_audit_db';
const DB_VERSION = 1;
const STORE_NAME = 'logs';

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open audit log database.'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function computeSHA256(message: string): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function addAuditLog(log: Omit<AuditLog, 'id'>): Promise<number> {
  try {
    const db = await initDB();
    
    // Find the last log entry to get the previous hash
    const lastLog = await new Promise<AuditLog | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor(null, 'prev'); // Get newest
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        resolve(cursor ? (cursor.value as AuditLog) : null);
      };
      request.onerror = () => {
        reject(new Error('Failed to query last log entry.'));
      };
    });

    const prevHash = lastLog ? (lastLog.hash || '0') : '0';
    const fieldsToHash = [
      prevHash,
      log.timestamp,
      log.reviewerName,
      log.action,
      log.patientId || '',
      log.details || ''
    ].join('|');
    
    const hash = await computeSHA256(fieldsToHash);
    
    const logWithChain: AuditLog = {
      ...log,
      prevHash,
      hash
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(logWithChain);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(new Error('Failed to write audit log to database.'));
      };
    });
  } catch (error) {
    console.error(error);
    return -1;
  }
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort logs descending by timestamp
        const logs = request.result as AuditLog[];
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(logs);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve audit logs.'));
      };
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function verifyAuditLogChain(): Promise<{ isValid: boolean; errorMsg?: string }> {
  try {
    const db = await initDB();
    const logs = await new Promise<AuditLog[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result as AuditLog[]);
      };
      request.onerror = () => {
        reject(new Error('Failed to retrieve audit logs.'));
      };
    });

    // Sort logs by ID ascending to verify sequentially
    logs.sort((a, b) => (a.id || 0) - (b.id || 0));

    let expectedPrevHash: string | null = null;
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (!log.hash || !log.prevHash) {
        // Skip legacy log entries without hash
        continue;
      }
      
      if (expectedPrevHash !== null && log.prevHash !== expectedPrevHash) {
        return {
          isValid: false,
          errorMsg: `Loggkedjan är bruten: förväntade prevHash "${expectedPrevHash}", men fann "${log.prevHash}" på rad ID ${log.id}.`
        };
      }

      const fieldsToHash = [
        log.prevHash,
        log.timestamp,
        log.reviewerName,
        log.action,
        log.patientId || '',
        log.details || ''
      ].join('|');
      
      const computedHash = await computeSHA256(fieldsToHash);
      if (log.hash !== computedHash) {
        return {
          isValid: false,
          errorMsg: `Integritetsfel: hash "${log.hash}" matchar inte beräknad hash "${computedHash}" på rad ID ${log.id}.`
        };
      }
      
      expectedPrevHash = log.hash;
    }

    return { isValid: true };
  } catch (error) {
    console.error('Failed to verify audit logs:', error);
    return { isValid: false, errorMsg: String(error) };
  }
}

export async function downloadAuditLogsCSV(): Promise<void> {
  try {
    const logs = await getAllAuditLogs();
    
    // Flat log list for CSV export
    const csvData = logs.map(l => ({
      ID: l.id,
      Timestamp: l.timestamp,
      Reviewer: l.reviewerName,
      Action: l.action,
      PatientID: l.patientId || 'N/A',
      Details: l.details || '',
      Hash: l.hash || '',
      PrevHash: l.prevHash || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateStr = new Date().toISOString().substring(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `ki_journalgranskaren_audit_logs_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export audit logs:', error);
    alert('Failed to export audit logs.');
  }
}
