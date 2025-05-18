# JobJigSaw - Lark Base Integration Frontend

A component of the [JobJigSaw](https://github.com/rhyliieee/JobJigSaw) suite, designed to generate professional and compelling job descriptions using AI.
---

This project provides a frontend interface within Lark Base to interact with the JobJigSaw backend services for managing job openings and analyzing candidate resumes. It allows users to:

1.  View and select existing job openings from a Lark Base table.
2.  Add new job openings, which are processed by the Job Description Writer (JDW) agent and saved back to Lark Base.
3.  Upload candidate resumes for specific job positions.
4.  Initiate a Resume Analysis & Ranking (RAR) process via the backend API.
5.  View the analysis results, including candidate rankings, strengths, weaknesses, and best job matches.
6.  Save the analysis results back into the Lark Base Candidates table.

## Prerequisites

*   **Node.js and npm/yarn:** Ensure you have Node.js (v18 or later recommended) and npm or yarn installed.
*   **Lark Base:**
    *   A Lark Base with two specific tables:
        *   `①Recruitment Request Management`: Stores job opening details. Must contain fields like 'Position' (Text), 'Job Description' (Text), 'Active' (Checkbox), and potentially others mapped in `useLarkJobs.ts` (e.g., 'City', 'Department', 'Job Duties', 'Required Qualifications', 'Expected Start Date').
        *   `③Candidates`: Stores candidate information and analysis results. Must contain fields like 'Candidate Name' (Text), 'Position' (Text), 'Resume' (Attachment), and fields to store analysis results mapped in `useLarkCandidates.ts` (e.g., 'CV Rate', 'Candidate's Insight', 'Potential Gaps', 'Key Strengths', 'Best Match Position', 'Match Score', 'Match Explanation').
    *   The Lark Base application should have the necessary permissions to read and write data to these tables.
*   **JobJigSaw Backend:** The backend API services (JDW and RAR endpoints) must be running and accessible from where the Lark extension is hosted or run.

## Installation

1.  Navigate to the `JobJigSaw-Lark` directory:
    ```bash
    cd path/to/JobJigSaw-Lark
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

## Running the Application (Development)

1.  Start the Vite development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
2.  Follow the instructions provided by Lark Base for developing and testing extensions, typically involving uploading the development build or pointing to the local development server URL.

## Process Flow

The application follows a three-tab workflow:

1.  **Job Openings Tab (`JobOpenings.tsx`):**
    *   Fetches and displays existing *active* job openings from the `①Recruitment Request Management` table using the `useLarkJobs` hook.
    *   Allows users to select one or more existing job openings to be used in the candidate analysis phase.
    *   Provides an interface to add *new* job openings by entering a title and description.
    *   When new jobs are added and the "Process Added Job(s)" button is clicked:
        *   It calls the backend JDW API (`/jdw/start`).
        *   Polls the JDW status endpoint (`/jdw/status`) until completion or failure.
        *   On success, it uses the `updateRecords` function from `useLarkJobs` to save the generated job descriptions back to the `①Recruitment Request Management` table.
    *   Users click "Continue with Selected" to proceed to the next step with the chosen jobs.

2.  **Candidates & Analysis Tab (`Candidates.tsx`):**
    *   Allows users to upload candidate resumes (PDFs) in bulk for a specific job position selected from the available jobs (fetched in the previous step).
    *   Users select a position and upload one or more resume files.
    *   Clicking "Add Resumes to Batch" prepares the upload group. Multiple batches for different positions can be added.
    *   Clicking "Start Resume Analysis":
        *   Calls the backend RAR API (`/rar/start`), sending the selected job opening details and the prepared resume batches.
        *   Polls the RAR status endpoint (`/rar/status`) until completion or failure.
        *   Triggers callbacks (`onAnalysisStart`, `onAnalysisComplete`, `onAnalysisError`) to the main `App.tsx` component to update the state and switch to the Results tab.

3.  **Results Tab (`ResultsDisplay.tsx`):**
    *   Displays a loading indicator while the analysis is in progress (polling).
    *   Shows errors if the analysis fails.
    *   Once the analysis is complete (`onAnalysisComplete` is called), it receives the results (`MultiJobComparisonState`) and the details of the uploaded candidates (`BulkCandidateUpload[]`).
    *   It renders the analysis results, including overall recommendations, best job per candidate, and detailed match scores/explanations.
    *   **Crucially**, upon receiving results, it automatically triggers the `saveAnalyzedCandidates` function from the `useLarkCandidates` hook. This function:
        *   Maps the analysis results (insights, scores, strengths, gaps, best match, etc.) to the corresponding fields in the `③Candidates` table.
        *   Uploads the resume file (obtained from the `uploadedCandidates` prop passed down from `App.tsx`) to the 'Resume' attachment field.
        *   Adds new records to the `③Candidates` table for each analyzed candidate.

## Component & Hook Relations

*   **`App.tsx`:** The main application component. Manages the active tab state and orchestrates the flow between steps. It receives callbacks from `Candidates.tsx` to handle the analysis lifecycle and passes necessary data (jobs, analysis results, uploaded candidate details) down to child components.
*   **`JobOpenings.tsx`:** Handles fetching, displaying, selecting, and adding job openings. Interacts with the JDW API and uses `useLarkJobs`.
*   **`Candidates.tsx`:** Handles uploading candidate resumes and initiating the analysis process. Interacts with the RAR API and passes analysis lifecycle events up to `App.tsx`.
*   **`ResultsDisplay.tsx`:** Displays the final analysis results received from `App.tsx`. It uses the `useLarkCandidates` hook *specifically* to save the received results back to Lark Base.
*   **`useLarkJobs.ts`:** Custom hook responsible for interacting with the `①Recruitment Request Management` table in Lark Base (fetching existing jobs, adding new processed jobs).
*   **`useLarkCandidates.ts`:** Custom hook responsible for interacting with the `③Candidates` table in Lark Base (fetching existing candidates - though not currently used for selection, saving analysis results and resume attachments).
*   **`src/types/index.ts`:** Defines the TypeScript interfaces used throughout the application for data structures (Job Openings, Candidates, API payloads, API results).
*   **`src/service/api.ts`:** Contains functions for making requests to the backend JobJigSaw APIs (JDW and RAR).

## Lark Base Integration Details

*   **Table `①Recruitment Request Management`:** Used by `useLarkJobs.ts`. Requires fields like `Position`, `Job Description`, `Active`. Other fields like `City`, `Department`, `Job Duties`, `Required Qualifications`, `Expected Start Date` are used if present and mapped correctly in the hook. New jobs created by the JDW agent are added here.
*   **Table `③Candidates`:** Used by `useLarkCandidates.ts`. Requires fields like `Candidate Name`, `Position`, `Resume` (Attachment). Analysis results are saved to fields like `CV Rate`, `Candidate's Insight`, `Potential Gaps`, `Key Strengths`, `Best Match Position`, `Match Score`, `Match Explanation`.

## API Integration

The frontend interacts with the following backend API endpoints (base URL configured in `src/service/api.ts`):

*   `/jdw/health`: Checks JDW service status (optional).
*   `/jdw/start`: Sends new job titles/descriptions to the JDW agent for processing.
*   `/jdw/status/{trace_id}`: Polls for the status and results of a JDW job.
*   `/rar/health`: Checks RAR service status (optional).
*   `/rar/start`: Sends selected job descriptions and uploaded resume files to the RAR agent for analysis.
*   `/rar/status/{trace_id}`: Polls for the status and results of an RAR job.
