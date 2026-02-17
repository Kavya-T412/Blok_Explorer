import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ChatMessage } from './ChatMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Message {
    text: string;
    sender: 'user' | 'ai';
}

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { text: "Hi! I'm your Blockverse assistant. How can I help you today?", sender: 'ai' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.map(m => ({ role: m.sender, content: m.text }))
                }),
            });

            const data = await response.json();
            if (data.success) {
                setMessages(prev => [...prev, { text: data.response, sender: 'ai' }]);
            } else {
                setMessages(prev => [...prev, { text: "Error: " + (data.error || "Failed to get response"), sender: 'ai' }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { text: "I'm having trouble connecting to my brain. Is the backend running?", sender: 'ai' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 flex flex-col w-[350px] sm:w-[400px] h-[500px] bg-background/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-primary flex items-center justify-between border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <MessageCircle className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-semibold text-white">Blockverse Assistant</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-white/20"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Messages Area */}
                        <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
                            {messages.map((m, idx) => (
                                <ChatMessage key={idx} message={m.text} sender={m.sender} />
                            ))}
                            {isLoading && (
                                <div className="flex justify-start mb-4">
                                    <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-none border border-border">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 border-t border-border bg-background/40">
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about Blockverse..."
                                    className="bg-muted/50 border-border focus:ring-primary"
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={isLoading || !input.trim()}
                                    className="shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <Button
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95",
                    isOpen ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                )}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </Button>
        </div>
    );
};
