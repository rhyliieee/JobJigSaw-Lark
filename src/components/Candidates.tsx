import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
// import {
//     Card,
//     CardContent,
//     CardDescription,
//     CardFooter,
//     CardHeader,
//     CardTitle,
// } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from 'sonner';
import { ExistingCandidate, ExistingJobOpenings, BulkCandidateUpload, MultiJobComparisonState } from '@/types/index';
import LoadingIndicator from "./LoadingIndicator";
import { useLarkCandidates } from '../hooks/useLarkCandidates'; 
import { startResumeAnalysis, checkRARStatus } from '../service/api';


// CONSTANTS FOR POLLING RAR STATUS
const RAR_POLLING_INTERVAL_MS = 3000; // 3 seconds
const RAR_MAX_POLLING_ATTEMPTS = 100; // Adjust as needed (e.g., 100 * 3s = 5 minutes)

// interface CandidatesProps {
//     onContinue: (selectedCandidates: ExistingCandidate[]) => void;
//     availableJobs: ExistingJobOpenings[];
// }

interface CandidatesProps {
    onContinue: (selectedCandidates: ExistingCandidate[]) => void;
    availableJobs: ExistingJobOpenings[];
    // Add new callbacks for RAR processing
    onAnalysisStart: (traceId: string, positions: string[]) => void;
    onAnalysisComplete: (results: MultiJobComparisonState, uploads: BulkCandidateUpload[]) => void; // Use 'any' for now, refine later
    onAnalysisError: (errorMsg: string) => void;
}

const Candidates: React.FC<CandidatesProps> = ({ 
    // onContinue, 
    availableJobs, 
    onAnalysisStart,
    onAnalysisComplete,
    onAnalysisError
  }) => {
    const [activeTab, setActiveTab] = useState<string>("selectCandidates");
    // const [checkedCandidates, setCheckedCandidates] = useState<string[]>([]); // Store recordIds

    // STATE FOR ADDING NEW CANDIDATES
    // const [newCandidateName, setNewCandidateName] = useState<string>("");
    // const [newCandidatePosition, setNewCandidatePosition] = useState<string>("");
    // const [newCandidateResumeFile, setNewCandidateResumeFile] = useState<File | null>(null);
    // const [addedCandidates, setAddedCandidates] = useState<AddNewCandidate[]>([]); // Store locally added candidates

    // STATE FOR BULK CANDIDATE UPLOAD
    const [bulkPosition, setBulkPosition] = useState<string>("");
    const [bulkResumeFiles, setBulkResumeFiles] = useState<File[]>([]);
    const [bulkUploads, setBulkUploads] = useState<BulkCandidateUpload[]>([]);

    // STATE FOR RAR API INTERACTION
    const [rarTraceId, setRarTraceId] = useState<string | null>(null);
    const [isProcessingRAR, setIsProcessingRAR] = useState(false);
    const [rarPollingAttempts, setRarPollingAttempts] = useState(0);
    const [rarProgress, setRarProgress] = useState<Record<string, string>>({});

    // State for UI feedback
    const [isSubmitting, setIsSubmitting] = useState(false); // For potential future API calls
    const [, setErrorMessage] = useState<string | null>(null);

    // Use the dedicated hook for candidates
    const { loading: larkLoading, error: larkError } = useLarkCandidates();

    // Handle checkbox changes
    // const handleCheckboxChange = useCallback((recordId: string) => {
    //     setCheckedCandidates((prevChecked) =>
    //         prevChecked.includes(recordId)
    //             ? prevChecked.filter((id) => id !== recordId)
    //             : [...prevChecked, recordId]
    //     );
    // }, []);

    // Get selected candidate details
    // const getSelectedCandidates = useCallback(() => {
    //     return existingCandidates.filter(candidate => checkedCandidates.includes(candidate.recordId || ''));
    // }, [checkedCandidates, existingCandidates]);

    // const selectedCandidates = getSelectedCandidates();

    // Handle file input change
    // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     if (event.target.files && event.target.files.length > 0) {
    //         const file = event.target.files[0];
    //         if (file.type === 'application/pdf') {
    //             setNewCandidateResumeFile(file);
    //             setErrorMessage(null); // Clear error if a valid file is selected
    //         } else {
    //             setNewCandidateResumeFile(null);
    //             setErrorMessage("Please select a PDF file for the resume.");
    //             toast.error("Invalid file type", { description: "Only PDF files are allowed for resumes." });
    //         }
    //     } else {
    //         setNewCandidateResumeFile(null);
    //     }
    // };

    // HANDLER BULK FILE SELECTION
    const handleBulkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
            
            if (pdfFiles.length !== files.length) {
                toast.error("Invalid files detected", { 
                    description: "Only PDF files are allowed. Non-PDF files were filtered out." 
                });
            }

            setBulkResumeFiles(pdfFiles);
        }
    };

    // HANDLE BULK UPLOAD PREPARATION
    const handlePrepareBulkUpload = () => {
        if (!bulkPosition || bulkResumeFiles.length === 0) {
            toast.error("Missing information", { 
                description: "Please select a position and upload PDF resumes." 
            });
            return;
        }

        const newBulkUpload: BulkCandidateUpload = {
            position: bulkPosition,
            resumeFile: bulkResumeFiles,
            status: 'pending'
        };

        setBulkUploads(prev => [...prev, newBulkUpload]);
        setBulkPosition("");
        setBulkResumeFiles([]);

        // Clear file input
        const fileInput = document.getElementById('bulkResumeFiles') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        toast.success("Bulk upload prepared", { 
            description: `Added ${bulkResumeFiles.length} resumes for ${bulkPosition} position` 
        });
    };


    // Helper to check if candidate already exist in lark
    // const isDuplicateName = useCallback((name: string): boolean => {
    //     // Check in existing candidates
    //     const existingDuplicate = existingCandidates.some(
    //         candidate => candidate.candidateName.toLowerCase() === name.toLowerCase()
    //     );
        
    //     // Check in locally added candidates
    //     const newDuplicate = addedCandidates.some(
    //         candidate => candidate.candidateName.toLowerCase() === name.toLowerCase()
    //     );
        
    //     return existingDuplicate || newDuplicate;
    // }, [existingCandidates, addedCandidates]);

    // Handle adding a new candidate to the local list
    // const handleAddCandidateClick = () => {
    //     const trimmedName = newCandidateName.trim();
    //     // const trimmedPosition = newCandidatePosition.trim();
    
    //     // First check for empty fields
    //     if (!trimmedName || !newCandidatePosition || !newCandidateResumeFile) {
    //         let errorMsg = "Please provide Name, Position, and a PDF Resume.";
    //         if (!newCandidatePosition) errorMsg = "Please select a position from the dropdown.";
    //         if (!newCandidateResumeFile) errorMsg = "Please select a PDF resume file.";
    //         setErrorMessage(errorMsg);
    //         toast.error("Missing information", { description: errorMsg });
    //         return;
    //     }
    
    //     // Check for duplicate name
    //     if (isDuplicateName(trimmedName)) {
    //         // setErrorMessage(`A candidate named "${trimmedName}" already exists.`);
    //         toast.error("Duplicate candidate", { 
    //             description: `A candidate named "${trimmedName}" already exists.`,
    //             duration: 5000 // Show for 5 seconds
    //         });
    //         return;
    //     }
    
    //     // If no duplicates, proceed with adding the candidate
    //     const newCandidate: AddNewCandidate = {
    //         candidateName: trimmedName,
    //         position: newCandidatePosition,
    //         resumeFile: newCandidateResumeFile,
    //     };
        
    //     setAddedCandidates(prev => [...prev, newCandidate]);
        
    //     // Reset form
    //     setNewCandidateName("");
    //     setNewCandidatePosition("");
    //     setNewCandidateResumeFile(null);
        
    //     // Clear file input
    //     const fileInput = document.getElementById('resumeFile') as HTMLInputElement;
    //     if (fileInput) fileInput.value = '';
        
    //     setErrorMessage(null);
    //     toast.success("Candidate added to list", { 
    //         description: `Added ${newCandidate.candidateName}` 
    //     });
    // };

    // HANDLE SAVING ADDED CANDIDATE TO LARK
    // // Handle saving candidate uploads
    // const handleSaveAddedCandidates = async () => {
    //     setIsSubmitting(true);
    //     try {
    //         // TODO: Implement the actual save to Lark logic here
    //         const candidateToAdd = addedCandidates ? bulkUploads : ;
    //         if (!String(candidateToAdd)) return;
    //         saveAddedCandidates(candidateToAdd);

    //         toast.success("Bulk upload completed", { 
    //             description: "All candidates have been saved to Lark Base." 
    //         });
    //         setBulkUploads([]); // Clear the uploads after successful save
    //     } catch (error) {
    //         toast.error("Upload failed", { 
    //             description: "Failed to save candidates to Lark Base. Please try again." 
    //         });
    //     } finally {
    //         setIsSubmitting(false);
    //     }
    // };

    // HANDLE

    // Handle the continue button click
    // const handleContinueClick = () => {
    //     if (checkedCandidates.length > 0) {
    //         onContinue(selectedCandidates); // Pass the details of selected candidates
    //     } else {
    //         toast.warning("No candidates selected", { description: "Please select at least one candidate to continue." });
    //     }
    // };

    // Handle switching tabs
    //  const handleSwitchTab = (tabValue: string) => {
    //     setActiveTab(tabValue);
    // };

    // Poll RAR Status Function
    const pollRARStatus = useCallback(async (tid: string) => {
        if (!tid) {
            console.error("RAR Polling: No trace ID provided.");
            setIsProcessingRAR(false);
            onAnalysisError("Cannot check status: Missing Trace ID.");
            return;
        }

        if (rarPollingAttempts >= RAR_MAX_POLLING_ATTEMPTS) {
            console.warn(`RAR Polling: Max attempts reached for ${tid}`);
            setIsProcessingRAR(false);
            setRarTraceId(null);
            setRarPollingAttempts(0);
            onAnalysisError(`Analysis status check timed out for ${tid}.`);
            toast.warning("Analysis timed out", { description: `Max polling attempts reached for ${tid}` });
            return;
        }

        // console.log(`Polling RAR status for ${tid}, Attempt: ${rarPollingAttempts + 1}`);

        try {
            const statusResponse = await checkRARStatus(tid);
            setRarProgress(statusResponse.progress || {});

            // console.log(`RAR Status: ${statusResponse.status}`);

            switch (statusResponse.status) {
                case 'completed':
                    console.log("RAR Analysis completed. Results:", statusResponse.results);
                    setIsProcessingRAR(false);
                    setRarTraceId(null);
                    setRarPollingAttempts(0);
                    onAnalysisComplete(statusResponse.results, bulkUploads); // Pass results to App.tsx
                    // setBulkUploads([]); // Clear prepared uploads after success
                    toast.success("Resume analysis completed successfully!");
                    break;
                case 'failed':
                    console.error(`RAR Analysis failed for ${tid}:`, statusResponse.error);
                    setIsProcessingRAR(false);
                    setRarTraceId(null);
                    setRarPollingAttempts(0);
                    onAnalysisError(`Analysis failed: ${statusResponse.error || 'Unknown error'}. Trace ID: ${tid}`);
                    toast.error("Resume analysis failed", { description: statusResponse.error || `Trace ID: ${tid}` });
                    break;
                case 'running':
                case 'pending':
                    setRarPollingAttempts(prev => prev + 1);
                    setTimeout(() => pollRARStatus(tid), RAR_POLLING_INTERVAL_MS);
                    break;
                default:
                    console.warn(`Unexpected RAR status: ${statusResponse.status}`);
                    setRarPollingAttempts(prev => prev + 1);
                    setTimeout(() => pollRARStatus(tid), RAR_POLLING_INTERVAL_MS);
                    break;
            }
        } catch (error: any) {
            console.error(`Error polling RAR status for ${tid}:`, error);
            setIsProcessingRAR(false);
            setRarTraceId(null);
            setRarPollingAttempts(0);
            onAnalysisError(`Error checking analysis status: ${error.message}. Polling stopped.`);
            toast.error("Error checking status", { description: error.message });
        }
    }, [rarPollingAttempts, onAnalysisComplete, onAnalysisError, bulkUploads]);


    // Handle starting the resume analysis process
    const handleStartAnalysis = async () => {
        if (bulkUploads.length === 0) {
            toast.warning("No candidates prepared", { description: "Please prepare a bulk upload first." });
            return;
        }
        if (availableJobs.length === 0) {
            toast.error("No Job Openings", { description: "Cannot start analysis without job openings." });
            return;
        }

        // --- Extract positions from bulkUploads ---
        const positionsForAnalysis = bulkUploads.map(upload => upload.position);
        const uniquePositions = Array.from(new Set(positionsForAnalysis));

        setIsSubmitting(true); // Use isSubmitting for the initial API call phase
        setIsProcessingRAR(false);
        setErrorMessage(null);
        setRarProgress({});
        setRarPollingAttempts(0);
        setRarTraceId(null);

        console.log(`--- STARTING RESUME ANALYSIS FOR ${bulkUploads.length} BATCH(ES) ---`);

        try {
            // Optional: Health check
            // console.log("Performing RAR API health check...");
            // await apiRARHealthCheck(); 
            // console.log("RAR API health check successful.");

            toast.info("Initiating Resume Analysis...", {
                description: `Processing ${bulkUploads.reduce((sum, b) => sum + b.resumeFile.length, 0)} resume(s) against ${availableJobs.length} job(s).`
            });

            // Call the API to start analysis
            // Note: Pass availableJobs (all jobs from Lark) and bulkUploads
            const initialResponse = await startResumeAnalysis(availableJobs, bulkUploads);
            console.log(`RAR Analysis initiated. Trace ID: ${initialResponse.trace_id}`);
            toast.success("Analysis initiated.", { description: `Trace ID: ${initialResponse.trace_id}` });

            // --- Start Processing Phase ---
            setIsSubmitting(false); // Initial submission done
            setIsProcessingRAR(true); // Start the processing state
            setRarTraceId(initialResponse.trace_id);
            setRarPollingAttempts(0); 
            onAnalysisStart(initialResponse.trace_id, uniquePositions); // Notify App.tsx to switch tab

            // Start polling
            setTimeout(() => pollRARStatus(initialResponse.trace_id), 500);

        } catch (error: any) {
            console.error("Error starting RAR Analysis:", error);
            let errorMessage = error.message;

            // Check for PDF parsing errors
            if (errorMessage.includes('PDF parsing failed')) {
                errorMessage = 'Failed to read one or more PDF files. Please ensure all files are valid PDFs.';
            }

            toast.error("Failed to start analysis.", { description: error.message || "Unknown error" });
            setErrorMessage(error.message || "An unknown error occurred.");
            setIsSubmitting(false);
            setIsProcessingRAR(false);
            onAnalysisError(error.message || "Failed to start analysis.");
        }
    };


    if (larkLoading) {
        return <LoadingIndicator message="Loading Candidates from Lark Base..." />;
    }

    if (larkError) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
                <p className="font-semibold">Lark Base Error (Candidates):</p>
                <p>{larkError}</p>
                <p className="mt-2 text-sm">Please ensure the '③Candidates' table exists and is configured correctly, then refresh.</p>
            </div>
        );
    }
    return (
        <Tabs defaultValue="addCandidate" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <Toaster richColors position="top-right" />
            <TabsList className="grid w-full grid-cols-2 bg-gray-200 text-[#111613]">
                {/* <TabsTrigger value="selectCandidates" className="data-[state=active]:bg-white data-[state=active]:text-[#37A533] data-[state=active]:shadow-sm rounded-md cursor-pointer">
                    Choose Candidates
                </TabsTrigger> */}
                <TabsTrigger value="addCandidate" className="data-[state=active]:bg-white data-[state=active]:text-[#37A533] data-[state=active]:shadow-sm rounded-md cursor-pointer col-span-2"> {/* Make Add Candidate span both columns */}
                    Add Candidates & Start Analysis
                </TabsTrigger>
            </TabsList>

            {/* Tab 1: Select Existing Candidates (Code in 'CandidatesReturn.txt') */}
            {/* <TabsContent value="selectCandidates"> ... </TabsContent> */}

            {/* Tab 2: Add New Candidate (Now the main tab) */}
            <TabsContent value="addCandidate">
                {/* ... (Accordion structure remains the same) ... */}
                 <Accordion type="single" defaultValue='bulk' collapsible className="w-full space-y-4">
                    {/* Individual Candidate Upload (Keep if needed) */}
                    {/* <AccordionItem value="individual" className="border rounded-lg bg-white"> ... </AccordionItem> */}

                    {/* Bulk Upload */}
                    <AccordionItem value="bulk" className="border rounded-lg bg-white">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 cursor-pointer rounded-t-lg">
                            <div className="flex flex-col items-start text-left">
                                <h3 className="text-lg font-semibold text-[#111613] tracking-wider">Add and Analyze Resumes</h3>
                                <p className="text-sm text-gray-600 tracking-wider">Upload resumes for specific positions and start the analysis.</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4 pb-6 border-t">
                            <div className="space-y-6"> {/* Increased spacing */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Grid layout */}
                                    <div className="space-y-2">
                                        <Label htmlFor="bulkPosition" className="text-[#111613] font-medium">
                                            Position
                                        </Label>
                                        {availableJobs.length > 0 ? (
                                            <Select
                                                value={bulkPosition}
                                                onValueChange={setBulkPosition}
                                                disabled={isSubmitting || isProcessingRAR}
                                            >
                                                <SelectTrigger className="w-full border-gray-300 focus:border-[#37A533] focus:ring-[#37A533]/50 rounded-md">
                                                    <SelectValue placeholder="Select a position" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableJobs.map((job) => (
                                                        <SelectItem
                                                            key={job.recordId || job.jobTitle}
                                                            value={job.jobTitle}
                                                            className="cursor-pointer hover:bg-[#e0f2e0]"
                                                        >
                                                            {job.jobTitle}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md border border-gray-200">
                                                No job positions available. Please add job openings first.
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bulkResumeFiles" className="text-[#111613] font-medium">
                                            Upload Resumes (PDF only)
                                        </Label>
                                        <Input
                                            id="bulkResumeFiles"
                                            type="file"
                                            accept=".pdf"
                                            multiple
                                            onChange={handleBulkFileChange}
                                            className="border-gray-300 focus:border-[#37A533] focus:ring-[#37A533]/50 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#e0f2e0] file:text-[#1E651C] hover:file:bg-[#c1e4c1]"
                                            disabled={isSubmitting || isProcessingRAR}
                                        />
                                        {bulkResumeFiles.length > 0 && (
                                            <p className="text-sm text-gray-600">
                                                {bulkResumeFiles.length} file(s) selected for upload.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={handlePrepareBulkUpload}
                                    disabled={!bulkPosition || bulkResumeFiles.length === 0 || isSubmitting || isProcessingRAR}
                                    className="w-full md:w-auto bg-[#5a67d8] text-white hover:bg-[#434190] disabled:bg-gray-300 disabled:text-gray-500 rounded-md px-6 py-2" // Changed color for distinction
                                >
                                    Add Resumes to Batch
                                </Button>

                                {/* Display prepared bulk uploads */}
                                {bulkUploads.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                                        <h4 className="font-semibold text-lg text-[#111613] mb-3">Analysis Batch:</h4>
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> {/* Scrollable list */}
                                            {bulkUploads.map((upload, index) => (
                                                <div key={index} className="p-3 bg-gray-100 border border-gray-200 rounded-md flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">{upload.position}</p>
                                                        <p className="text-xs text-gray-600">{upload.resumeFile.length} resume(s)</p>
                                                    </div>
                                                    {/* Optional: Add a remove button per batch */}
                                                    {/* <Button variant="ghost" size="sm" onClick={() => handleRemoveBatch(index)} disabled={isProcessingRAR || isSubmitting}>Remove</Button> */}
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            onClick={handleStartAnalysis}
                                            disabled={isSubmitting || isProcessingRAR || bulkUploads.length === 0}
                                            className="w-full mt-4 bg-[#37A533] text-white hover:bg-[#1E651C] disabled:bg-gray-300 disabled:text-gray-500 text-base font-semibold py-3 rounded-md" // Larger button
                                        >
                                            {isSubmitting ? 'Initiating...' : (isProcessingRAR ? `Processing... (Trace: ${rarTraceId?.substring(0, 6)}...)` : 'Start Resume Analysis')}
                                        </Button>
                                        {/* Loading Indicator for RAR Processing */}
                                        {isProcessingRAR && (
                                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-sm">
                                                <LoadingIndicator message={`Analyzing Resumes...`} />
                                                {/* Optional: Display detailed progress */}
                                                {Object.entries(rarProgress).length > 0 && (
                                                    <div className="mt-2 text-xs space-y-1">
                                                        <p className="font-medium">Progress:</p>
                                                        {Object.entries(rarProgress).map(([key, value]) => (
                                                            <p key={key}>{`${key}: ${value}`}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </TabsContent>
        </Tabs>
    );
    
};

export default Candidates;