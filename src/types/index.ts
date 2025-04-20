
// INTERFACE FOR HANDLING FILES
export interface FileWithContent {
    file: File;
    content: string;
    }

// INTERFACE FOR EXISTING JOB OPENINGS
export interface ExistingJobOpenings {
    recordId?: string;
    jobTitle: string;
    jobDescription: string;
}

// INTERFACE FOR ADDING NEW JOB OPENINGS
export interface AddNewJobOpenings {
    jobTitle: string;
    jobDescription: string;
}

// INTERFACE FOR JDW GRAPH RESULTS
export interface JobDescription {
    job_title: string; // GET job_title FIELDS FROM THE API
    job_type: string; // GET job_type FIELD FROM THE API
    department: string; // GET department FIELD FROM THE API
    expiry_date: string; // GET expiry_date FIELD FROM THE API
    job_duties: string; // GET job_duties FIELD FROM THE API
    job_qualification: string //  GET job_qualification FIELD FROM THE API
    expected_start_date: string; // GET expected_start_date FIELD FROM THE API
    job_location: string; // GET job_location FIELD FROM THE API
    finalized_job_description: string; // GET finalized_job_description FIELD FROM THE API
  }

// INTERFACE FOR JDW API PAYLOAD
export interface JDWAPIPayload {
    name: string;
    content: string;
}

// INTERFACE FOR EXISTING CANDIDATES
export interface ExistingCandidate {
    recordId?: string;
    candidateName: string;
    position: string;
    resume?: any; // Adjust type based on how resume data (e.g., attachment URL) is stored/retrieved
}

// INTERFACE FOR ADDING NEW CANDIDATES
export interface AddNewCandidate {
    candidateName: string;
    position: string;
    resumeFile: File; // Store the actual file object for potential upload
}

// INTERFACE FOR BULK CANDIDATE UPLOADS
// Add this interface for bulk candidate uploads
export interface BulkCandidateUpload {
    position: string;
    resumeFile: File[];
    candidateName?: string;
    status?: 'pending' | 'processing' | 'completed' | 'error';
}

/* GENERAL API INTERFACE */

// INTERFACE FOR OVERALL API STATUS
export interface OverAllAPIStatus {
    trace_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: Record<string, string>;
    results: any;
    error?: string | null;
}

// INTERFACE FOR INITIAL API RESPONSE
export interface InitialAPIResponse {
    trace_id: string;
    message: string;
}
