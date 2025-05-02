import { Button } from "@/components/ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import {
Accordion,
AccordionContent,
AccordionItem,
AccordionTrigger,
} from "@/components/ui/accordion";  
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from 'sonner';
import React, {useState, useEffect, useCallback} from 'react';
import { 
    // FileWithContent, 
    ExistingJobOpenings, 
    JobDescription, 
    // JDWAPIPayload,
    AddNewJobOpenings
} from '@/types/index';
// import FileUploader from "./FileUploader";
import LoadingIndicator from "./LoadingIndicator";
import {useLarkBase} from '../hooks/useLarkJobs';
import {
    jdwAPIHealthCheck,
    startJDWriter,
    checkJDWStatus
} from '../service/api';

interface JobOpeningsProps {
    onContinue: (selectedJobs: ExistingJobOpenings[]) => void;
}

// CONSTANTS TO HANDLE POLLING
const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_ATTEMPTS = 15; // Stop polling after 5 minutes (100 * 3s) to prevent infinite loops

const JobOpenings: React.FC<JobOpeningsProps> = ({ onContinue}) => {
    // const [files, setFiles] = useState<FileWithContent[]>([]);
    const [existingJobs, setExistingJobs] = useState<ExistingJobOpenings[]>([
        { recordId: "1", jobTitle: "Backend R&D Engineer", jobDescription: "Backend R&D Engineer Position in Tokyo. The tentative start date for the role is 2023/08/24. This full-time opportunity belongs to our R&D department. Job duties include developing and maintaining backend systems and infrastructure for the R&D department, as well as collaborating with cross-functional teams to optimize and enhance product performance. The qualified candidate should be proficient in Java and Python, familiar with infrastructure design, and have strong problem-solving skills. We are offering a competitive salary complemented with health insurance and a retirement plan." },
        { recordId: "2", jobTitle: "Product Manager", jobDescription: "Define and drive product strategy." },
        { recordId: "3", jobTitle: "Customer Success Manager", jobDescription: "Ensure customer satisfaction and success." },
        { recordId: "4", jobTitle: "Frontend Engineer", jobDescription: "Build user interfaces and web experiences." },
    ]);

    // STATE TO STORE UI INTERACTION
    const [activeTab, setActiveTab] = useState<string>("selectOpenings");

    // STATE FOR NEWLY ADDED JOBS
    const [newJobTitle, setNewJobTitle] = useState<string>("");
    const [newJobDescription, setNewJobDescription] = useState<string>("");
    const [addedJobs, setAddedJobs] = useState<AddNewJobOpenings[]>([]);

    // STATE TO STORE INTERACTION FROM LARK
    const [currentTableName, setCurrentTableName] = useState<string>("");
    

    // STATE FOR LOADING INDICATORS
    const [_isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // Error message to display

    // STATE FOR API INTERACTION
    const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pollingAttempts, setPollingAttempts] = useState(0);
    const [jdwResults, setJDWResults] = useState<JobDescription[]>([]);

    const [checkedOpenings, setCheckedOpenings] = useState<string[]>([]);
    // const [writeResults, setWriteResults] = useState<JobDescription[]>([]);
    const [isSelectAllChecked, setIsSelectAllChecked] = useState<boolean>(false);
    const [_jobProgress, setJobProgress] = useState<Record<string, string>>({}); // Progress details per file

    // const extractAppToken = (url: string) => {
    //     // Using regex
    //     const regex = /\/base\/([^\?]+)/;
    //     const match = url.match(regex);

    //     if (match && match[1]) {
    //         return match[1];
    //     }
    // }

    // HANDLER FOR SETTING ACTIVE TABS
    const handleSwitchTab = (tabValue: string) => {
        setActiveTab(tabValue);
    };

    // INITIALIZE LARK HOOK
    const {table: tableName, loading: larkLoading, error: larkError, existingJobOpenings, updateRecords } = useLarkBase();

    // SET EXISTING JOB OPENINGS
    useEffect(() => {
        const initializeJobOpenings = async () => {
            setIsLoading(larkLoading);
            if (existingJobOpenings && existingJobOpenings.length > 0) {
                setExistingJobs(existingJobOpenings);
                try {
                    const curTableName = await tableName?.getName();
                    // Handle potential undefined value
                    setCurrentTableName(curTableName || '');
                } catch (error) {
                    console.error('Error getting table name:', error);
                    setCurrentTableName('');
                }
            }
        };

        initializeJobOpenings();
    }, [existingJobOpenings, larkLoading, tableName]);

    // HANDLE CHOSEN JOB OPENINGS
    // const handleCheckboxChange = useCallback((value: string) => {
    //     setCheckedOpenings((prevCheckedItems) =>
    //         prevCheckedItems.includes(value)
    //             ? prevCheckedItems.filter((item) => item !== value)
    //             : [...prevCheckedItems, value]
    //     );
    // }, []);
    const handleCheckboxChange = useCallback((jobTitle: string) => {
        let newCheckedItems: string[];
        setCheckedOpenings((prevCheckedItems) => {
            if (prevCheckedItems.includes(jobTitle)) {
                newCheckedItems = prevCheckedItems.filter((item) => item !== jobTitle);
            } else {
                newCheckedItems = [...prevCheckedItems, jobTitle];
            }

            // Update Select All state based on individual changes
            if (newCheckedItems.length === existingJobs.length && existingJobs.length > 0) {
                setIsSelectAllChecked(true);
            } else {
                setIsSelectAllChecked(false);
            }
            return newCheckedItems;
        });
    }, [existingJobs.length]); 

    // HANDLE SELECT ALL CHECKBOX CHANGE
    const handleSelectAllChange = useCallback((checked: boolean | 'indeterminate') => {
        if (checked === true) {
            const allJobTitles = existingJobs.map(job => job.jobTitle);
            setCheckedOpenings(allJobTitles);
            setIsSelectAllChecked(true);
        } else {
            setCheckedOpenings([]);
            setIsSelectAllChecked(false);
        }
    }, [existingJobs]);

    // GET JOB DETAILS BASED ON CHECKEDOPENINGS
    const getSelectedJobs = useCallback(() => {
        return existingJobs.filter(job => checkedOpenings.includes(job.jobTitle));
    }, [checkedOpenings, existingJobs]);
    // GET CURRENTLY SELECTED JOBS
    const selectedJobs = getSelectedJobs();

      /**
     * Handles files loaded from the FileUploader component.
     * Resets state for a new job.
     */
    // const handleFilesLoaded = useCallback((loadedFiles: FileWithContent[]) => {
    //         console.log(`Files loaded: ${loadedFiles.length}`);
    //         setFiles(loadedFiles);
    //         // Reset state for a new operation
    //         setIsSuccess(false);
    //         setErrorMessage(null);
    //         setWriteResults([]);
    //         setCurrentTraceId(null);
    //         setJobProgress({});
    //         setPollingAttempts(0);
    //     }, []);

    // HELPER FUNCTION TO CHECK IF NEWLY ADDED JOBS ALREADY EXISTS
    const isDuplicateTitle = useCallback((title: string): boolean => {
        const existingDuplicate = existingJobs.some(
            job => job.jobTitle.toLowerCase() === title.toLowerCase()
        );
        
        const newDuplicate = addedJobs.some(
            job => job.jobTitle.toLowerCase() === title.toLowerCase()
        );
        
        return existingDuplicate || newDuplicate;
    }, [existingJobs, addedJobs]);

    // Handler for the 'Add Job' button click on the second tab
    const handleAddJobClick = () => {
        // Basic validation: ensure both fields are filled
        if (newJobTitle.trim() && newJobDescription.trim()) {

            // CHECK IF NEWJOBTITLE ALREADY EXISTS IN THE CURRENT TABLE
            if (isDuplicateTitle(newJobTitle.trim())) {
                setIsSuccess(false);
                toast.error("Duplicate job title detected", {
                    description: `A job with the title "${newJobTitle.trim()}" already exists.`
                });
                return;
            }

            const newJob: AddNewJobOpenings = {
                jobTitle: newJobTitle.trim(),
                jobDescription: newJobDescription.trim(),
            };
            setAddedJobs(prev => [...prev, newJob]); // Add the new job to the local list
            // Reset input fields
            setNewJobTitle("");
            setNewJobDescription("");
            // Clear previous status messages
            setIsSuccess(false);
            setErrorMessage(null);
        } else {
            // Set an error message if validation fails
            setErrorMessage("Please provide both a job title and description.");
            setIsSuccess(false); // Ensure success message is cleared
        }
    };

    /**
     * Polls the API for the status of the job associated with the given trace ID.
     */
    const pollJobStatus = useCallback(async (tid: string) => {
        if (!tid) {
            console.error("Polling attempted without a trace ID.");
            toast.error("Cannot Start JDW Agent without a Trace ID");
            setErrorMessage("Cannot check job status: Missing Trace ID.");
            setIsProcessing(false); // Stop processing state
            return;
        }

        console.log(`Polling status for trace ID: ${tid}, Attempt: ${pollingAttempts + 1}`);

        // Check if max polling attempts exceeded
        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            console.warn(`Max polling attempts reached for trace ID: ${tid}`);
            setErrorMessage(`Job status check timed out after ${MAX_POLLING_ATTEMPTS} attempts. Please check the API status or try again later.`);
            setIsProcessing(false);
            setCurrentTraceId(null); // Clear trace ID as the job is considered stalled
            setPollingAttempts(0); // Reset attempts
            toast.warning("Max polling attempts reached");
            return;
        }

        try {
        const jdwStatusResponse = await checkJDWStatus(tid);
        setJobProgress(jdwStatusResponse.progress || {}); // Update progress state

        console.log(`Job Status: ${jdwStatusResponse.status}`);

        switch (jdwStatusResponse.status) {
            case 'completed':
            console.log("Job completed successfully. Results:", jdwStatusResponse.results.descriptions);
            setJDWResults(jdwStatusResponse.results.job_descriptions); // Store results
            setIsSuccess(true);
            setIsProcessing(false);
            setCurrentTraceId(null); 
            setPollingAttempts(0); 

            // console.log("Job results:", jobResults);

            // --- Update Lark Base ---
            if (jdwStatusResponse.results && jdwStatusResponse.results.job_descriptions.length > 0) {
                try {
                console.log("Attempting to update Lark Base...");
                toast.info(`Updating ${currentTableName} Table in Current Lark Base`);
                await updateRecords(jdwStatusResponse.results.job_descriptions);
                console.log("Lark Base updated successfully.");
                toast.success(`${currentTableName} Table Successfully Updated`);
                // Optionally add a specific success message for Lark update
                } catch (larkUpdateError: any) {
                console.error("Failed to update Lark Base:", larkUpdateError);
                // Keep the overall success state, but show a specific error for Lark
                setErrorMessage(`Job descriptions processed, but failed to update Lark Base: ${larkUpdateError.message}`);
                }
            } else {
                console.log("Job completed, but no results to update in Lark Base.");
                toast.warning("JDW Agent Completed, but no results to update in Lark Base.");
                // Handle case with no results if needed
            }
            break;

            case 'failed':
            console.error(`Job failed. Trace ID: ${tid}. Error: ${jdwStatusResponse.error}`);
            toast.error(`JDW Agent Failed to Write New Job Descriptions for Trace ID: ${tid}`);
            setErrorMessage(`Job processing failed: ${jdwStatusResponse.error || 'Unknown error'}. Trace ID: ${tid}`);
            setIsProcessing(false);
            setCurrentTraceId(null); // Clear trace ID
            setPollingAttempts(0); // Reset attempts
            break;

            case 'running':
            case 'pending':
            // Job is still in progress, schedule the next poll
            setPollingAttempts(prev => prev + 1); // Increment attempts
            setTimeout(() => pollJobStatus(tid), POLLING_INTERVAL_MS);
            break;

            default:
            // Unexpected status
            console.warn(`Received unexpected job status: ${jdwStatusResponse.status}`);
            toast.warning(`Received unexpected job status: ${jdwStatusResponse.status}`);
            // Continue polling for a few more times in case it's transient
            setPollingAttempts(prev => prev + 1);
            setTimeout(() => pollJobStatus(tid), POLLING_INTERVAL_MS);
            break;
        }
        } catch (error: any) {
        console.error(`Error during polling for trace ID ${tid}:`, error);
        // Decide if polling should stop or continue based on the error
        // For now, stop polling on error to prevent infinite loops on persistent issues
        setErrorMessage(`Error checking job status: ${error.message}. Polling stopped.`);
        setIsProcessing(false);
        setCurrentTraceId(null); // Clear trace ID
        setPollingAttempts(0); // Reset attempts
        }
    }, [pollingAttempts, updateRecords]); // Include dependencies


    /* 
    Handler for the 'Process Added Job(s)' button click 
    */
    const handleJDWAPIClick = async () => {

        // Prevent submission if no jobs have been added
        if (addedJobs.length === 0) {
            setErrorMessage("No new jobs have been added to process.");
            return;
        }

        // Set loading states and clear previous status messages
        setIsSubmitting(true);
        setIsLoading(false);
        setIsProcessing(false); // Ensure processing is false initially
        setIsSuccess(false);
        setErrorMessage(null);
        setJDWResults([]); // Clear previous results
        setJobProgress({}); // Clear previous progress
        setPollingAttempts(0); // Reset polling attempts
        setCurrentTraceId(null); // Clear previous trace ID

        console.log(`---SENDING ${addedJobs.length} NEW JOBS TO JDW AGENT---`); 

        try {
            // 1. INITIATE JDW API HEALTH CHECK (Optional but good practice)
            console.log("Performing API health check...");
            jdwAPIHealthCheck(); // Assuming this throws on failure
            console.log("API health check successful.");

            // 2. CALL JDW API TO INITIATE THE PROCESS
            toast.info("Initiating Job Description Writer...", {
                description: `Sending ${addedJobs.length} job(s) to process.`
            });

            const initialResponse = await startJDWriter(addedJobs); // Pass structured data
            console.log(`Job initiated successfully. Trace ID: ${initialResponse.trace_id}`);
            toast.success("Job processing initiated.", { description: `Trace ID: ${initialResponse.trace_id}` });

            // --- Start Processing Phase ---
            setIsSubmitting(false); // Initial submission done
            setIsProcessing(true); // NOW set processing to true
            setCurrentTraceId(initialResponse.trace_id);
            setPollingAttempts(0); // Ensure attempts are reset before first poll

            // START POLLING FOR JDW API STATUS
            // Use a small initial delay before the first poll
            setTimeout(() => pollJobStatus(initialResponse.trace_id), 500); // e.g., 0.5 seconds delay

        } catch (error: any) {
            // --- Error Handling ---
            console.error("API Submission/Health Check Error:", error);
            toast.error("Failed to initiate job processing.", { description: error.message || "Unknown error" });
            setErrorMessage(error.message || "An unknown error occurred during submission.");
            setIsSubmitting(false); // Ensure submitting is false on error
            setIsProcessing(false); // Ensure processing is false on error
            setIsSuccess(false);
        } 
    };

    // Handler for the continue button click
    const handleContinueClick = () => {
        if (checkedOpenings.length > 0) {
            onContinue(selectedJobs); // Call the callback passed from App.tsx
        } else {
             toast.warning("No job openings selected", { description: "Please select at least one job opening to continue." });
        }
    };

    if (larkLoading) {
        return <LoadingIndicator message="Loading Job Openings from Lark Base..." />;
    }

    // Display error if Lark Base initialization failed
    if (larkError) {
        return (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-300 font-quicksand">
            <p className="font-semibold">Lark Base Initialization Error:</p>
            <p>{larkError}</p>
            <p className="mt-2 text-sm">Please ensure the Lark Base connection is configured correctly and refresh the page.</p>
        </div>
        );
    }

    return (
        <Tabs defaultValue="selectOpenings" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <Toaster richColors position="top-right" />
            <TabsList className="grid w-full grid-cols-2 bg-gray-200 text-[#111613]">
            {/* <TabsList className="w-full bg-gray-200 text-[#111613]"> */}
                <TabsTrigger value="selectOpenings" className="data-[state=active]:bg-white data-[state=active]:text-[#37A533] data-[state=active]:shadow-sm rounded-md cursor-pointer">
                Choose Openings
                </TabsTrigger>
                <TabsTrigger value="addOpenings" id="addOpenings" className="data-[state=active]:bg-white data-[state=active]:text-[#37A533] data-[state=active]:shadow-sm rounded-md cursor-pointer">
                    Add Openings
                </TabsTrigger>
            </TabsList>
            
            {/* Tab 1: Select Existing Openings */}
            <TabsContent value="selectOpenings">
                <Card className="bg-white border border-gray-300 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-[#111613]">Choose Job Openings</CardTitle>
                        <CardDescription className="text-gray-600">Choose 1 or more Job Openings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                    {existingJobOpenings.length > 0 ? (
                    <div className="space-y-2">
                        
                        {/* Select All Checkbox */}
                        <div className="flex items-center space-x-2 pb-2 border-b border-gray-200 mb-2">
                                <Checkbox
                                    id="select-all-jobs"
                                    checked={isSelectAllChecked}
                                    onCheckedChange={handleSelectAllChange}
                                    disabled={existingJobs.length === 0} // Disable if no jobs
                                    className="data-[state=checked]:bg-[#37A533] data-[state=checked]:border-[#37A533] focus:ring-[#37A533]/50 cursor-pointer"
                                />
                                <Label htmlFor="select-all-jobs" className="text-[#111613] font-medium">
                                    Select All ({existingJobs.length})
                                </Label>
                            </div>

                            {/* Individual Job Checkboxes */}
                            {existingJobs.map((job) => (
                                <div key={job.jobTitle} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`job-opening-${job.jobTitle}`}
                                        checked={checkedOpenings.includes(job.jobTitle)}
                                        onCheckedChange={() => handleCheckboxChange(job.jobTitle)}
                                        className="data-[state=checked]:bg-[#37A533] data-[state=checked]:border-[#37A533] focus:ring-[#37A533]/50 cursor-pointer"
                                    />
                                    <Label htmlFor={`job-opening-${job.jobTitle}`} className="text-[#111613]">
                                        {job.jobTitle}
                                    </Label>
                                </div>
                            ))}

                            {/* {existingJobs.map((job) => (
                                <div key={job.jobTitle} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`job-opening-${job.jobTitle}`}
                                        checked={checkedOpenings.includes(job.jobTitle)}
                                        onCheckedChange={() => handleCheckboxChange(job.jobTitle)}
                                        className="data-[state=checked]:bg-[#37A533] data-[state=checked]:border-[#37A533] focus:ring-[#37A533]/50 cursor-pointer"
                                    />
                                    <Label htmlFor={`job-opening-${job.jobTitle}`} className="text-[#111613]">
                                        {job.jobTitle}
                                    </Label>
                                </div>
                            ))} */}
                            {/* Accordion to show details of *selected* existing jobs */}
                            {selectedJobs.length > 0 && (
                                <Accordion type="single" collapsible className="w-full mt-4 border-t border-gray-200 pt-4"> {/* Added padding top */}
                                    <h4 className="font-semibold text-md text-[#111613] mb-2">Selected Job Details:</h4>
                                    {selectedJobs.map((job) => (
                                        <AccordionItem key={`selected-${job.recordId}`} value={job.jobTitle} className="border-b border-gray-200 last:border-b-0"> {/* Remove last border */}
                                            <AccordionTrigger className="text-[#111613] hover:no-underline py-3 text-left font-medium cursor-pointer"> {/* Adjusted font weight */}
                                                {job.jobTitle}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-gray-700 pb-3 text-left text-sm min-h-[200px] max-h-[250px] resize-none overflow-y-auto rounded-lg p-2 sm:p-3 md:p-4"> {/* Adjusted font size */}
                                                {job.jobDescription}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 space-y-4">
                            <div className="text-gray-500">
                                <svg 
                                    className="mx-auto h-12 w-12" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                                    />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <p className="text-gray-700 font-medium">No job openings available</p>
                                <p className="text-gray-500 text-sm">Please add new job openings using the Add Openings tab.</p>
                            </div>
                            <Button
                                onClick={() => handleSwitchTab("addOpenings")}
                                className="bg-[#37A533] text-white hover:bg-[#1E651C] mt-4 cursor-pointer"
                            >
                                Go to Add Openings
                            </Button>
                        </div>
                    )}
                    </CardContent>
                    <CardFooter>
                        {/* Continue button for Tab 1 */}
                        <Button 
                            onClick={handleContinueClick} 
                            disabled={checkedOpenings.length === 0}
                            className="bg-[#37A533] text-white hover:bg-[#1E651C] disabled:bg-gray-300 disabled:text-gray-500 rounded-md px-4 py-2 w-full cursor-pointer" 
                        >
                            Continue with Selected ({checkedOpenings.length})
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            {/* Tab 2: Add New Openings */}
            {/* <TabsContent value="addOpenings">
                <Card className="bg-white border border-gray-300 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-[#111613]">Add New Job Openings</CardTitle>
                        <CardDescription className="text-gray-600">
                            Upload single or multiple .txt files containing descriptions of new Job Openings                    
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        File Uploader Section
                        {isLoading ? (
                            <LoadingIndicator message="Processing files..." />
                        ) : (
                            <>
                                {errorMessage && <p className="text-red-600 text-sm">{errorMessage}</p>}
                                <div className="space-y-2">
                                    <Label htmlFor="fileUploader" className="text-[#111613]">Upload Files Below</Label>
                                    Pass accent color to FileUploader if needed, or style FileUploader internally
                                    <FileUploader onFilesLoaded={handleFilesLoaded}/>
                                </div>
                                Display results if available
                                {writeResults.length > 0 && (
                                    <div className="mt-4 p-2 border border-gray-200 rounded">
                                        <h4 className="font-semibold text-sm text-[#111613]">Processed Descriptions:</h4>
                                        Render results here
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </TabsContent> */}
            <TabsContent value="addOpenings" className="mt-4" id="addOpenings"> {/* Add margin top */}
                <Card className="bg-white border border-gray-300 shadow-sm rounded-lg"> {/* Rounded card */}
                    <CardHeader>
                        <CardTitle className="text-[#111613]">Add New Job Openings</CardTitle>
                        <CardDescription className="text-gray-600">
                            Enter the details for a new job opening below and click "Add Job". You can add multiple jobs before processing them.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Input Fields for New Job */}
                        <div className="space-y-2">
                            <Label htmlFor="newJobTitle" className="text-[#111613] font-medium">Job Title</Label>
                            <Input
                                id="newJobTitle"
                                placeholder="e.g., Senior Frontend Developer"
                                value={newJobTitle}
                                onChange={(e) => setNewJobTitle(e.target.value)}
                                className="border-gray-300 focus:border-[#37A533] focus:ring-[#37A533]/50 rounded-md" // Rounded input
                                disabled={isSubmitting} // Disable input while API call is in progress
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newJobDescription" className="text-[#111613] font-medium">Job Description</Label>
                            <Textarea
                                id="newJobDescription"
                                placeholder="Enter the full job description here..."
                                value={newJobDescription}
                                onChange={(e) => setNewJobDescription(e.target.value)}
                                className="border-gray-300 focus:border-[#37A533] focus:ring-[#37A533]/50 rounded-md min-h-[120px] max-h-[150px] resize-none overflow-y-auto" // Increased min-height
                                disabled={isSubmitting} // Disable input while API call is in progress
                            />
                        </div>

                        {/* Add Job Button */}
                        <Button
                            onClick={handleAddJobClick}
                            disabled={!newJobTitle.trim() || !newJobDescription.trim() || isSubmitting} // Disable if inputs empty or submitting
                            className="bg-[#37A533] text-white hover:bg-[#1E651C] disabled:bg-gray-300 disabled:text-gray-500 w-full sm:w-auto rounded-md px-4 py-2 cursor-pointer" // Responsive width, adjusted padding/rounding
                        >
                            Add Job to List
                        </Button>

                        {/* Display Inline Error Message (optional, as toasts are primary) */}
                        {errorMessage && !isProcessing && ( // Show only if not processing (to avoid clutter)
                            <p className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md">
                                {errorMessage}
                            </p>
                        )}

                        {/* Display Final Success Message (optional, as toasts are primary) */}
                        {isSuccess && !isProcessing && ( // Show only after processing completes
                            <p className="text-green-700 text-sm p-3 bg-green-50 border border-green-200 rounded-md">
                                Job descriptions processed and updated successfully!
                            </p>
                        )}
                        
                        {/* Display Error/Success Messages */}
                         {/* {errorMessage && 
                            <p 
                            className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md">
                                {errorMessage}
                            </p>
                            && toast.error(errorMessage)}
                            
                         {isSuccess && 
                            <p 
                                className="text-green-700 text-sm p-3 bg-green-50 border border-green-200 rounded-md">
                                Jobs processed successfully!
                            </p> && 
                            toast.success('Jobs processed successfully!')} */}

                        {/* Accordion for Newly Added Jobs (visible only if jobs are added) */}
                        {addedJobs.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <h4 className="font-semibold text-md text-left text-[#111613] mb-2">Jobs Added Ready to Process</h4>
                                <Accordion type="single" collapsible className="w-full">
                                    {addedJobs.map((job, index) => ( // Added index for clarity, though id is used for key
                                        <AccordionItem key={`${job.jobTitle}-${index}`} value={`${job.jobTitle}-${index}`} className="border-b border-gray-200 last:border-b-0"> {/* Remove last border */}
                                            <AccordionTrigger className="text-[#111613] hover:no-underline py-3 text-left font-medium"> {/* Adjusted font weight */}
                                                {job.jobTitle}
                                            </AccordionTrigger>
                                            <AccordionContent contentEditable className="text-gray-700 pb-3 text-left text-sm whitespace-pre-wrap min-h-[200px] max-h-[250px] resize-none overflow-y-auto border-gray-700 border-1 md:border-t-2 border-r-4 rounded-lg p-2 sm:p-3 md:p-4"> {/* Preserve whitespace, adjusted font size */}
                                                {job.jobDescription}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        )}

                         {/* Loading/Processing Indicator */}
                            {isSubmitting && (
                                <div className="mt-4 flex items-center justify-center space-x-2 text-gray-600">
                                    <LoadingIndicator message="Initiating Job Description Writer..." />
                                </div>
                            )}
                            {isProcessing && ( // Show specific message during polling
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
                                    <LoadingIndicator message={`Processing... (Trace ID: ${currentTraceId})`} />
                                    {/* Optionally display detailed progress if available */}
                                    {/* {Object.entries(jobProgress).map(([key, value]) => (
                                        <p key={key} className="text-xs mt-1">{`${key}: ${value}`}</p>
                                    ))} */}
                                </div>
                            )}

                            {/* Display Final Results (Optional) */}
                            {jdwResults.length > 0 && isSuccess && (
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <h4 className="font-semibold text-md text-left text-[#111613] mb-2">Processed Job Descriptions:</h4>
                                    <Accordion type="single" collapsible className="w-full">
                                        {jdwResults.map((job, index) => (
                                            <AccordionItem key={`result-${job.job_title}-${index}`} value={`result-${job.job_title}-${index}`} className="border-b border-gray-200 last:border-b-0">
                                                <AccordionTrigger className="text-[#111613] hover:no-underline py-3 text-left font-medium">
                                                    {job.job_title}
                                                </AccordionTrigger>
                                                <AccordionContent className="text-gray-700 pb-3 text-left text-sm whitespace-pre-wrap max-h-[250px] overflow-y-auto rounded-lg p-2 sm:p-3 md:p-4">
                                                    {job.finalized_job_description}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            )}

                    </CardContent>
                    <CardFooter className="border-t border-gray-200 pt-4"> {/* Add border and padding */}
                         {/* Process Jobs Button */}
                        <Button
                            onClick={handleJDWAPIClick}
                            disabled={addedJobs.length === 0 || isSubmitting} // Disable if no jobs or submitting
                            className="bg-[#37A533] text-white hover:bg-[#1E651C] disabled:bg-gray-300 disabled:text-gray-500 rounded-md px-4 py-2 w-full sm:w-auto" // Adjusted padding/rounding
                        >
                            {/* Dynamic button text based on state */}
                            {isSubmitting ? 'Processing...' : `Process ${addedJobs.length} Added Job(s)`}
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
    );
};

export default JobOpenings;