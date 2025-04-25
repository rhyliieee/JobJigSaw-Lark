import { 
    OverAllAPIStatus, 
    InitialAPIResponse, 
    AddNewJobOpenings,
    JobDescription,
    JDWAPIPayload,
    ExistingJobOpenings,
    BulkCandidateUpload,
    ProcessedResumeData,
    MJCAPIStatus
  } from '../types';
// import { extractPDFContent } from '@/utils';
import axios from 'axios';
import { toast } from 'sonner';

// const pdf = require('pdf-parse');
  
  /**
   * Retrieves API configuration from environment variables with defaults.
   * @returns {object} Object containing API URL, header name, and key.
   * @throws {Error} If required environment variables are missing.
   */
  function getJDWAPIConfig() {
    const apiHeaderName = import.meta.env.VITE_JDW_HEADER_NAME || 'DIREC-AI-JDW-API-KEY';
    const apiURL = import.meta.env.VITE_JDW_API_URL || 'http://localhost:8090';
    const apiKey = import.meta.env.VITE_JDW_API_KEY || 'jdw_d39_8bb3_4795_ae2e_a8ab6b526210'; 

    // Basic validation - ensure essential config is present
    if (!apiHeaderName || !apiURL || !apiKey) {
        console.error('API configuration is incomplete. Check environment variables JDW_HEADER_NAME, JDW_API_URL, JDW_API_KEY.');
        throw new Error('API configuration is incomplete.');
    }
  
    return { apiURL, apiHeaderName, apiKey };
  }
  
  
  /**
   * Performs a health check on the JDW API endpoint.
   * @returns {Promise<any>} The response data from the health check endpoint.
   * @throws {Error} If the API call fails or returns an unhealthy status.
   */
  export async function jdwAPIHealthCheck(): Promise<any> {
    try {
      const { apiURL, apiHeaderName, apiKey } = getJDWAPIConfig();
      console.log(`Performing health check on: ${apiURL}/ai/jdw/v1/health`);
      
      // CALL THE API TO CHECK HEALTH STATUS
      const response = await axios.get(
        `${apiURL}/ai/jdw/v1/health`,
        {
          headers: {
            [apiHeaderName]: apiKey,
            'Accept': 'application/json',
          }
        }
      )
      console.log(`---RESPONSE FROM THE API: ${response.status}---`)
      
      // Check if the response indicates success (e.g., status 200 and data.status === 'ok')
      if (response.status !== 200 || response.data?.status !== 'ok') {
        toast.error("JDW Agent's API Health Check Failed");
        throw new Error(`API health check failed or returned unexpected status: ${response.statusText}`);
    }
  
    toast.success("Job Description Writer Agent READY!");
    return response; 
    } catch (error: any) {
      console.error('Error checking API health:', error.response?.data || error.message);
      throw new Error(`Failed to check API health. Please ensure the API is running and configuration is correct. Details: ${error.message}`);
    }
  }
  
/**
 * Initiates the job description writing process by sending the newly added Job data to the API.
 * @param {JobInputData[]} newJobs - An array of objects containing job titles and descriptions.
 * @returns {Promise<InitialAPIResponse>} An object containing the trace_id for the initiated job.
 * @throws {Error} If the API call fails or the response is invalid.
 */
export async function startJDWriter(newJobs: AddNewJobOpenings[]): Promise<InitialAPIResponse> {
  try {
      // GET API CONFIGURATION
      const { apiURL, apiHeaderName, apiKey } = getJDWAPIConfig();
      const endpoint = `${apiURL}/ai/jdw/v1/job_description_writer`; // Construct endpoint URL
      console.log(`Initiating job description processing at: ${endpoint}`);

      // --- Data Transformation ---
      // Convert the input job data to the required API payload format: List[Dict[str, str]]
      const apiPayload: JDWAPIPayload[] = newJobs.map(job => ({
          name: job.jobTitle,      // Map 'title' to 'name'
          content: job.jobDescription // Map 'description' to 'content'
      }));

      // Log the names of the jobs being processed for debugging
      console.log('--- Jobs to be processed: ', apiPayload.map(job => job.name));

      // --- API Call ---
      // Use axios to send the POST request
      const response = await axios.post<InitialAPIResponse>( // Expect InitialAPIResponse structure
          endpoint,
          { job_openings: apiPayload }, // Send data nested under 'job_openings' key
          {
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  [apiHeaderName]: apiKey // Dynamically set API key header
              }
          }
      );

      // Log the API response data for debugging
      console.log(`--- Job Initiation API Response Data:`, response.data, '---');

      // --- Response Validation ---
      // Ensure the response data and trace_id exist
      if (!response.data || !response.data.trace_id) {
          console.error('Invalid API response:', response.data);
          toast.error('API response did not include a valid trace_id.');
          // throw new Error('API response did not include a valid trace_id.');
      }

      // Return the structured response data
      toast.success("JDW Agent's Job is a Success!");
      return response.data;

  } catch (error: any) {
      // --- Error Handling ---
      // Log detailed error information
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Error processing job descriptions:', errorMessage, error.response?.data || error);
      toast.error("JDW Agent Failed");
      // Throw a more user-friendly error message
      throw new Error(`Failed to initiate job description processing. Details: ${errorMessage}`);
  }
}
  
  /**
   * Checks the status of a specific job using its trace ID.
   * @param {string} traceId - The unique identifier for the job.
   * @returns {Promise<OverAllAPIStatus>} An object containing the current status, progress, and results (if completed).
   * @throws {Error} If the API call fails or the job is not found.
   */
  export async function checkJDWStatus(traceId: string): Promise<OverAllAPIStatus> {
    if (!traceId) {
      throw new Error('Trace ID is required to check job status.');
    }
    try {
      const { apiURL, apiHeaderName, apiKey } = getJDWAPIConfig();
      console.log(`Checking job status for trace ID: ${traceId} at: ${apiURL}/ai/jdw/v1/status/${traceId}`);
  
      const response = await axios.get<OverAllAPIStatus>(
        `${apiURL}/ai/jdw/v1/status/${traceId}`,
        {
          headers: {
            [apiHeaderName]: apiKey,
            'Accept': 'application/json',
          }
        }
      );
  
      console.log(`--- Job Status API Response Status: ${response.status} ---`);
  
      // Validate the response structure based on JobStatus interface
       if (!response.data || typeof response.data.status !== 'string') {
          console.error("Invalid status response structure:", response.data);
          throw new Error('Received invalid status response from API.');
      }
  
      return response.data; // Return the parsed JSON response
    } catch (error: any) {
      console.error(`Error checking job status for trace ID ${traceId}:`, error.response?.data || error.message);
      if (error.response?.status === 404) {
          throw new Error(`Job with trace ID ${traceId} not found.`);
      }
      throw new Error(`Failed to check job status for trace ID ${traceId}. Details: ${error.message}`);
    }
  }
  
  /**
   * GET API CONFIG FOR RESUME ANALYSIS
   */
  function getRARAPIConfig() {
    const apiHeaderName = import.meta.env.VITE_RAR_HEADER_NAME || 'DIREC-AI-RAR-API-KEY';
    const apiURL = import.meta.env.VITE_RAR_API_URL || 'http://localhost:8080';
    const apiKey = import.meta.env.VITE_RAR_API_KEY || 'rar_c1a09171_ed574d67_af76_23b2b129b8'; 
  
    // Basic validation - ensure essential config is present
    if (!apiHeaderName || !apiURL || !apiKey) {
        console.error('API configuration is incomplete. Check environment variables RAR_HEADER_NAME, RAR_API_URL, RAR_API_KEY.');
        throw new Error('API configuration is incomplete.');
    }
  
    return { apiURL, apiHeaderName, apiKey };
  }
  
  /**
   * Performs a health check on the RAR API endpoint.
   * @returns {Promise<any>} The response data from the health check endpoint.
   * @throws {Error} If the API call fails or returns an unhealthy status.
   */
  export async function apiRARHealthCheck(): Promise<any> {
    try {
      const { apiURL, apiHeaderName, apiKey } = getRARAPIConfig();
      
      // CALL THE API TO CHECK HEALTH STATUS
      const response = await axios.get(
        `${apiURL}/ai/rar/v1/health`,
        {
          headers: {
            [apiHeaderName]: apiKey,
            'Accept': 'application/json',
          }
        }
      )
      
      // Check if the response indicates success (e.g., status 200 and data.status === 'ok')
      if (response.status !== 200 || response.data?.status !== 'ok') {
        throw new Error(`API health check failed or returned unexpected status: ${response.statusText}`);
    }
  
    return response.data; 
    } catch (error: any) {
      console.error('Error checking API health on RAR Endpoint:', error.response?.data || error.message);
      throw new Error(`Failed to check API health on RAR Endpoint. Please ensure the API is running and configuration is correct. Details: ${error.message}`);
    }
  }


  /**
   * NEW: Sends raw resume files to the backend for processing.
   * @param {File[]} resumeFiles - An array of raw File objects for the resumes.
   * @returns {Promise<ProcessedResumeData[]>} A promise that resolves to an array of processed resume data.
   * @throws {Error} If the API call fails.
   */
  export async function processResumesAPI(resumeFiles: File[]): Promise<ProcessedResumeData[]> {
    if (!resumeFiles || resumeFiles.length === 0) {
      console.warn("processResumesAPI called with no files.");
      return []; // Return empty array if no files are provided
    }

    try {
      // GET API CONFIGURATION (Assuming RAR config is appropriate)
      const { apiURL, apiHeaderName, apiKey } = getRARAPIConfig();
      const endpoint = `${apiURL}/ai/rar/v1/process_resumes`;
      // console.log(`Sending ${resumeFiles.length} resumes for processing to: ${endpoint}`);

      // PREPARE FORM DATA FOR FILE UPLOAD
      const formData = new FormData();
      resumeFiles.forEach((file) => {
        formData.append('resumes', file, file.name); // Key must match backend File(...) parameter name
      });

      // CALL THE PROCESSING API
      const response = await axios.post<ProcessedResumeData[]>(
        endpoint,
        formData, // Send FormData
        {
          headers: {
            'Accept': 'application/json', // Expect JSON response
            [apiHeaderName]: apiKey
          }
        }
      );

      // Basic validation
      if (!Array.isArray(response.data)) {
          throw new Error('Invalid response format from resume processing API.');
      }

      return response.data;

    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || 'Unknown error during resume processing';
      console.error('Error Processing Resumes via API:', errorDetail, error.response || error);
      toast.error("Resume Processing Failed", { description: errorDetail });
      // Re-throw a more specific error
      throw new Error(`Failed to process resumes: ${errorDetail}`);
    }
  }

  
  /**
   * Initiates the job description writing process by sending files to the API.
   * @param {FileWithContent[]} files - An array of file objects with their content.
   * @returns {Promise<InitialAPIResponse>} An object containing the trace_id for the initiated job.
   * @throws {Error} If the API call fails.
   */
  export async function startResumeAnalysis(
    existingJobs: ExistingJobOpenings[],
    candidates: BulkCandidateUpload[]
  ): Promise<InitialAPIResponse> {
    try {

      // --- Step 1: Process Resumes ---
      console.log("Step 1: Processing resumes...");
      const allResumeFiles: File[] = candidates.flatMap(c => c.resumeFile); // Collect all files

      if (allResumeFiles.length === 0) {
          throw new Error("No resume files found to process.");
      }

      const processedResumes = await processResumesAPI(allResumeFiles);
      console.log(`Successfully processed ${processedResumes.length} resumes.`);

      if (processedResumes.length === 0) {
          // This might happen if processing failed silently or returned empty
          throw new Error("Resume processing returned no data. Cannot proceed with analysis.");
      }


      // --- Step 2: Start Analysis with Processed Data ---
      console.log("Step 2: Starting analysis with processed data...");
      const { apiURL, apiHeaderName, apiKey } = getRARAPIConfig();
      const analysisEndpoint = `${apiURL}/ai/rar/v1/analyze_and_rerank`;
      console.log(`Initiating Resume Analysis at: ${apiURL}/ai/rar/v1/analyze_and_rerank`);

      // PREPARE EXISTING JOBS TO BE A LIST OF DICTIONARY
      const jobOpeningsPayload = await Promise.all(existingJobs.map(async (jobs) => {
        return {
          name: jobs.jobTitle,
          content: jobs.jobDescription
        };
      }));

      // PREPARE FINAL JSON PAYLOAD FOR THE ANALYSIS ENDPOINT
      const analysisPayload = {
        job_openings: jobOpeningsPayload,
        resumes: processedResumes // Use the data from the processing step
      };
      
      console.log(`Initiating Analysis at: ${analysisEndpoint}`);
      // CALL THE API TO SEND REQUEST
      const response = await axios.post<InitialAPIResponse>(
        analysisEndpoint,
        analysisPayload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            [apiHeaderName]: apiKey
          }
        }
      );
  
      // Basic validation of the response structure
      if (!response.data || !response.data.trace_id) {
          throw new Error('API response did not include a trace_id.');
      }
  
      return response.data; // Return the parsed JSON response { trace_id: "...", message: "..." }
    } catch (error: any) {
      console.error('Error Analyzing Resumes:', error.response?.data || error.message);
      throw new Error(`Failed to initiate Resume Analysis. Details: ${error.message}`);
    }
  }
  
  
  /**
   * Checks the status of a specific job using its trace ID.
   * @param {string} traceId - The unique identifier for the job.
   * @returns {Promise<JobStatus>} An object containing the current status, progress, and results (if completed).
   * @throws {Error} If the API call fails or the job is not found.
   */
  export async function checkRARStatus(traceId: string): Promise<MJCAPIStatus> {
    if (!traceId) {
      throw new Error('Trace ID is required to check job status.');
    }
    try {
      const { apiURL, apiHeaderName, apiKey } = getRARAPIConfig();
  
      const response = await axios.get<MJCAPIStatus>(
        `${apiURL}/ai/rar/v1/status/${traceId}`,
        {
          headers: {
            [apiHeaderName]: apiKey,
            'Accept': 'application/json',
          }
        }
      );
  
      // Validate the response structure based on JobStatus interface
       if (!response.data || typeof response.data.status !== 'string') {
          console.error("Invalid status response structure:", response.data);
          throw new Error('Received invalid status response from API.');
      }
  
      return response.data; // Return the parsed JSON response
    } catch (error: any) {
      console.error(`Error in 'checkRARStatus' checking job status for trace ID ${traceId}:`, error.response?.data || error.message);
      if (error.response?.status === 404) {
          throw new Error(`Job with trace ID ${traceId} not found.`);
      }
      throw new Error(`Failed to check job status for trace ID ${traceId}. Details: ${error.message}`);
    }
  }