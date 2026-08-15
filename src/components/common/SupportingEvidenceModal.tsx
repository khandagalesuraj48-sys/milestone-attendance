import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  ExternalLink,
  X,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

interface SupportingEvidenceModalProps {
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  onClose: () => void;
}

export const SupportingEvidenceModal: React.FC<SupportingEvidenceModalProps> = ({
  fileUrl,
  fileName,
  fileType,
  fileSize,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [resolvedFileName, setResolvedFileName] = useState(fileName || 'Supporting Evidence Document');
  const [resolvedMimeType, setResolvedMimeType] = useState(fileType || '');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const loadEvidence = async () => {
      setLoading(true);
      setError(null);
      try {
        const { objectUrl, fileName: fetchedName, contentType } = await api.fetchAuthenticatedBlob(fileUrl);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        createdUrl = objectUrl;
        setBlobUrl(objectUrl);
        if (fetchedName && !fileName) {
          setResolvedFileName(fetchedName);
        }
        if (contentType && !fileType) {
          setResolvedMimeType(contentType);
        }
      } catch (err: any) {
        if (!active) return;
        console.error('[SupportingEvidenceModal] File load error:', err);
        const msg = err?.message || '';
        if (msg.includes('401') || msg.includes('UNAUTHORIZED') || msg.includes('Authentication required')) {
          setError('Your session has expired. Please sign in again to access this file.');
        } else if (msg.includes('403') || msg.includes('ACCESS_DENIED')) {
          setError('You do not have authorization to view this supporting document.');
        } else if (msg.includes('404') || msg.includes('FILE_NOT_FOUND')) {
          setError('This supporting evidence attachment is no longer available on the server.');
        } else {
          setError('Unable to load supporting document preview. Please try downloading the file.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadEvidence();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [fileUrl]);

  // Format file size nicely
  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Determine file category
  const lowerName = resolvedFileName.toLowerCase();
  const lowerMime = resolvedMimeType.toLowerCase();

  const isImage =
    lowerMime.startsWith('image/') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.bmp') ||
    lowerName.endsWith('.svg');

  const isPdf = lowerMime.includes('pdf') || lowerName.endsWith('.pdf');

  const isExcel =
    lowerMime.includes('excel') ||
    lowerMime.includes('spreadsheet') ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv');

  const isWord =
    lowerMime.includes('word') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc');

  const isArchive = lowerName.endsWith('.zip') || lowerName.endsWith('.rar') || lowerName.endsWith('.7z');

  const handleDownload = async () => {
    try {
      setDownloading(true);
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = resolvedFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 200);
      } else {
        await api.downloadFile(fileUrl, resolvedFileName);
      }
    } catch (e: any) {
      alert('Failed to download file: ' + (e.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } else {
      api.getAuthenticatedFileUrl(fileUrl).then((authUrl) => {
        if (authUrl) window.open(authUrl, '_blank', 'noopener,noreferrer');
      });
    }
  };

  return (
    <div
      id="supporting-evidence-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 selection:bg-slate-900 selection:text-white animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="supporting-evidence-modal-card"
        className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-7 sm:py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-3 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              {isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isPdf ? (
                <FileText className="w-5 h-5 text-rose-300" />
              ) : isExcel ? (
                <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
              ) : isWord ? (
                <FileText className="w-5 h-5 text-blue-300" />
              ) : (
                <File className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Supporting Evidence
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-500 truncate mt-0.5 font-medium">
                <span className="font-mono truncate max-w-[200px] sm:max-w-[320px]" title={resolvedFileName}>
                  {resolvedFileName}
                </span>
                {formatSize(fileSize) && (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-semibold text-slate-600 shrink-0">{formatSize(fileSize)}</span>
                  </>
                )}
                {isPdf && (
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px]">
                    PDF
                  </span>
                )}
                {isImage && (
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px]">
                    IMAGE
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isImage && blobUrl && !loading && (
              <div className="hidden sm:flex items-center space-x-1 mr-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-slate-700 font-bold font-mono px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              id="close-evidence-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px] max-h-[65vh] bg-slate-900/5 relative">
          {loading && (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Loading Authenticated Document...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="w-full max-w-md p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold">Document Unavailable</h4>
              <p className="text-xs text-rose-700 font-medium">{error}</p>
              <div className="pt-2 flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-rose-900 text-white rounded-xl text-xs font-bold hover:bg-rose-800 transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Try Direct Download</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              {isImage ? (
                <div className="overflow-auto max-h-full max-w-full flex items-center justify-center p-2">
                  <img
                    src={blobUrl}
                    alt={resolvedFileName}
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-md transition-transform duration-100"
                  />
                </div>
              ) : isPdf ? (
                <div className="w-full h-[58vh] bg-white rounded-xl overflow-hidden shadow-xs border border-slate-200">
                  <iframe
                    src={`${blobUrl}#toolbar=1&navpanes=0`}
                    title={resolvedFileName}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                /* Rich document viewer fallback for Word, Excel, ZIP, TXT, etc. */
                <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-slate-200 shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto shadow-2xs">
                    {isExcel ? (
                      <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                    ) : isWord ? (
                      <FileText className="w-8 h-8 text-blue-600" />
                    ) : isArchive ? (
                      <FileArchive className="w-8 h-8 text-amber-600" />
                    ) : (
                      <File className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 break-all">{resolvedFileName}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {isExcel
                        ? 'Microsoft Excel Spreadsheet'
                        : isWord
                        ? 'Microsoft Word Document'
                        : isArchive
                        ? 'Compressed Archive File'
                        : 'Supporting Document Attachment'}
                      {formatSize(fileSize) && ` • ${formatSize(fileSize)}`}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 text-left space-y-1 font-medium">
                    <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Security & Verification Verified</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      This file format cannot be rendered directly in-browser. Please download or open it with your device's native application.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloading ? 'Downloading...' : 'Download File'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenNewTab}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Browser</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 sm:px-7 sm:py-4 border-t border-slate-100 bg-white gap-3">
          <div className="text-xs text-slate-500 font-medium flex items-center space-x-1">
            <span>Milestone Consultancy Authoritative Evidence Vault</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              id="download-evidence-btn"
              type="button"
              onClick={handleDownload}
              disabled={loading || downloading}
              className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>

            <button
              id="open-evidence-tab-btn"
              type="button"
              onClick={handleOpenNewTab}
              disabled={loading || !!error}
              className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab</span>
            </button>

            <button
              id="close-evidence-btn"
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
