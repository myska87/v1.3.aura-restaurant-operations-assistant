/**
 * 🔗 METADATA CONNECTOR
 * Handles all cross-module data linking via metadata (NO direct database joins)
 * All modules communicate through ID references and metadata mapping only
 */

import { base44 } from '@/api/base44Client';

export class MetadataConnector {
  /**
   * Define metadata mappings between modules
   * Each mapping shows how data flows between source and target
   */
  static METADATA_MAPPINGS = {
    // Tasks → LeafeCore Checklist
    'tasks_to_leafe_checklist': {
      source: 'tasks',
      target: 'leafe_checklist_entry',
      mapping: {
        task_id: 'related_task_id',
        assigned_to_email: 'staff_email',
        assigned_to_name: 'staff_name',
        status: 'completion_status',
        shift_id: 'shift_id',
      }
    },

    // WorkforceCore Shift → LeafeCore Checklist
    'shift_to_leafe_checklist': {
      source: 'workforce',
      target: 'leafe_checklist_entry',
      mapping: {
        shift_id: 'shift_id',
        staff_email: 'staff_email',
        staff_name: 'staff_name',
        shift_type: 'checklist_category',
        venue_id: 'venue_id',
      }
    },

    // LeafeCore Checklist → ComplianceCore Audit
    'leafe_to_compliance': {
      source: 'leafe',
      target: 'compliance_audit',
      mapping: {
        checklist_id: 'target_record_id',
        staff_email: 'user_email',
        staff_name: 'user_name',
        score: 'metadata.checklist_score',
        venue_id: 'metadata.venue_id',
      }
    },

    // Inventory Order → ComplianceCore Email Log
    'inventory_to_compliance_email': {
      source: 'inventory',
      target: 'compliance_email_log',
      mapping: {
        order_id: 'related_record_id',
        supplier_email: 'recipient_email',
        supplier_name: 'recipient_name',
        order_number: 'metadata.order_number',
      }
    },

    // DocumentManagement → WorkforceCore Onboarding
    'document_to_onboarding': {
      source: 'documents',
      target: 'onboarding_progress',
      mapping: {
        document_id: 'metadata.document_signed',
        staff_email: 'staff_email',
        staff_name: 'staff_name',
        signature_url: 'metadata.signature_url',
      }
    },

    // Tasks → WorkforceCore Shift
    'task_to_shift': {
      source: 'tasks',
      target: 'shift',
      mapping: {
        task_id: 'metadata.linked_task_ids',
        staff_email: 'staff_email',
        shift_date: 'shift_date',
        status: 'metadata.task_statuses',
      }
    },

    // Attendance → PayrollCore
    'attendance_to_payroll': {
      source: 'workforce',
      target: 'payroll_record',
      mapping: {
        attendance_record_id: 'metadata.attendance_records',
        staff_email: 'staff_email',
        total_hours: 'total_hours',
        overtime_hours: 'overtime_hours',
        shift_date: 'metadata.shift_dates',
      }
    },

    // LeafeCore Audit → LeafeCore Hygiene Score
    'audit_to_hygiene_score': {
      source: 'leafe',
      target: 'leafe_hygiene_score',
      mapping: {
        audit_id: 'metadata.last_audit_id',
        venue_id: 'venue_id',
        overall_score: 'score',
        audit_date: 'last_updated',
      }
    },
  };

  /**
   * Get metadata mapping for a connection
   */
  static getMapping(connectionName) {
    return this.METADATA_MAPPINGS[connectionName];
  }

  /**
   * Link two records using metadata (NO direct join)
   * Creates metadata reference in target record
   */
  static async linkRecords(connectionName, sourceRecord, targetRecord) {
    const mapping = this.getMapping(connectionName);
    
    if (!mapping) {
      throw new Error(`Unknown metadata connection: ${connectionName}`);
    }

    console.log(`[MetadataConnector] Linking ${mapping.source} → ${mapping.target}`);

    // Build metadata object based on mapping
    const metadata = {};
    
    for (const [sourceField, targetField] of Object.entries(mapping.mapping)) {
      // Handle nested metadata fields (e.g., metadata.checklist_score)
      if (targetField.startsWith('metadata.')) {
        const metadataKey = targetField.replace('metadata.', '');
        if (!metadata.metadata) metadata.metadata = {};
        metadata.metadata[metadataKey] = sourceRecord[sourceField];
      } else {
        metadata[targetField] = sourceRecord[sourceField];
      }
    }

    return metadata;
  }

  /**
   * Resolve metadata reference (fetch source record by ID)
   * Used when you need to display data from another module
   */
  static async resolveReference(entityName, recordId, fields = null) {
    try {
      const records = await base44.entities[entityName].filter({ id: recordId });
      
      if (records.length === 0) {
        console.warn(`[MetadataConnector] Record not found: ${entityName}#${recordId}`);
        return null;
      }

      const record = records[0];

      // If specific fields requested, return only those
      if (fields && Array.isArray(fields)) {
        const filtered = {};
        fields.forEach(field => {
          filtered[field] = record[field];
        });
        return filtered;
      }

      return record;
    } catch (error) {
      console.error(`[MetadataConnector] Error resolving reference:`, error);
      return null;
    }
  }

  /**
   * Batch resolve multiple references
   * More efficient than individual lookups
   */
  static async resolveReferences(entityName, recordIds, fields = null) {
    try {
      const allRecords = await base44.entities[entityName].list();
      const filtered = allRecords.filter(record => recordIds.includes(record.id));

      if (fields && Array.isArray(fields)) {
        return filtered.map(record => {
          const obj = {};
          fields.forEach(field => {
            obj[field] = record[field];
          });
          return obj;
        });
      }

      return filtered;
    } catch (error) {
      console.error(`[MetadataConnector] Error resolving references:`, error);
      return [];
    }
  }

  /**
   * Create metadata link in target entity
   * Stores only IDs and essential info, never duplicates data
   */
  static async createMetadataLink(targetEntity, targetRecordId, sourceModule, sourceRecordId, additionalMeta = {}) {
    try {
      const targetRecords = await base44.entities[targetEntity].filter({ id: targetRecordId });
      
      if (targetRecords.length === 0) {
        throw new Error(`Target record not found: ${targetEntity}#${targetRecordId}`);
      }

      const currentRecord = targetRecords[0];
      const currentMetadata = currentRecord.metadata || {};

      // Add metadata link
      const updatedMetadata = {
        ...currentMetadata,
        [`${sourceModule}_link`]: {
          source_module: sourceModule,
          source_record_id: sourceRecordId,
          linked_at: new Date().toISOString(),
          ...additionalMeta,
        }
      };

      // Update record with metadata
      await base44.entities[targetEntity].update(targetRecordId, {
        metadata: updatedMetadata
      });

      console.log(`[MetadataConnector] Created link: ${sourceModule}#${sourceRecordId} → ${targetEntity}#${targetRecordId}`);

      return updatedMetadata;
    } catch (error) {
      console.error('[MetadataConnector] Error creating metadata link:', error);
      throw error;
    }
  }

  /**
   * Query records by metadata link
   * Find all records linked to a source record
   */
  static async queryByMetadataLink(targetEntity, sourceModule, sourceRecordId) {
    try {
      const allRecords = await base44.entities[targetEntity].list();
      
      const linkedRecords = allRecords.filter(record => {
        const metadata = record.metadata;
        if (!metadata) return false;
        
        const link = metadata[`${sourceModule}_link`];
        return link && link.source_record_id === sourceRecordId;
      });

      console.log(`[MetadataConnector] Found ${linkedRecords.length} records linked to ${sourceModule}#${sourceRecordId}`);

      return linkedRecords;
    } catch (error) {
      console.error('[MetadataConnector] Error querying by metadata link:', error);
      return [];
    }
  }

  /**
   * Validate metadata connection
   * Ensures both source and target exist before linking
   */
  static async validateConnection(sourceEntity, sourceId, targetEntity, targetId) {
    try {
      const [sourceRecords, targetRecords] = await Promise.all([
        base44.entities[sourceEntity].filter({ id: sourceId }),
        base44.entities[targetEntity].filter({ id: targetId }),
      ]);

      const valid = sourceRecords.length > 0 && targetRecords.length > 0;

      if (!valid) {
        console.warn(`[MetadataConnector] Invalid connection: source=${sourceRecords.length > 0}, target=${targetRecords.length > 0}`);
      }

      return valid;
    } catch (error) {
      console.error('[MetadataConnector] Error validating connection:', error);
      return false;
    }
  }

  /**
   * Remove metadata link
   * Clean up when connection no longer needed
   */
  static async removeMetadataLink(targetEntity, targetRecordId, sourceModule) {
    try {
      const targetRecords = await base44.entities[targetEntity].filter({ id: targetRecordId });
      
      if (targetRecords.length === 0) {
        return false;
      }

      const currentRecord = targetRecords[0];
      const currentMetadata = currentRecord.metadata || {};

      // Remove the link
      delete currentMetadata[`${sourceModule}_link`];

      await base44.entities[targetEntity].update(targetRecordId, {
        metadata: currentMetadata
      });

      console.log(`[MetadataConnector] Removed link: ${sourceModule} → ${targetEntity}#${targetRecordId}`);

      return true;
    } catch (error) {
      console.error('[MetadataConnector] Error removing metadata link:', error);
      return false;
    }
  }

  /**
   * Get all available connections
   */
  static listConnections() {
    return Object.keys(this.METADATA_MAPPINGS).map(key => ({
      name: key,
      ...this.METADATA_MAPPINGS[key]
    }));
  }

  /**
   * Get connection documentation
   */
  static getConnectionDocs(connectionName) {
    const mapping = this.getMapping(connectionName);
    
    if (!mapping) {
      return null;
    }

    return {
      name: connectionName,
      description: `Links ${mapping.source} module to ${mapping.target} entity`,
      source_module: mapping.source,
      target_entity: mapping.target,
      field_mappings: mapping.mapping,
      usage_example: `
// Create metadata link
const metadata = await MetadataConnector.linkRecords('${connectionName}', sourceRecord, targetRecord);

// Resolve reference
const data = await MetadataConnector.resolveReference('${mapping.target.split('_')[0] === 'leafe' ? 'Leafe' + mapping.target.split('_').slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('') : mapping.target.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')}', recordId);

// Query by link
const linked = await MetadataConnector.queryByMetadataLink('${mapping.target.split('_')[0] === 'leafe' ? 'Leafe' + mapping.target.split('_').slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('') : mapping.target.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')}', '${mapping.source}', sourceId);
      `.trim()
    };
  }
}

export default MetadataConnector;