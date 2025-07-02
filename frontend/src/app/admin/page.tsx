"use client";
import { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Tag,
} from "lucide-react";
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [text, setText] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        router.replace('/login');
        return;
      }
      // Lookup actual role from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (error || profile?.role !== 'admin') {
        router.replace('/login');
      } else {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text) formData.append("text", text);
    formData.append("source", source);
    const res = await fetch(`${apiUrl}/admin/ingest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (data.job_id) {
      setJobId(data.job_id);
      setStatus("queued");
    } else {
      setStatus(data.status || "unknown");
    }
  };

  // Poll ingestion status when jobId is set
  useEffect(() => {
    if (!jobId) return;

    setStatus("polling");
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/admin/ingest/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStatus(data.status);
        // Stop polling once done or failed
        if (data.status !== "queued" && data.status !== "polling") {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling failed", err);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, apiUrl, token]);

  if (checkingAuth) {
    return null;
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "queued":
      case "polling":
        return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      case "queued":
      case "polling":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 pt-20 px-6 pb-6">
      <Navbar />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-15">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-4">
            Admin Console
          </h1>
          <p className="text-gray-400 text-lg">
            Content ingestion management system
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-black/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl mb-8">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-medium text-lg">
                <Upload className="w-5 h-5" />
                File Upload
              </label>
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
                  isDragging
                    ? "border-white/50 bg-white/10"
                    : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <div className="text-center">
                  <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 transition-transform duration-300">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  {file ? (
                    <div className="space-y-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-white font-semibold text-lg">
                          {file.name}
                        </p>
                        <p className="text-gray-300 text-sm">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        <div className="mt-3 flex justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm transition-all duration-200 backdrop-blur-sm"
                          >
                            Remove File
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-white font-semibold text-xl mb-2">
                          Drop your file here
                        </p>
                        <p className="text-gray-300 text-sm mb-4">
                          or click to browse your computer
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <div className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:from-white/30 hover:to-white/20 hover:border-white/50 hover:scale-105">
                          <Upload className="w-4 h-4 inline mr-2" />
                          Choose File
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs">
                        Supports PDF, Markdown, and Text files
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Move the input outside the drop area and hide it properly */}
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.md,.txt,.markdown"
              />
            </div>

            {/* Text Input Section */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-medium text-lg">
                <FileText className="w-5 h-5" />
                Raw Text Content
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Enter your content here..."
                className="w-full bg-white/5 backdrop-blur-sm rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 transition-all duration-300 resize-none"
              />
            </div>

            {/* Source Label Section */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-medium text-lg">
                <Tag className="w-5 h-5" />
                Source Label
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
                placeholder="e.g., Documentation v2.1, User Manual..."
                className="w-full bg-white/5 backdrop-blur-sm rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 transition-all duration-300"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              onClick={handleSubmit}
              className="group relative w-full bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:from-white/30 hover:to-white/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                Ingest Content
              </div>
            </button>
          </div>
        </div>

        {/* Status Card */}
        {jobId && (
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center">
                {getStatusIcon()}
              </div>
              <h2 className="text-2xl font-bold text-white">
                Processing Status
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6">
                <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Job ID
                </p>
                <p className="text-white font-mono text-lg break-all">
                  {jobId}
                </p>
              </div>

              <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6">
                <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Current Status
                </p>
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <p
                    className={`font-semibold text-lg capitalize ${getStatusColor()}`}
                  >
                    {status}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {(status === "queued" || status === "polling") && (
              <div className="mt-6">
                <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-400 to-white h-full rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
