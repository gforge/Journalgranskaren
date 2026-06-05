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

export async function addAuditLog(log: Omit<AuditLog, 'id'>): Promise<number> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(log);

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
      Details: l.details || ''
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
