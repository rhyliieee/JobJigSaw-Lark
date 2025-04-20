import { useState } from 'react';
import './App.css';
import { ExistingJobOpenings, ExistingCandidate } from './types/index'
import Footer from './components/CustomFooter'
import JobOpenings from './components/JobOpenings';
import Candidates from './components/Candidates'; // Import Candidates component
import LoadingIndicator from './components/LoadingIndicator'; // Import LoadingIndicator
import { useLarkBase } from './hooks/useLarkJobs';
// import Candidates from './components/Candidates'; // TODO: Create this component
import ResultsDisplay from './components/ResultsDisplay'; // TODO: Create this component

// Define possible tabs
type Tab = 'jobOpenings' | 'candidates' | 'results';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('jobOpenings');
  // State to track if the user has confirmed job opening selections
  // const [authCode, setAuthCode] = useState<string>('');
  // const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [jobOpeningsConfirmed, setJobOpeningsConfirmed] = useState<boolean>(false);
  const [candidatesConfirmed, setCandidatesConfirmed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

   // Store selected items (optional, could just use confirmed flags)
   const [selectedJobs, setSelectedJobs] = useState<ExistingJobOpenings[]>([]);
   const [selectedCandidates, setSelectedCandidates] = useState<ExistingCandidate[]>([]);

  // HOOK TO GET EXISTING JOBS
  const { existingJobOpenings } = useLarkBase();

  // STATE FOR THE RESULTS OF ANALYSIS
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisTraceId, setAnalysisTraceId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null); // Store RAR results
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Handle auth code input change
  // const handleAuthCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setAuthCode(e.target.value);
  // };

  // // Handle initialize button click
  // const handleInitialize = () => {
  //   if (authCode) {
  //     setIsInitialized(true);
  //   }
  // };

  // Callback from Candidates when analysis starts
  const handleAnalysisStart = (traceId: string) => {
      console.log("App: Analysis started with trace ID:", traceId);
      setAnalysisTraceId(traceId);
      setIsAnalyzing(true);
      setAnalysisResults(null); // Clear previous results
      setAnalysisError(null); // Clear previous errors
      setActiveTab('results'); // Switch to results tab
  };

  // Callback from Candidates when analysis completes
  const handleAnalysisComplete = (results: any) => {
      console.log("App: Analysis completed. Results:", results);
      setAnalysisResults(results);
      setIsAnalyzing(false);
      setAnalysisTraceId(null);
      setAnalysisError(null);
      // Keep the user on the results tab
  };

  // Callback from Candidates on analysis error
  const handleAnalysisError = (errorMsg: string) => {
      console.error("App: Analysis error:", errorMsg);
      setAnalysisError(errorMsg);
      setIsAnalyzing(false);
      setAnalysisTraceId(null);
      // Keep the user on the results tab to see the error
  };

  // Adjust Results tab disabling logic if needed (e.g., allow access once started)
  // const isResultsDisabled = !jobOpeningsConfirmed || !candidatesConfirmed; // Original
  // Allow access if analysis is active OR completed with results/error
  const isResultsDisabled = !( (jobOpeningsConfirmed && candidatesConfirmed) || isAnalyzing || analysisResults || analysisError );

  // Callback passed to JobOpenings
  const handleJobOpeningsContinue = (jobs: ExistingJobOpenings[]) => {
    setSelectedJobs(jobs); // Store selected jobs
    setJobOpeningsConfirmed(true);
    setActiveTab('candidates'); // Switch to Candidates tab
  };

 // Callback passed to Candidates component
  const handleCandidatesContinue = (candidates: ExistingCandidate[]) => {
    setSelectedCandidates(candidates); // Store selected candidates
    setCandidatesConfirmed(true);
    setActiveTab('results'); // Switch to Results tab
  };

  // Helper to get button classes based on state
  const getButtonClasses = (tabName: Tab, isActive: boolean, isDisabled: boolean) => {
    let baseClasses = 'px-4 py-2 rounded mr-2 transition-colors duration-150 ease-in-out text-sm font-medium flex-grow sm:flex-grow-0 text-center'; // Added flex-grow for smaller screens
    if (isActive) {
      // Active tab: Accent background, light text
      return `${baseClasses} bg-[#37A533] text-white cursor-pointer`;
    } else if (isDisabled) {
      // Disabled tab: Lighter gray background and text
      return `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`;
    } else {
      // Inactive but enabled tab: Light background, dark text, accent hover
      return `${baseClasses} bg-gray-200 text-[#111613] hover:bg-[#1E651C] hover:text-white`;
    }
  };

  // Determine if Results tab should be disabled
  // const isResultsDisabled = !jobOpeningsConfirmed || !candidatesConfirmed;

  return (

    // Apply base background and text colors. Use max-w-md for the target width, mx-auto for centering.
    <div className="bg-[#F9F9F9] text-[#111613] min-h-screen flex flex-col max-w-md mx-auto p-2">
      {/* <header className="mb-4 text-center"> Reduced margin, centered */}
        {/* <h1 className="text-2xl font-bold text-[#111613]">DBTI:JobJigSaw</h1> Adjusted size */}
      {/* </header> */}

      {/* OBTAIN USER AUTHORIZATION CODE TO INITIALIZE LARK BASE */}
      {/* {!isInitialized ? (
        <div className="space-y-4 mb-6">
          <Label htmlFor="authCode">Enter Your Authorization Code</Label>
          <Input 
            id="authCode"
            type="password" 
            value={authCode}
            onChange={handleAuthCodeChange}
            placeholder="appbcbWCzen6D8dezhoCH2RpMAh"
          /> 
          <Button 
            onClick={handleInitialize}
            disabled={!authCode}
            className="w-full bg-[#37A533] text-white hover:bg-[#1E651C] disabled:bg-gray-300 disabled:text-gray-500"
          >
            Initialize
          </Button>
        </div>
      ) : (
        <>
          
        </>
      )} */}
        {/* Navigation Bar - Use flex for responsiveness */}
        <nav className="mb-4 border-b border-gray-120 pb-2 flex flex-wrap justify-center w-full sm:justify-start"> {/* Centered on small screens */}
              <button
              onClick={() => setActiveTab('jobOpenings')}
              className={getButtonClasses('jobOpenings', activeTab === 'jobOpenings', false)}
              >
              Job Openings
            </button>
            <button
              onClick={() => setActiveTab('candidates')} // Always allow clicking
              // className={getButtonClasses('candidates', activeTab === 'candidates', !jobOpeningsConfirmed)} // Original logic
              className={getButtonClasses('candidates', activeTab === 'candidates', false)} // Always enabled
            >
              Candidates
            </button>
            <button
              onClick={() => !isResultsDisabled && setActiveTab('results')}
              disabled={isResultsDisabled}
              className={getButtonClasses('results', activeTab === 'results', isResultsDisabled)}
              >
              Results
            </button>
          </nav>

          {/* Content Area */}
          <main className="flex-grow">
            {isLoading ? (
              <LoadingIndicator message="Loading..." />
            ) : (
              <>
                {activeTab === 'jobOpenings' && (
                  <JobOpenings 
                  onContinue={handleJobOpeningsContinue} />
                  // authCode={authCode}/>
                )}
                {activeTab === 'candidates' && ( // Render Candidates component
                  <Candidates 
                  onContinue={handleCandidatesContinue} 
                  availableJobs={existingJobOpenings}
                  onAnalysisStart={handleAnalysisStart}
                  onAnalysisComplete={handleAnalysisComplete}
                  onAnalysisError={handleAnalysisError}
                  />
                )}
                {activeTab === 'results' && !isResultsDisabled  && (
                  // Replace with actual Results component - Apply styling
                  // <div className="p-4 border border-gray-300 rounded bg-white shadow-sm">
                    // {/* <h2 className="text-xl font-semibold mb-2 text-[#111613]">Results</h2> */}
                    // {/* <p className="text-sm text-gray-700">Results display component will go here.</p> */}
                    // {/* <h2 className="text-xl font-semibold mb-2 text-[#111613]">Results</h2>
                    // <p className="text-sm text-gray-700">Results display component will go here.</p>
                    // <p className="text-xs mt-2">Selected Jobs: {selectedJobs.length}</p>
                    // <p className="text-xs">Selected Candidates: {selectedCandidates.length}</p> */}
                    // {/* TODO: Add Results component */}
                  // {/* </div> */}
                  <ResultsDisplay 
                    isLoading={isAnalyzing}
                    results={analysisResults}
                    error={analysisError}
                    traceId={analysisTraceId}
                />
                )}
              </>
            )}
          </main>
        <Footer />
      </div>
    );
}

export default App;