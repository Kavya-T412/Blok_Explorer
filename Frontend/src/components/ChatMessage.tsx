import React from 'react';
import { cn } from "@/lib/utils";

interface ChatMessageProps {
    message: string;
    sender: 'user' | 'ai';
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, sender }) => {
    return (
        <div
            className={cn(
                "mb-4 flex",
                sender === 'user' ? "justify-end" : "justify-start"
            )}
        >
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm transition-all duration-300",
                    sender === 'user'
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none border border-border"
                )}
            >
                <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
            </div>
        </div>
    );
};
