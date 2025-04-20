import { useState, useEffect } from 'react';
import { bitable, ITable, ITextField, IAttachmentField, IDuplexLinkField } from '@lark-base-open/js-sdk';
import { ExistingCandidate, AddNewCandidate, BulkCandidateUpload } from '../types/index';

export function useLarkCandidates() {
  const [table, setTable] = useState<ITable>();
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [existingCandidates, setExistingCandidates] = useState<ExistingCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeLarkCandidates = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the ③Candidates table
        const candidatesTable = await bitable.base.getTableByName('③Candidates');
        if (!candidatesTable) {
          setError('---FAILED TO GET ③Candidates TABLE---');
          setLoading(false);
          return;
        }
        setTable(candidatesTable);

        // Get all fields to map field names to field IDs
        const fields = await candidatesTable.getFieldMetaList();
        const fieldMapping: Record<string, string> = {};
        let nameFieldId: string | null = null;
        let positionFieldId: string | null = null;
        let resumeFieldId: string | null = null;

        for (const field of fields) {
          if (field.name.toLowerCase().includes('candidate name')) {
            fieldMapping['candidateName'] = field.id;
            nameFieldId = field.id;
          } else if (field.name.toLowerCase().includes('position')) {
            fieldMapping['position'] = field.id;
            positionFieldId = field.id;
          } else if (field.name.toLowerCase().includes('resume')) {
            fieldMapping['resume'] = field.id;
            resumeFieldId = field.id;
          }
          // Add other field mappings if needed
        }

        // Ensure required fields were found
        if (!nameFieldId || !positionFieldId) {
            setError('Failed to identify required fields (Candidate Name, Position) in the ③Candidates table.');
            setLoading(false);
            return;
        }

        // Fetch existing candidates
        const recordList = await candidatesTable.getRecordList();
        const fetchedCandidates: ExistingCandidate[] = [];

        for await (const record of Array.from(recordList)) {
          try {
            const nameField = await candidatesTable.getField<ITextField>(fieldMapping['candidateName']);
            const nameCell = await nameField.getCell(record.id);
            const nameValue = await nameCell.getValue();
            const candidateName = Array.isArray(nameValue) ? nameValue[0]?.text ?? 'Unnamed Candidate' : String(nameValue ?? 'Unnamed Candidate');

            // Get position value
            let positionValue = '';
            if (fieldMapping['position']) {
          const positionField = await candidatesTable.getField<ITextField>(fieldMapping['position']);
          const positionCell = await positionField.getCell(record.id);
          const rawPositionValue = await positionCell.getValue();
          positionValue = Array.isArray(rawPositionValue) ? rawPositionValue[0]?.text ?? '' : String(rawPositionValue ?? '');
            }

            let resumeData = null;
            if (fieldMapping['resume']) {
          try {
              const resumeField = await candidatesTable.getField<IAttachmentField>(fieldMapping['resume']);
              resumeData = await resumeField.getValue(record.id);
          } catch (attachError) {
              console.warn(`Could not retrieve resume for record ${record.id}:`, attachError);
          }
            }

            fetchedCandidates.push({
              recordId: record.id,
              candidateName: candidateName,
              position: positionValue,
              resume: resumeData,
            });

          } catch (cellError) {
            console.error(`Error processing record ${record.id}:`, cellError);
          }
        }

        setExistingCandidates(fetchedCandidates);
        // console.log('FETCHED EXISTING CANDIDATES: ', fetchedCandidates);
        
        // SET FIELD MAP
        setFieldMap(fieldMapping);

      } catch (err) {
        console.error('Error initializing Lark Candidates:', err);
        setError('Failed to initialize Lark Candidates. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeLarkCandidates();
  }, []);

  // Add functions for adding/updating candidates if needed later
  const saveAddedCandidates = async(addedCandidates: AddNewCandidate[] | BulkCandidateUpload[]) => {
    if (!table) {
      throw new Error('Table not initialized');
    }

    try {

      const recordData: Record<string, any> = {};
      
      
      
      const recordPromises = addedCandidates.map(async (candidate) => {

        

        // PREPARE CANDIDATE NAME FOR LARK PERSISTENCE
        if (fieldMap.candidateName && candidate.candidateName) {
          recordData[fieldMap.candidateName] = candidate.candidateName;
          console.log(`---${candidate.candidateName} READY TO PUSH TO LARK---`);
        }

        // PREPARE CANDIDATE'S POSITION FOR LARK PERSISTENCE
        if (fieldMap.position && candidate.position) {
          recordData[fieldMap.position] = candidate.position;
        }

        // PREPARE CANDIDATE'S RESUME FOR LARK PERSISTENCE
        if (fieldMap.resume && candidate.resumeFile) {
          recordData[fieldMap.resume] = candidate.resumeFile;
        }

        // ADD CANDIDATE RECORD TO LARK BASE TABLE
        if (Object.keys(recordData).length > 0) {
          console.log(`---ADDING ${candidate.candidateName} TO LARK---`);
          try {
            const addedRecord = table.addRecord({fields: recordData});
            return addedRecord;
          } catch (addError) {
            console.error(`---FAILED TO ADD CANDIDATE: ${candidate.candidateName}---`, addError);
            return null;
          }
        } else {
          console.log(`---SKIPPING CANDIDATE: ${candidate.candidateName} - NO DATA TO ADD---`);
          return null;
        }

      });

      // Wait for all addRecord operations to complete
      const addedRecordResults = await Promise.all(recordPromises);

      // Filter out null results (skipped CANDIDATES)
      const actualAddedRecords = addedRecordResults.filter(result => result !== null);

      console.log(`Successfully added ${actualAddedRecords.length} records.`);
    } catch (err) {
      console.error('Error updating records:', err);
      throw new Error('Failed to update records in Lark Base');
    }
  }

  return {
    table,
    loading,
    error,
    existingCandidates,
    saveAddedCandidates
    // Add functions like addCandidate, updateCandidate here if needed
  };
}