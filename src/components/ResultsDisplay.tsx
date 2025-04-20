import React from 'react';
import LoadingIndicator from './LoadingIndicator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ResultsDisplayProps {
    isLoading: boolean;
    results: any | null; // Refine 'any' with actual result structure later
    error: string | null;
    traceId: string | null;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ isLoading, results, error, traceId }) => {

    if (isLoading) {
        return (
            <Card className="bg-white border border-gray-300 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-[#111613]">Processing Analysis</CardTitle>
                    <CardDescription className="text-gray-600">
                        Analyzing resumes against job openings... (Trace ID: {traceId || 'N/A'})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LoadingIndicator message="Analysis in progress..." />
                    {/* TODO: Add progress details if available */}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="bg-red-50 border border-red-300 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-red-700">Analysis Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-600">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (!results) {
        return (
            <Card className="bg-white border border-gray-300 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-[#111613]">Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">No analysis results available. Please start an analysis from the Candidates tab.</p>
                </CardContent>
            </Card>
        );
    }

    // --- Display Results ---
    // Adjust based on the actual structure of 'results' from your API
    const { job_resume_matches, best_matches_per_job, best_matches_per_resume, overall_recommendation } = results;

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
                {best_matches_per_job && Object.keys(best_matches_per_job).length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-[#111613] mb-2">Best Candidate per Job</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {Object.entries(best_matches_per_job).map(([job, candidate]) => (
                                <li key={job}><strong>{job}:</strong> {String(candidate)}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Best Matches per Resume */}
                {best_matches_per_resume && Object.keys(best_matches_per_resume).length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-[#111613] mb-2">Best Job per Candidate</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
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
                                    <AccordionTrigger className="text-sm font-medium text-left">
                                        {match.candidate_name} for {match.job_description_name} (Score: {match.match_score?.toFixed(2)})
                                    </AccordionTrigger>
                                    <AccordionContent className="text-xs text-gray-600 whitespace-pre-wrap">
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