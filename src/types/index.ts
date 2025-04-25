
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

// INTERFACE FOR RESUME SCORES
export interface ResumeScores {
    skills_match: number;
    experience_relevance: number;
    education_fit: number;
    cultural_fit: number;
    overall_impression: number;
}

// INTERFACE FOR RESUME FEEDBACK
export interface ResumeFeedback {
    candidate_name: string;
    analysis: string;
    scores: ResumeScores;
    total_score: number;
    key_strengths: [string];
    areas_for_improvement: [string];
}

// INTERFACE FOR CJC AGENT
export interface JobResumeMatch {
    job_description_name: string;
    candidate_name: string;
    match_score: number;
    match_explanation: string;
}

// INTERFACE FOR CROSS JOB MATCH RESULTS
export interface CrossJobMatchResult {
    job_resume_matches: [JobResumeMatch];
    best_matches_per_resume: {[key: string]: string};  // resume_name -> best_job_name
    overall_recommendation: string;
}

// INTERFACE FOR MJC GRAPH RESULTS
export interface MultiJobComparisonState {
    job_openings: [{}];
    resumes: [{}];
    all_rankings: {[key: string]: [ResumeFeedback]};
    final_recommendations: CrossJobMatchResult
}

/* API INTERFACE FOR MJC GRAPH API RESULTS */
export interface MJCAPIStatus {
    trace_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: Record<string, string>;
    results: MultiJobComparisonState;
    error?: string | null;
}


/* GENERAL API INTERFACE */

// INTERFACE FOR PROCESSING RESUME FILES
export interface ProcessedResumeData {
    page_content: string;
    metadata: {[key: string]: any };
}

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
