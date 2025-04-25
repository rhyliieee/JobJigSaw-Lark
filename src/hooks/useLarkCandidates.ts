import { useState, useEffect } from 'react';
import { bitable, ITable, ITextField, IAttachmentField, IOpenSegmentType, IRecordValue, IOpenCellValue, ICell } from '@lark-base-open/js-sdk';
import { 
  ExistingCandidate, 
  AddNewCandidate, 
  BulkCandidateUpload,
  CrossJobMatchResult,
  JobResumeMatch,
  ResumeFeedback
 } from '../types/index';
import { toast } from 'sonner';

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
          } else if (field.name.toLowerCase() === 'position') {
            fieldMapping['position'] = field.id;
            positionFieldId = field.id;
          } else if (field.name.toLocaleLowerCase().includes('cv rate')) {
            fieldMapping['cvRate'] = field.id;
          } else if (field.name.toLowerCase().includes('resume')) {
            fieldMapping['resume'] = field.id;
            resumeFieldId = field.id;
          } else if (field.name.toLocaleLowerCase().includes("candidate's insight")) {
            fieldMapping['candidateInsight'] = field.id;
          } else if (field.name.toLocaleLowerCase().includes("potential gaps")) {
            fieldMapping['potentialGaps'] = field.id;
          } else if (field.name.toLocaleLowerCase().includes("key")) {
            fieldMapping['keyStrengths'] = field.id;
          } else if (field.name === "Best Match Position") {
            fieldMapping['matchPosition'] = field.id;
          } else if (/match\s+score/i.test(field.name.toLowerCase())) {
            fieldMapping['matchScore'] = field.id;
          } else if (field.name.toLowerCase() === 'match explanation') {
            fieldMapping['matchExplanation'] = field.id;
          } else if (field.name.toLocaleLowerCase().includes("overall recomm")) {
            fieldMapping['overallRecomm'] = field.id;
          } else {
            console.log(`Field "${field.name}" does not match any known criteria.`);
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
        console.log(`---CURRENT FIELD MAP: ${JSON.stringify(fieldMapping, null, 2)}---`);

      } catch (err) {
        console.error('Error initializing Lark Candidates:', err);
        setError('Failed to initialize Lark Candidates. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeLarkCandidates();
  }, []);

  // FUNCTION FOR SAVING ANALYZED RESUME CANDIDATES
  const saveAnalyzedCandidates = async (
    finalRecos: CrossJobMatchResult | null,
    allRankings: { [key: string]: ResumeFeedback[] } | null, 
    analyzedPositions: string[], 
    uploadedCandidatesData: BulkCandidateUpload[]
  ): Promise<void> => {

      if (!table) {
        console.error('Save Analyzed: Table not initialized');
        toast.error("Save Failed", { description: "Lark table not ready." });
        return;
      }
      if (!finalRecos || !allRankings || analyzedPositions.length === 0) {
          console.warn('Save Analyzed: Missing required data (finalRecos, allRankings, or analyzedPositions).');
          toast.warning("Save Skipped", { description: "Missing analysis data to save." });
          return;
      }
      if (Object.keys(fieldMap).length === 0) {
          console.error('Save Analyzed: Field map is empty. Cannot map data to Lark fields.');
          toast.error("Save Failed", { description: "Lark field mapping failed." });
          return;
      }

      if (uploadedCandidatesData.length === 0) {
        console.error(`Uploaded Candidate's Data is Empty`);
        toast.error("Save Failed", { description: "`UploadedCandidatesData` is Empty" });
        return;
      }

      console.log("Final Recommendations:", finalRecos);
      console.log("All Rankings:", allRankings);

      // --- HELPER FUNCTION TO CREATE RESUME FILE LOOKUP MAP
      const createResumeFileLookupMap = (
        candidatesData: BulkCandidateUpload[]
      ): { [filename: string]: File } => {
        const lookupMap: { [filename: string]: File } = {};
        for (const uploadData of candidatesData) {
          // Ensure resumeFile exists and is an array
          console.log(`---ADDING ${uploadData.resumeFile} TO LOOKUP MAP---`);
          if (uploadData.resumeFile && Array.isArray(uploadData.resumeFile)) {
            for (const file of uploadData.resumeFile) {
              // Ensure it's a File object with a name property
              if (file instanceof File && file.name) { 
                lookupMap[file.name] = file;
              } else {
                console.warn("Skipping invalid file entry in uploadedCandidatesData:", file);
              }
            }
          }
        }
        return lookupMap;
      };

      const resumeFileLookup = createResumeFileLookupMap(uploadedCandidatesData);
      
      console.log("Resume File Lookup Map Created:", Object.keys(resumeFileLookup).length);
      console.log(`---RESUME FILE LOOKUP: ${resumeFileLookup}`);
      console.log(`---CURRENT FIELDS FROM LARK: ${Object.keys(fieldMap).join(', ')}---`);

      // --- PREPARE RECORDS FOR BATCH ADD ---
      const recordsToAdd: IRecordValue[] = [];
      const addedCandidateNamesInBatch = new Set<string>();

      try {
        for (const position of analyzedPositions) {
          const rankingsForPosition = allRankings[position];
          const jobsResumeMatches = finalRecos.job_resume_matches ?? [];

          if (!rankingsForPosition || rankingsForPosition.length === 0 || !jobsResumeMatches) {
            console.log(`---SKIPPING POSITION ${position}: Missing rankings or job_resume_matches---`); 
            continue;
           }

          for (const resumeFeedback of rankingsForPosition) {
            const candidateNameFB = resumeFeedback.candidate_name;

            if (!candidateNameFB) {
              console.warn(`SKIPPING FEEDBACK ITEM WITH MISSING CANDIDATE NAME`, resumeFeedback);
              continue;
            }

            // --- Avoid adding duplicate candidates within this batch ---
            const candidateKey = candidateNameFB.toLowerCase();
            if (addedCandidateNamesInBatch.has(candidateKey)) {
                console.log(`Skipping duplicate candidate in batch: ${candidateNameFB}`);
                continue; // Skip if already added in this run
            }

            // Find the specific match details for this candidate from the overall results
            const jobResumeMatch = jobsResumeMatches.find(match => 
                match.candidate_name?.toLowerCase() === candidateKey
            );

            console.log(`---JOB RESUME MATCHES: CANDIDATE ${candidateNameFB} IS MATCHED WITH ${jobResumeMatch?.job_description_name}---`);

            // FIND RESUME FILE OF THE CURRENT CANDIDATE
            const resumeFileNameKey = Object.keys(resumeFileLookup).find(key => 
              key.toLowerCase().includes(candidateNameFB.split(' ').slice(0, 2).join('-').toLowerCase()) // Example matching logic, adjust as needed
            );
            console.log(`---CANDIDATE NAME FOR FILE SEARCH KEY: ${candidateNameFB.split(' ').slice(0, 2).join('-').toLowerCase()}---`);
            const resumeFile = resumeFileNameKey ? resumeFileLookup[resumeFileNameKey] : null;
            console.log(`---RESUME FILE OF ${candidateNameFB}: ${resumeFile?.name}---`);


            const fields: { [fieldId: string]: IOpenCellValue} = {};

            // ADD CANDIDATE NAME TO RECORDS
            if (fieldMap.candidateName){
              fields[fieldMap.candidateName] = [{type: IOpenSegmentType.Text, text: candidateNameFB}];
            } 

            // ADD APPLIED POSITION TO RECORDS
            if (fieldMap.position) {
              fields[fieldMap.position] = [{type: IOpenSegmentType.Text, text: position}];
            }

            // ADD CANDIDATE'S INSIGHTS TO RECORDS
            if (fieldMap.candidateInsight && resumeFeedback.analysis) {
              fields[fieldMap.candidateInsight] = [{type: IOpenSegmentType.Text, text: resumeFeedback.analysis}];
            }

            // ADD POTENTIAL GAPS TO RECORDS
            if (fieldMap.potentialGaps && resumeFeedback.areas_for_improvement) {
              fields[fieldMap.potentialGaps] = [{type: IOpenSegmentType.Text, text: resumeFeedback.areas_for_improvement.join('\n')}];
            }

            // ADD KEY STRENGTHS TO RECORDS
            if (fieldMap.keyStrengths && resumeFeedback.key_strengths) {
              fields[fieldMap.keyStrengths] = [{type: IOpenSegmentType.Text, text: resumeFeedback.key_strengths.join('\n')}];
            }

            // ADD MATCH EXPLANATION TO RECORDS - Use the found jobResumeMatch
            if (fieldMap.matchExplanation && jobResumeMatch?.match_explanation) {
              fields[fieldMap.matchExplanation] = [{type: IOpenSegmentType.Text, text: jobResumeMatch.match_explanation}]
            } 

            // ADD MATCH POSITION TO RECORDS
            if (fieldMap.matchPosition && jobsResumeMatches.length > 0 && fieldMap.matchScore) {
              // Find all matches for this candidate
              const candidateMatches = jobsResumeMatches.filter(match => 
              match.candidate_name?.toLowerCase() === candidateNameFB.toLowerCase()
              );

              console.log(`---MATCHES FOR CANDIDATE ${candidateNameFB}: ${JSON.stringify(candidateMatches, null, 2)}---`);

              // Get the match with highest score
              const bestMatch = candidateMatches.reduce((best, current) => {
              return (!best || (current.match_score > best.match_score)) ? current : best;
              }, null as JobResumeMatch | null);

              console.log(`---BEST MATCH FOR CANDIDATE ${candidateNameFB}: ${JSON.stringify(bestMatch, null, 2)}---`);

              if (bestMatch) {
              
                // ADD BEST MATCH POSITION TO RECORDS
                fields[fieldMap.matchPosition] = [{
                  type: IOpenSegmentType.Text, 
                  text: bestMatch.job_description_name || ''
                }];

              // ADD MATCH SCORE TO RECORDS
              fields[fieldMap.matchScore] = bestMatch.match_score;
              }
            }
            
            // ADD CANDIDATE RESUME TO RECORDS
            if (fieldMap.resume && resumeFile) {
                try {
                  console.log(`---UPLOADING RESUME FOR ${candidateNameFB}: ${resumeFile.name}---`);
                  // Upload the file to get a token
                  const uploadToken = await bitable.base.batchUploadFile([resumeFile]);
                  console.log(`---RESUME UPLOAD SUCCESS FOR ${candidateNameFB}, TOKEN: ${uploadToken}---`);
                  // Structure for the attachment field
                  fields[fieldMap.resume] = [{
                    name: resumeFile.name,
                    size: resumeFile.size,
                    type: resumeFile.type,
                    token: uploadToken[0],
                    timeStamp: Date.now() // Optional, but good practice
                  }];
                } catch (uploadError) {
                  console.error(`---FAILED TO UPLOAD RESUME FOR ${candidateNameFB}: ${resumeFile.name}---`, uploadError);
                  toast.error("Resume Upload Failed", { description: `Could not upload ${resumeFile.name}. Skipping attachment.` });
                  // Optionally decide if you want to skip the entire record or just the attachment
                }
              } else if (fieldMap.resume) {
                  console.warn(`No resume file found in lookup for candidate: ${candidateNameFB}`);
              }

            // ADD CV RATE, MATCH SCORE (if available and mapped)
            if (fieldMap.cvRate && resumeFeedback.total_score) { // Example: Assuming cv_rate exists on jobResumeMatch
              fields[fieldMap.cvRate] = resumeFeedback.total_score; // Ensure type matches Lark field (Number)
            }


            // Only add if there are fields to add
            if (Object.keys(fields).length > 0) {
                recordsToAdd.push({ fields });
                addedCandidateNamesInBatch.add(candidateNameFB.toLowerCase()); // Mark as added in this batch
            } else {
                console.warn(`No fields generated for candidate: ${candidateNameFB}`);
            }
          }
        } // End loop through analyzedPositions

        // --- Batch Add Records to Lark ---
        if (recordsToAdd.length > 0) {
          console.log(`Attempting to add ${recordsToAdd.length} unique candidate analysis records to Lark...`);
          // console.log("Records to add:", JSON.stringify(recordsToAdd, null, 2)); // Detailed logging if needed
          const addedResults = await table.addRecords(recordsToAdd);
          console.log(`Lark addRecords response:`, addedResults);
          // Check results for success/failure details if needed
          // const successfulAdds = addedResults.filter(r => r).length;
          if (addedResults.length === recordsToAdd.length) {
              toast.success("Save Successful", { description: `Saved ${addedResults.length} analysis results to Lark.` });
          } else {
              // toast.warning("Partial Save", { description: `Saved ${successfulAdds} out of ${recordsToAdd.length} analysis results. Check console for details.` });
              console.error("Some records failed to add:", addedResults);
          }
        } else {
            console.log("No valid candidate records prepared for saving.");
            toast.info("Save Skipped", { description: "No new analysis data found to save." });
        }
      } catch (error: any) {
        console.error(`--- ERROR in saveAnalyzedCandidates function execution: ${error.message} ---`, error);
        toast.error("Save Operation Failed", { description: `An unexpected error occurred: ${error.message}. Check console for details.` });
      }
  }

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
    saveAddedCandidates,
    saveAnalyzedCandidates
    // Add functions like addCandidate, updateCandidate here if needed
  };
}