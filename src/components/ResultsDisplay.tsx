import React, { useEffect, useState } from 'react';
import LoadingIndicator from './LoadingIndicator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MultiJobComparisonState, ResumeFeedback, JobResumeMatch, ResumeScores, BulkCandidateUpload } from '../types/index';
import {useLarkCandidates} from '../hooks/useLarkCandidates';

interface ResultsDisplayProps {
    isLoading: boolean;
    results: MultiJobComparisonState | null; 
    error: string | null;
    traceId: string | null;
    analysisPositions: string[];
    uploadedCandidates: BulkCandidateUpload[];
}


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ isLoading, results, error, traceId, analysisPositions, uploadedCandidates }) => {

    // STATE TO TRACK IF RESULTS HAVE BEEN SAVE
    const [hasSavedResults, setHasSavedResults] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- GET FUNCTIONS FROM LARK CANDIDATE HOOK --- 
    const { 
        loading: larkLoading, 
        error: larkError, 
        existingCandidates, 
        saveAddedCandidates, 
        saveAnalyzedCandidates 
    } = useLarkCandidates()

    // --- useEffect to trigger saving results to Lark ---
    useEffect(() => {
            // Conditions to trigger save:
            // 1. Not currently loading results from API (!isLoading)
            // 2. Results data is available (results)
            // 3. Analysis positions are available (analysisPositions.length > 0)
            // 4. Results haven't been saved yet for this data (!hasSavedResults)
            // 5. Not currently in the process of saving (!isSaving)
            // 6. Lark hook is not in its initial loading phase (!larkLoading) - Important!
            if (!isLoading && results && analysisPositions.length > 0 && !hasSavedResults && !isSaving && !larkLoading && uploadedCandidates.length > 0) {
                console.log("ResultsDisplay: Conditions met, attempting to save results to Lark...");
                setIsSaving(true); // Indicate saving process started

                saveAnalyzedCandidates(results.final_recommendations, results.all_rankings, analysisPositions, uploadedCandidates)
                    .then(() => {
                        console.log("ResultsDisplay: saveAnalyzedCandidates completed successfully.");
                        setHasSavedResults(true); // Mark as saved to prevent re-saving
                    })
                    .catch((saveError) => {
                        // Error is likely already handled by toast within the hook, but log here too
                        console.error("ResultsDisplay: Error occurred during saveAnalyzedCandidates:", saveError);
                        // Optionally reset hasSavedResults to allow retry? Depends on desired behavior.
                        // setHasSavedResults(false);
                    })
                    .finally(() => {
                        setIsSaving(false); // Mark saving process as finished
                    });
            } else {
                console.error("Save conditions not met:", { isLoading, results: !!results, analysisPositions: analysisPositions.length, hasSavedResults, isSaving, larkLoading });
                return;
            }

            // Dependency array: Trigger effect when these values change.
            // Adding saveAnalyzedCandidates ensures stability if the hook provides a memoized function.
        }, [isLoading, results, analysisPositions, hasSavedResults, isSaving, saveAnalyzedCandidates, larkLoading, uploadedCandidates]);

        // --- Reset save state if results change (new analysis run) ---
        useEffect(() => {
            setHasSavedResults(false); // Reset saved flag when results change
            setIsSaving(false); // Reset saving flag
        }, [results]);

    if (isLoading || (isSaving && !results)) {
        return (
            <Card className="w-full max-w-3xl mx-auto mt-6">
                <CardHeader>
                    <CardTitle>Processing Analysis</CardTitle>
                    <CardDescription>
                        Analyzing resumes against job openings... (Trace ID: {traceId || 'N/A'})
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center py-10">
                    <LoadingIndicator message="Analysis in progress..." />
                </CardContent>
            </Card>
        );
    }

    // --- Error State ---
    if (error) {
        return (
            <Card className="w-full max-w-3xl mx-auto mt-6 border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Analysis Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }

    // --- LARK ERROR ---
    if (larkError) { 
        return (
           <Card className="w-full max-w-4xl mx-auto mt-6 border-destructive bg-red-50">
               <CardHeader>
                   <CardTitle className="text-destructive">Lark Initialization Error</CardTitle>
               </CardHeader>
               <CardContent>
                   <p className="text-destructive font-medium">{larkError}</p>
                   <p className="text-sm text-red-600 mt-2">Could not connect to or initialize the Lark Candidates table. Saving results will fail.</p>
               </CardContent>
           </Card>
       );
   }

    // --- No Results State ---
    if (!results) {
        return (
            <Card className="w-full max-w-3xl mx-auto mt-6">
                <CardHeader>
                    <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No analysis results available. Please start an analysis from the Candidates tab.</p>
                </CardContent>
            </Card>
        );
    }

    // --- Display Results ---
    const finalRecs = results.final_recommendations;
    const allRankings = results.all_rankings[analysisPositions[0]];

     // --- Missing Data State ---
     if (!finalRecs || !allRankings) {
        return (
           <Card className="w-full max-w-4xl mx-auto mt-6 border-orange-500 bg-orange-50"> {/* Warning style */}
               <CardHeader>
                   <CardTitle className="text-orange-700">Incomplete Results Data</CardTitle>
                    <CardDescription className="text-orange-600">
                       Trace ID: {traceId || 'N/A'}
                   </CardDescription>
               </CardHeader>
               <CardContent>
                   <p className="text-orange-700">Analysis completed, but the expected 'final_recommendations' and/or 'all_rankings' data structure was not found in the results.</p>
                   <details className="mt-4 text-xs">
                       <summary className="cursor-pointer text-orange-600">Show Raw Results</summary>
                       <pre className="mt-2 bg-white p-3 rounded overflow-auto border border-orange-200">
                           {JSON.stringify(results, null, 2)}
                       </pre>
                   </details>
               </CardContent>
           </Card>
       );
   }

    // Destructure from finalRecs (which is results.final_recommendations)
    const {
        job_resume_matches = [],
        best_matches_per_resume = {},
        overall_recommendation = "No overall recommendation provided."
    }: {
        job_resume_matches: JobResumeMatch[];
        best_matches_per_resume: Record<string, string>;
        overall_recommendation?: string;
    } = finalRecs;

    console.log(`---ANALYSIS POSITIONS INSIDE RESULTS DISPLAY: ${analysisPositions}---`);

    // DESTRUCTURE CONTENTS FROM ALL RANKINGS
    // const {candidate_name, analysis, scores, total_score, key_strengths, areas_for_improvement} = allRankings[analysisPositions[0]];

    return (
        <Card className="bg-white border border-gray-300 shadow-sm">
            <CardHeader>
                <CardTitle className="text-[#111613]">Analysis Results</CardTitle>
                <CardDescription className="text-gray-600">Summary of resume and job matching.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Overall Recommendation */}
                <div>
                    <h3 className="text-lg font-semibold text-[#111613] mb-2">Overall Recommendation</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{overall_recommendation || "No overall recommendation provided."}</p>
                </div>

                {/* Best Matches per Job */}
                {/* {best_matches_per_job && Object.keys(best_matches_per_job).length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-[#111613] mb-2">Best Candidate per Job</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {Object.entries(best_matches_per_job).map(([job, candidate]) => (
                                <li key={job}><strong>{job}:</strong> {String(candidate)}</li>
                            ))}
                        </ul>
                    </div>
                )} */}

                {/* Best Matches per Resume */}
                {best_matches_per_resume && Object.keys(best_matches_per_resume).length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-[#111613] mb-2">Best Job per Candidate</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 text-left">
                            {Object.entries(best_matches_per_resume).map(([candidate, job]) => (
                                <li key={candidate}><strong>{candidate}:</strong> {String(job)}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Detailed Matches */}
                {job_resume_matches && job_resume_matches.length > 0 && (
                     <div>
                        <h3 className="text-lg font-semibold text-[#111613] mb-2">Detailed Matches</h3>
                        <Accordion type="single" collapsible className="w-full">
                             {job_resume_matches.map((match: any, index: number) => (
                                <AccordionItem key={`${match.job_description_name}-${match.candidate_name}-${index}`} value={`match-${index}`} className="border-b">
                                    <AccordionTrigger className="text-sm font-medium text-left cursor-pointer tracking-wider">
                                        {match.candidate_name} for {match.job_description_name} | Match Score: {match.match_score?.toFixed(2)}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-xs text-gray-600 whitespace-pre-wrap text-left">
                                        {match.match_explanation}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ResultsDisplay;