"use client"
import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Waves, Plus, Settings2, Trash, Pin, Copy, Send, Paperclip, Lightbulb, Globe, Menu, Check } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import {  GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from "@/lib/AuthContext";
import light from "../../public/light.svg"
import nonlight from "../../public/dark.svg"
import { auth } from "@/lib/firebaseConfig";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; 
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const provider = new GoogleAuthProvider();


function parseMarkdownToSegments(markdown) {
  const segments = [];
  const codeBlockRegex = /```([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: markdown.slice(lastIndex, match.index),
      });
    }
    // The code block content
    segments.push({
      type: 'code',
      content: match[1], // code inside ```
    });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < markdown.length) {
    segments.push({
      type: 'text',
      content: markdown.slice(lastIndex),
    });
  }

  return segments;
}


export default function ChatApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hoveredItemIndex, setHoveredItemIndex] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [firstUserMessages, setFirstUserMessages] = useState([]);

  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem('messages');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage in sync when messages change
  useEffect(() => {
    localStorage.setItem('messages', JSON.stringify(messages));
  }, [messages]);



  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScrollPill, setShowScrollPill] = useState(false);
  const [history, setHistory] = useState({});
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const {user,toggleTheme,dark} = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const eventSourceRef = useRef(null);

  console.log(user)

  const [chatId, setChatId] = useState(0);

  useEffect(() => {
  const savedChatId = localStorage.getItem('chatId');
  if (savedChatId !== null) {
    setChatId(Number(savedChatId));
  }
}, []);

  const scrollRef = useRef(null);

  const handleSend = async () => {
  if (!input.trim()) return;

  const userMsg = { from: 'user', text: input };
  setMessages(prev => [...prev, userMsg]);
  setInput('');
  setLoading(true);

  // Add empty placeholder for AI response
  setMessages(prev => [...prev, { from: 'ai', text: '' }]);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    });

    if (!res.body) {
      throw new Error('No response body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      let chunk = decoder.decode(value, { stream: true });

      // Clean up and normalize whitespace
      chunk = chunk.replace(/data:\s*/g, '').replace(/\s+/g, ' ');

      if (chunk) {
        setMessages(prev => {
          const msgs = [...prev];
          const lastAIIndex = msgs
            .map((m, i) => (m.from === 'ai' ? i : -1))
            .filter(i => i !== -1)
            .pop();

          if (lastAIIndex === undefined) return msgs;

          msgs[lastAIIndex] = {
            ...msgs[lastAIIndex],
            text: (msgs[lastAIIndex].text || '') + chunk,
          };

          return msgs;
        });
      }
    }
  } catch (err) {
      console.error('handleSend error:', err);

      let errorMessage = 'Oops! Something went wrong.';

      if (err.message.includes('fetch failed')) {
        errorMessage = 'Could not connect to the AI service. Please check your internet or API key.';
      } else if (err.message.includes('No response body')) {
        errorMessage = 'The AI did not return a response. Try again later.';
      }

      setMessages(prev => [...prev, { from: 'ai', text: errorMessage }]);
  } finally {
    setLoading(false);
  }
};


  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(1);
    setTimeout(() => setCopiedId(null), 2000); // Revert after 2 seconds
  };

  useEffect(() => {
  localStorage.setItem('chatId', chatId.toString());
}, [chatId]);

  const handleNewChat = () => {
  // Don't create a new chat if messages are empty
  if (!messages.length) return;

  // Save current chat to history
  setHistory((prevHistory) => {
    const alreadyExists = Object.values(prevHistory).some(
      (chat) => JSON.stringify(chat) === JSON.stringify(messages)
    );

    if (alreadyExists) return prevHistory;

    const updatedHistory = { ...prevHistory, [chatId]: messages };
    localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    return updatedHistory;
  });

  const firstUserMsg = messages.find((msg) => msg.from === 'user');

  if (firstUserMsg) {
    setFirstUserMessages((prevArr) => {
      // Check if any previous entry has the same chatId OR the same text of first user message
      const exists = prevArr.some(
        item => item.id === chatId || item.text.text === firstUserMsg.text
      );

      if (exists) return prevArr;

      const updated = [...prevArr, { id: chatId, text: firstUserMsg }];
      localStorage.setItem('firstUserMessages', JSON.stringify(updated));
      return updated;
    });
  }

  // Increment chatId and clear messages only if it wasn't empty
  setChatId(prev => {
    const newId = prev + 1;
    localStorage.setItem('chatId', JSON.stringify(newId));
    return newId;
  });

  setMessages([]);
};




 useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;

  const onScroll = () => {
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollPill(!nearBottom);
  };

  container.addEventListener('scroll', onScroll);

  // Trigger the scroll check initially
  onScroll();

  return () => container.removeEventListener('scroll', onScroll);
}, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
  }, [messages, loading]);


const handlePin = (id, text) => {
  setPinnedMessages((prev) => {
    const alreadyPinned = prev.find((item) => item.id === id);
    if (alreadyPinned) return prev; // avoid duplicates

    const updatedPins = [...prev, { id, text }];
    localStorage.setItem('pinnedMessages', JSON.stringify(updatedPins));
    return updatedPins;
  });
};

const handleDelete = (id) => {
  setFirstUserMessages((prev) => {
    const updatedFirstUser = prev.filter((item) => item.id !== id);
    localStorage.setItem('firstUserMessages', JSON.stringify(updatedFirstUser));
    return updatedFirstUser;
  });

  setHistory((prev) => {
    const newHistory = { ...prev };
    delete newHistory[id];
    localStorage.setItem('chatHistory', JSON.stringify(newHistory));
    return newHistory;
  });

  setPinnedMessages((prev) => {
    const updatedPins = prev.filter((item) => item.id !== id);
    localStorage.setItem('pinnedMessages', JSON.stringify(updatedPins));
    return updatedPins;
  });
};

const handleDeletePin = (id) => {
  setPinnedMessages((prev) => {
    const updatedPins = prev.filter((msg) => msg.id !== id);
    localStorage.setItem('pinnedMessages', JSON.stringify(updatedPins));
    return updatedPins;
  });
};

  const handleGoogle = () => {
    signInWithPopup(auth, provider)
      .then(result => console.log(result.user))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedFirstUserMessages = localStorage.getItem('firstUserMessages');
    if (savedFirstUserMessages) {
      setFirstUserMessages(JSON.parse(savedFirstUserMessages));
    }

    const savedPinnedMessages = localStorage.getItem('pinnedMessages');
    if (savedPinnedMessages) {
      setPinnedMessages(JSON.parse(savedPinnedMessages));
    }
  }, []);






  return (
    

     <div className="flex h-screen bg-[#0D1117] text-white overflow-hidden font-sans text-[15px] z-1000">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#00000080] bg-opacity-90 z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`border-r border-[#1E2139] flex flex-col justify-between z-40 transition-transform duration-300
        fixed top-0 left-0 h-full w-64 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${dark ? `bg-[#F4F2FA]` : `bg-[#FFFFFF ]`  } lg:static lg:translate-x-0 lg:w-70 bg-[#0D1117]`}
      >
        <div>
          <Card className="bg-transparent border-none shadow-none flex flex-row justify-between items-center">
            <CardContent className="p-4 flex items-center space-x-2">
              <div className="w-full h-full flex items-center justify-start text-xl font-bold text-gray-800 dark:text-white">
                <img alt="logo" className="w-8 h-8" src="https://cbmo-ai-chat.vercel.app/logo.png" />
                <p className="ml-2 font-michroma text-xs text-[#6A4DFC]">CBMO AI</p>
              </div>
            </CardContent>
            <CardContent className='flex justfify-start items-center gap-[12px]'>
              <Image src={nonlight} alt="light mode" width={12} height={12} className=""/>
              <Switch  checked={dark} onCheckedChange={toggleTheme} className="cursor-pointer z-50" />
              <Image src={light} alt="dark mode" width={12} height={12} />
            </CardContent>
          </Card>
          <nav className="flex-1 overflow-y-auto">
            <ScrollArea className="h-[70vh] px-4 py-2">
              <ul className="space-y-2">
                <li className="text-[10px] text-[#8F90A6] uppercase">Pinned</li>
                {pinnedMessages?.map(({ id, text }) => (
                  <li
                    key={id}
                    className={`hover:${darkMode ? 'bg-[#1A1F2D]' : 'bg-gray-200'} p-2 rounded cursor-pointer text-xs flex justify-between items-center`}
                    onMouseEnter={() => setHoveredItemIndex(`pinned-${id}`)}
                    onMouseLeave={() => setHoveredItemIndex(null)}
                    onClick={() => {
                      const selectedMessages = history[id];
                      if (selectedMessages) {
                        setMessages(selectedMessages);
                      }
                    }}
                  >
                    <span className={`${dark ? 'text-[#1E1B2E]': ` text-white`}`}>{text.text}</span>
                    {hoveredItemIndex === `pinned-${id}` && (
                      <div className="flex space-x-1 right-2 transition-opacity duration-800 cursor-pointer">
                        <Button variant="ghost" size="icon" className="text-[#8F90A6] cursor-pointer" onClick={() => handleDeletePin(id)}><Trash size={14} /></Button>
                      </div>
                    )}
                  </li>
                ))}
                {(!pinnedMessages || pinnedMessages.length === 0) && <div className={`${dark ? 'text-[#111827]': ``}`}>No Records</div>}

                <li className="mt-4 text-[10px] text-[#8F90A6] uppercase">Chat History</li>
                {firstUserMessages?.map(({ id, text }) => (
                  <li
                    key={id}
                    className={`hover:${darkMode ? 'bg-[#1A1F2D]' : 'bg-gray-200'} p-2 rounded cursor-pointer text-xs flex justify-between items-center`}
                    onMouseEnter={() => setHoveredItemIndex(`history-${id}`)}
                    onMouseLeave={() => setHoveredItemIndex(null)}
                    onClick={() => {
                      console.log(history[id])
                      const selectedMessages = history[id];
                      if (selectedMessages) {
                        setMessages(selectedMessages);
                      }
                    }}
                  >
                    <span className={`${dark ? 'text-[#1E1B2E]': ` text-white`}`}>{text.text}</span>
                    {hoveredItemIndex === `history-${id}` && (
                      <div className="flex space-x-1 right-2 transition-opacity duration-300 opacity-100">
                        <Button variant="ghost" size="icon" className="text-[#8F90A6]" onClick={() => handlePin(id, text)}><Pin size={10} /></Button>
                        <Button variant="ghost" size="icon" className="text-[#8F90A6]" onClick={() => handleDelete(id)}><Trash size={10} /></Button>
                      </div>
                    )}
                  </li>
                ))}
                {(!firstUserMessages || firstUserMessages.length === 0) && <div className={`text-sm ${dark ? 'text-[#111827]': ``}`} >No Records</div>}
              </ul>
            </ScrollArea>
          </nav>
        </div>
        <div className="p-4 border-t border-[#1E2139] flex items-center justify-between">
          <Button onClick={handleNewChat} className={`cursor-pointer bg-gradient-to-r from-purple-500 to-fuchsia-500 w-full flex items-center justify-center space-x-2 rounded-full text-xs py-2 ${dark ? " bg-[#7C3AED] " : ""} `}>
            <Plus size={14} />
            <span>New chat</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-[#8F90A6] ml-2">
            <Settings2 size={18} />
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <main className={`flex-1 relative flex justify-center overflow-y-auto ${dark ? `bg-[#F9FAFB]`:"bg-[#0D1117]" }`}>
        {/* Hamburger Button */}
        <button
          className="lg:hidden absolute top-4 left-4 z-50 text-white"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu size={24} />
        </button>

        {/* Top Right User Section */}
        <div className="absolute top-4 right-6 flex space-x-2 z-10">
          {!user ? (
            <Button className="bg-[#2A2B3D] text-white text-[12px] px-4 py-1.5 rounded-full cursor-pointer" onClick={handleGoogle}>Sign In</Button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold`}>{user?.displayName[0]}</div>
              <div className={`text-sm ${dark ? "text-[#1E1B2E] " : " "}`}>{user?.displayName}</div>
            </div>
          )}
        </div>

       <AnimatePresence mode="wait">
        {(!messages || messages.length === 0) ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-[70%] px-10 py-8 mx-auto flex flex-col justify-center"
          >
            {/* ... your empty view content here ... */}
            <div className="flex-grow flex flex-col justify-center items-center text-center">
              <h1 className={`text-3xl font-semibold mb-3 ${dark ? "text-[#1E1B2E]" : ""}`}>What can I help with?</h1>
              <div className="bg-[#1E1E2F] mt-6 p-4 rounded-xl flex items-center space-x-2 w-full max-w-2xl">
                <Input 
                  placeholder="Ask anything"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault(); // Prevent newline if multiline input
                      e.target.blur();
                      handleSend();
                    }
                  }}
                   value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className="flex-1 bg-transparent text-white placeholder-[#8F90A6] border-none text-base focus:outline-none focus:ring-0 focus:ring-transparent focus-visible:ring-0"
                />
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" className="text-white cursor-pointer" onClick={handleSend}><Send size={18}/></Button>
                </div>
              </div>
              <div className="flex justify-center space-x-2 mt-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="bg-[#2A2B3D] text-white text-sm px-4 py-1.5 rounded-full flex items-center space-x-2">
                        <Paperclip size={16} />
                        <span>Attach</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#2A2B3D] text-white px-3 py-1.5 text-xs rounded shadow-lg">
                      <p>Not implemented</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="bg-[#2A2B3D] text-white text-sm px-4 py-1.5 rounded-full flex items-center space-x-2">
                        <Globe size={16} />
                        <span>Search</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#2A2B3D] text-white px-3 py-1.5 text-xs rounded shadow-lg">
                      <p>Not implemented</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="bg-[#2A2B3D] text-white text-sm px-4 py-1.5 rounded-full flex items-center space-x-2">
                        <Lightbulb size={16} />
                        <span>Reason</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#2A2B3D] text-white px-3 py-1.5 text-xs rounded shadow-lg">
                      <p>Not implemented</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            
            </div>
            <div className="text-center text-xs text-[#8F90A6] mt-4">
              By messaging CBMO AI, you agree to our <span className="underline">Terms</span> and have read our <span className="underline">Privacy Policy</span>.
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen w-[80%] text-white flex flex-col items-center p-2 overflow-hidden"
          >
            <div ref={scrollRef} className="flex-1 w-full max-w-4xl mt-4 overflow-y-auto custom-scrollbar px-2 space-y-6 py-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className={`relative group flex ${msg.from === 'user' ? 'justify-end ' : 'justify-start'} ${
                    i > 0 && messages[i - 1].from === msg.from ? 'mt-1' : 'mt-6'
                  }`}
                >
                  <Card
                    className={`max-w-[60%] px-6 py-2 text-sm border border-white/10 rounded-[1.75rem] shadow-lg backdrop-blur-md ${
                      msg.from === 'user'
                          ? dark
                            ? 'bg-[#DAD5F8] text-[#1C1B2E]'
                            : 'bg-[#3c1c6e]/70 text-white'
                          : dark
                            ? 'bg-[#E0E7F0] text-[#1C1B2E]'
                            : 'bg-white/5 text-white'
                    }`}
                  >
                    <CardContent className="p-0 whitespace-pre-line relative group">
                      {(() => {
                        const text = msg.text;
                        const chunks = [];

                        // Find opening code blocks
                        const regex = /```(\w+)?\n?/g;
                        let lastIndex = 0;
                        let match;

                        while ((match = regex.exec(text)) !== null) {
                          const index = match.index;

                          // Push any plain text before the code block
                          if (index > lastIndex) {
                            chunks.push(
                              <p key={lastIndex} className="my-1 whitespace-pre-wrap break-words">
                                {text.slice(lastIndex, index)}
                              </p>
                            );
                          }

                          const lang = match[1] || 'javascript';

                          // Find closing backticks for this code block
                          const closeIndex = text.indexOf('```', regex.lastIndex);

                          let codeContent, endIndex;

                          if (closeIndex === -1) {
                            // No closing backticks yet - code block is partial
                            codeContent = text.slice(regex.lastIndex);
                            endIndex = text.length;
                          } else {
                            // Closing backticks found
                            codeContent = text.slice(regex.lastIndex, closeIndex);
                            endIndex = closeIndex + 3; // after closing ```
                          }

                          chunks.push(
                            <SyntaxHighlighter
                              key={index}
                              language={lang}
                              style={oneDark}
                              showLineNumbers
                              wrapLongLines={true}  // this enables wrapping
                              customStyle={{
                                margin: '0.5rem 0',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                whiteSpace: 'pre-wrap',       // allow wrapping
                                wordBreak: 'break-word',      // break long words/strings
                              }}
                            >
                              {codeContent}
                            </SyntaxHighlighter>
                          );

                          lastIndex = endIndex;
                          regex.lastIndex = endIndex; // move regex search forward
                        }

                        // Push any remaining plain text after last code block
                        if (lastIndex < text.length) {
                          chunks.push(
                            <p key={lastIndex} className="my-1 whitespace-pre-wrap break-words">
                              {text.slice(lastIndex)}
                            </p>
                          );
                        }

                        return chunks;
                      })()}
                    </CardContent>
                    <button
                      onClick={() => copyToClipboard(msg.text)} // or msg.id if available
                      className="absolute -bottom-5 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Copy"
                    >
                      {copiedId === 1 ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </Card>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start mt-6">
                  <Card className="max-w-[60%] px-6 py-4 text-sm border border-white/10 rounded-[1.75rem] shadow-lg backdrop-blur-md bg-white/5 text-white">
                    <CardContent className="p-0">AI is thinking...</CardContent>
                  </Card>
                </div>
              )}
            </div>
            {showScrollPill && (
              <div className="absolute bottom-24 z-10">
                <Button
                  onClick={() => scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
                  className={` px-4 py-2 rounded-full text-xs shadow-md cursor-pointer ${dark ? "bg-black/10 text-black" : "bg-white/10 text-white"}`}
                >
                  Scroll to bottom
                </Button>
              </div>
            )}
            {isTyping && (
              <div className="text-sm text-white/70 w-full max-w-4xl text-left">typing...</div>
            )}
            <div className="bg-[#1E1E2F] mt-6 p-4 rounded-xl flex items-center space-x-2 w-full max-w-2xl">
                <Input 
                  placeholder="Ask anything"
                  onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent newline if multiline input
                    e.target.blur();
                    handleSend();
                  }
                  }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className={`flex-1 bg-transparent text-white placeholder-[#8F90A6] border-none text-base focus:outline-none focus:ring-0 focus:ring-transparent focus-visible:ring-0 `}
                />
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" className="text-white cursor-pointer" onClick={handleSend} ><Send size={18}/></Button>
                </div>
              </div>
            <style jsx>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 0;
                height: 0;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}
