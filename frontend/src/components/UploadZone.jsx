import React, { useRef } from 'react';
import { UploadCloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UploadZone({ onUpload, isUploading, uploadStatus }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-5 border-b border-slate-800/80">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
        Upload Document (PDF)
      </label>

      {/* Drag & Drop clickable box */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
          isUploading
            ? 'border-indigo-500/50 bg-indigo-950/20 cursor-wait'
            : 'border-slate-700/80 hover:border-indigo-500/70 hover:bg-slate-800/40 bg-slate-900/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs font-medium text-indigo-300">
              Extracting text & indexing vectors...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">
                Click to browse or drop PDF
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                PyMuPDF extraction • up to 25 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Notification Banner */}
      {uploadStatus && (
        <div
          className={`mt-3 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
            uploadStatus.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/50'
          }`}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          )}
          <span className="flex-1">{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
}
