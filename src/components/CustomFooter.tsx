import React from 'react';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
  } from '@/components/ui/hover-card';
import { Button } from "@/components/ui/button";
import { FaGithub, FaLinkedin  } from "react-icons/fa";
import { cn } from "@/lib/utils";



const Footer: React.FC = () => {
    return (
        <footer className="py-4 text-center text-sm text-gray-500">
            <HoverCard>
                <HoverCardTrigger asChild>
                    <span className="cursor-pointer transition-colors hover:text-gray-700">
                    &copy; {new Date().getFullYear()} Built with <span className="text-red-500">❤️</span> by <u className="tracking-widest font-medium hover:text-green-600">rhyliieee</u>
                    </span>
                </HoverCardTrigger>
                <HoverCardContent
                    className={cn(
                        "w-80 bg-white border border-gray-200",
                        "text-gray-900 shadow-lg rounded-xl p-4",
                        "transition-all duration-300",
                        "hover:scale-[1.02] hover:shadow-xl",
                        "focus:outline-none focus:ring-2 focus:ring-green-500"
                    )}
                >
                    <div className="flex items-center justify-between space-x-4">
                    <div className="space-y-1">
                            <h4 className="text-sm font-semibold tracking-wider text-gray-900">My Profiles</h4>
                            <p className="text-sm text-gray-600">
                                Connect with me on these platforms.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                asChild // Render the anchor tag inside the Button
                                className={cn(
                                    "bg-white text-gray-900 hover:bg-gray-100",
                                    "border-gray-300 hover:border-green-300",
                                    "transition-all duration-200",
                                    "focus:outline-none focus:ring-2 focus:ring-green-500"
                                )}
                            >
                                <a
                                    href="https://github.com/rhyliieee" // Replace with your actual GitHub profile URL
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="GitHub Profile"
                                >
                                    <FaGithub className="h-4 w-4" />
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className={cn(
                                    "bg-white text-gray-900 hover:bg-gray-100",
                                    "border-gray-300 hover:border-green-300",
                                    "transition-all duration-200",
                                    "focus:outline-none focus:ring-2 focus:ring-green-500"
                                )}
                            >
                                <a
                                    href="https://www.linkedin.com/in/jomar-talambayan-52730227a/"  // Replace with your LinkedIn profile URL
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="LinkedIn Profile"
                                >
                                    <FaLinkedin className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        </footer>
    );
};

export default Footer;