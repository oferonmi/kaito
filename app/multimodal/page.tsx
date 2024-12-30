'use client';

import {  useChat } from 'ai/react';
import { useRef, useState, useEffect, type FormEvent } from 'react';
import Image from "next/image";
import { AudioRecorder } from "@/components/AudioRecorder";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import { ToastContainer, toast } from "react-toastify";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import '@/node_modules/bootstrap-icons/font/bootstrap-icons.css';
import { Footer } from "@/components/Footer";
import { Tooltip } from "flowbite-react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function MultiModalChat() {
    // sessions
    const { data: session, status } = useSession();

    //LLM engine API route
    const [llmApiRoute, setLlmApiRoute] = useState(
      "/api/multimodal/chat/openai"
    );
    const [sourcesForMessages, setSourcesForMessages] = useState<
        Record<string, any>
    >({});

    const { 
        messages,
        reload,
        append,  
        setMessages, 
        input, 
        setInput, 
        handleInputChange, 
        handleSubmit, 
        isLoading 
    } = useChat({
        api: llmApiRoute,
        onResponse(response) {
            const sourcesHeader = response.headers.get("x-sources");
            const sources = sourcesHeader ? JSON.parse(atob(sourcesHeader)) : [];
            const messageIndexHeader = response.headers.get("x-message-index");

            if (sources.length && messageIndexHeader !== null) {
                setSourcesForMessages({
                    ...sourcesForMessages,
                [   messageIndexHeader]: sources,
                });
            }

            setShowSendButton(false);
        },
        onError: (e) => {
            toast(e.message, {
                theme: "dark",
            });
        },
    });

    const [files, setFiles] = useState<FileList | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    const [showAudioRecorder, setShowAudioRecorder] = useState<boolean>(false);
    const [audioInTranscript, setAudioInTranscript] = useState("");

    const [showFileAttactmentUI, setShowFileAttactmentUI] = useState<boolean>(false);
    const [showSendButton, setShowSendButton] = useState<boolean>(false);

    const bottomRef = useRef<HTMLDivElement>(null);
	const sendButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (messages?.length > 0 ) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);


    async function processRecordedAudioIn(audioBlob: Blob) {
        try {
            // Validate the blob
            if (!audioBlob || audioBlob.size === 0) {
                throw new Error("Invalid audio data");
            }

            const formData = new FormData();
            formData.append("file", audioBlob, "audio.webm");

            const response = await fetch("/api/stt/whisper", {
                method: "POST",
                body: formData,
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
                if (!data || !data.transcript) {
                throw new Error("Invalid response format");
            }

            setAudioInTranscript(data.transcript);
            // append transcript to chat thread
            setMessages([
                ...messages,
                {
                    id: String(Date.now()),
                    role: "user",
                    content: data.transcript,
                },
            ]);
            // trigger LLM API call and update chat thread with response
            reload();

            setShowSendButton(true);
        } catch (error) {
            console.error("Error processing audio:", error);
            setAudioInTranscript(""); // User feedback
        }
    }

    function handleSend(event: FormEvent<HTMLFormElement>){
        handleSubmit(event, {
            experimental_attachments: files,
        });
                            
        setFiles(undefined);
                            
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setShowFileAttactmentUI(false);
    }

    const recorderSettings = {
        noiseSuppression: true,
        echoCancellation: true,
    }

    const recorderControls = useAudioRecorder(recorderSettings);

    const audioRecorderWidget = (
        <div className="flex items-center rounded-full bg-white border border-kaito-brand-ash-green mr-auto ml-auto py-1 px-1">
            <AudioRecorder
                audioTrackSettings={recorderSettings}
                recorderCtrls={recorderControls}
                showVisualizer={true}
                onRecordingComplete={processRecordedAudioIn}
                setShowRecorder={setShowAudioRecorder}
            />
        </div>
    );

    const loadingAnimation = (
        <div role="status" className={`${isLoading ? "" : "hidden"} flex justify-center`}>
            <svg
                aria-hidden="true"
                className="w-6 h-6 text-white animate-spin dark:text-white fill-kaito-brand-ash-green"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                />
                <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                />
            </svg>
            <span className="sr-only">Loading...</span>
        </div>
    );

    // Common button styles
    const buttonBaseStyle = "inline-flex bg-kaito-brand-ash-green hover:bg-kaito-brand-ash-green items-center font-semibold text-gray-200 rounded-full px-6 py-5";

    // Clear chat button
    const ClearChatButton = messages.length > 0 && (
        <Tooltip content="Clear Chat Thread" className="inline-flex">
            <button
                className={`${buttonBaseStyle} mr-2`}
                type="button"
                onClick={() => setMessages([])}
            >
                <i className="bi bi-trash3-fill" />
            </button>
        </Tooltip>
    );

    // File Upload node
    const FileUpload = (
        <div>
            {!showFileAttactmentUI ? (
                <Tooltip content="Upload File" className="inline-flex">
                    <button
                        type="button"
                        className={buttonBaseStyle}
                        onClick={() => setShowFileAttactmentUI(true)}
                    >
                        <i className="bi bi-paperclip" />
                        <span className="sr-only">Attach file</span>
                    </button>
                </Tooltip>
            ) : (
                <input
                    type="file"
                    id="multimod-file-in"
                    className="border bg-white border-kaito-brand-ash-green rounded-lg py-2 inline-flex pl-2"
                    onChange={(e) => e.target.files && setFiles(e.target.files)}
                    multiple
                    ref={fileInputRef}
                />
            )}
        </div>
    );

    async function handleRecordingStart(recorderControls: any) {
        if (!recorderControls.recorderReady) {
            toast("Recorder not ready. Please wait a moment.", { theme: "dark" });
            return;
        }

        try {
            await recorderControls.startRecording();
            setShowAudioRecorder(true);
        } catch (error) {
            toast(
                "Failed to start recording. Please check your microphone permissions.",
                { theme: "dark" }
            );
            console.error("Recording failed to start:", error);
        }
    };

    // Audio Record Button
    const AudioRecordButton = (
        <button
            className={buttonBaseStyle}
            type="button"
            onClick={() => handleRecordingStart(recorderControls)}
        >
            <i className="bi bi-mic-fill" />
        </button>
    );

    // Send Button
    const SendButton = (
        <button
            className={buttonBaseStyle}
            type="submit"
            ref={sendButtonRef}
        >
            {loadingAnimation}
            <span className={isLoading ? "hidden" : ""}>
                <i className="bi bi-send-fill" />
            </span>
        </button>
    );

    const ChatInput = (
        <input
            className="w-full h-16 p-2 rounded-full border border-kaito-brand-ash-green focus:border-kaito-brand-ash-green text-kaito-brand-ash-green placeholder:text-gray-400"
            id="multimod-text-in"
            value={input}
            placeholder="Ask anything..."
            ref={textInputRef}
            onChange={(e) => {
                setShowSendButton(e.target.value.length > 0);
                handleInputChange(e);
            }}
        />
    );

    const chatFormWidgets = (
        <div className="flex flex-row space-x-2 w-full">
            {showAudioRecorder ? (
                audioRecorderWidget
            ) : (
                <>
                    {messages.length > 0 &&  ClearChatButton}
                    {FileUpload}
                    {ChatInput}
                    {showSendButton ? SendButton  : AudioRecordButton}
                </>
            )}
        </div>
    );

    const landingSectionUI = (
        <main className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-3xl w-full mx-auto md:p-8">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl text-gray-700 mb-4">
                        Query or Question a Gen AI Multimodal Chatbot
                    </h1>
                    <p className="text-lg text-black">
                        Use any of the inputs to make your inquiry
                    </p>
                </header>

                <form
                    onSubmit={(event) => handleSend(event)}
                    className="w-full border border-gray-300 rounded-lg shadow-xl p-9 space-y-4"
                >
                    {chatFormWidgets}
                </form>
            </div>
        </main>
    );

    return (
        <>
            {status === "authenticated" && (
                <>
                    {messages.length > 0 ? (
                        <>
                            {/* Chat thread section */}
                            <div className="flex flex-col items-center p-4 md:p-8 rounded grow overflow-hidden text-black min-h-screen">
                                <div className="flex flex-col w-full mb-4 overflow-auto transition-[flex-grow] ease-in-out pb-40  text-black">
                                    {messages.length > 0
                                    ? [...messages].map((m, i) => {
                                        const sourceKey = (messages.length -1 -i).toString();
                                        return (
                                            <ChatMessageBubble
                                            key={m.id}
                                            message={m}
                                            aiEmoji={"🤖"}
                                            sources={sourcesForMessages[sourceKey]}
                                            />
                                        );
                                    }) : ""}
                                </div>

                                <div ref={bottomRef} />

                                <form
                                    className="fixed bottom-0 w-full max-w-3xl  border border-gray-300 rounded-lg shadow-xl  space-x-2 text-black mb-20 container flex mx-auto my-auto pt-9 pb-9 px-5"
                                    onSubmit={(event) => handleSend(event)}
                                >
                                    {chatFormWidgets}
                                </form>
                            </div>
                            {messages.length > 0 ? (
                                <div className="  bottom-0">
                                    <Footer />
                                </div>
                            ) : ("")}
                        </>
                    ) : (
                        <>
                            {/* Landing section */}
                            {landingSectionUI}
                            <div className="  bottom-0">
                                <Footer />
                            </div>
                        </>
                    )}
                </>
            )}
            {status === "unauthenticated" && redirect("/auth/signIn")}
        </>
    );
}