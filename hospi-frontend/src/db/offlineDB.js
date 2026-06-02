/**
 * Couche IndexedDB pour le mode offline
 * Couvre tous les modules : reception, admin, labo, finance, pharmacie, doctor, patient
 */
import Dexie from 'dexie';

class OfflineDatabase extends Dexie {
  constructor() {
    super('InuaAfyaOfflineDB');
    this.version(1).stores({
      // ─── PATIENTS / RECEPTION ───
      patients: '++id, firstName, lastName, phone, email, matricule, gender, syncStatus, updatedAt',
      admissions: '++id, patientId, status, admissionDate, bedId, syncStatus, updatedAt',
      appointments: '++id, patientId, doctorId, appointmentDate, status, syncStatus, updatedAt',

      // ─── DOCTOR / CONSULTATIONS ───
      consultations: '++id, patientId, doctorId, status, consultationDate, reasonForVisit, diagnosis, syncStatus, updatedAt',
      prescriptions: '++id, consultationId, patientId, status, syncStatus, updatedAt',
      prescriptionItems: '++id, prescriptionId, medicineName, dosage, syncStatus, updatedAt',
      examRequests: '++id, consultationId, patientId, examType, status, syncStatus, updatedAt',
      vitalSigns: '++id, consultationId, patientId, tensionArterielle, poids, temperature, taille, syncStatus, updatedAt',

      // ─── LABO ───
      labExams: '++id, patientId, consultationId, examType, status, resultDate, syncStatus, updatedAt',
      labResults: '++id, examId, patientId, parameter, value, unit, syncStatus, updatedAt',

      // ─── PHARMACIE ───
      medicines: '++id, name, category, stockQuantity, unitPrice, syncStatus, updatedAt',
      pharmacySales: '++id, patientId, prescriptionId, saleDate, totalAmount, syncStatus, updatedAt',
      pharmacySaleItems: '++id, saleId, medicineId, quantity, unitPrice, syncStatus, updatedAt',
      inventoryMovements: '++id, medicineId, type, quantity, movementDate, syncStatus, updatedAt',

      // ─── FINANCE ───
      invoices: '++id, patientId, consultationId, amount, status, invoiceDate, syncStatus, updatedAt',
      payments: '++id, invoiceId, patientId, amount, paymentMethod, paymentDate, syncStatus, updatedAt',
      expenses: '++id, category, amount, description, expenseDate, syncStatus, updatedAt',
      revenues: '++id, source, amount, description, revenueDate, syncStatus, updatedAt',
      tarifs: '++id, name, category, price, department, syncStatus, updatedAt',
      companyConsumptions: '++id, companyId, month, totalAmount, syncStatus, updatedAt',

      // ─── ADMIN ───
      users: '++id, username, email, role, active, syncStatus, updatedAt',
      services: '++id, name, department, active, syncStatus, updatedAt',
      hospitalConfig: '++id, key, value, syncStatus, updatedAt',

      // ─── QUEUE DE SYNC ───
      syncQueue: '++id, tableName, recordId, action, payload, createdAt, retryCount',
    });
  }
}

export const offlineDB = new OfflineDatabase();

/**
 * Helpers généraux pour la gestion offline
 */
export const offlineHelpers = {
  /**
   * Marquer un enregistrement comme "à synchroniser"
   */
  async markForSync(tableName, recordId, action = 'update') {
    await offlineDB.syncQueue.add({
      tableName,
      recordId,
      action,
      payload: { id: recordId },
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
  },

  /**
   * Ajouter une opération de création dans la file d'attente
   */
  async queueCreate(tableName, payload) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await offlineDB.syncQueue.add({
      tableName,
      recordId: tempId,
      action: 'create',
      payload: { ...payload, tempId },
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
    return tempId;
  },

  /**
   * Supprimer une entrée de la file d'attente après sync réussie
   */
  async dequeueSync(syncId) {
    await offlineDB.syncQueue.delete(syncId);
  },

  /**
   * Récupérer toutes les opérations en attente
   */
  async getPendingSyncs() {
    return await offlineDB.syncQueue.toArray();
  },

  /**
   * Vider complètement une table (utile pour refresh depuis le serveur)
   */
  async clearTable(tableName) {
    if (offlineDB.tables.some(t => t.name === tableName)) {
      await offlineDB.table(tableName).clear();
    }
  },

  /**
   * Remplacer le contenu d'une table avec des données fraîches du serveur
   */
  async replaceTableData(tableName, data) {
    await offlineDB.table(tableName).clear();
    const withMeta = data.map(item => ({
      ...item,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    }));
    await offlineDB.table(tableName).bulkAdd(withMeta);
  },

  /**
   * Sauvegarder une entrée localement (création ou mise à jour)
   */
  async saveLocal(tableName, data) {
    const table = offlineDB.table(tableName);
    const record = {
      ...data,
      syncStatus: data.id ? 'updated' : 'created',
      updatedAt: new Date().toISOString(),
    };
    if (data.id) {
      const existing = await table.get(data.id);
      if (existing) {
        await table.update(data.id, record);
      } else {
        await table.add(record);
      }
    } else {
      return await table.add(record);
    }
    return record;
  },

  /**
   * Récupérer les données locales d'une table
   */
  async getLocal(tableName, filters = {}) {
    let collection = offlineDB.table(tableName).toCollection();
    // Appliquer des filtres simples si fournis
    for (const [key, value] of Object.entries(filters)) {
      collection = collection.filter(item => item[key] === value);
    }
    return await collection.toArray();
  },

  /**
   * Vérifier si l'application est en ligne
   */
  isOnline() {
    return navigator.onLine;
  },

  /**
   * Vider toutes les données offline (reset)
   */
  async resetAll() {
    await offlineDB.delete();
    window.location.reload();
  },
};

export default offlineDB;
