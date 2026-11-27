'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024;
const LOADING_STEPS = ['Uploading photo', 'Checking the leaf', 'Preparing your report'];

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/* Corner ticks make the frame read as a specimen plate. */
function Corners({ active = false }: { active?: boolean }) {
  const c = `absolute border-ink/40 transition-[width,height,border-color] duration-200 ${active ? 'h-8 w-8 !border-madder' : 'h-4 w-4'}`;
  return (
    <>
      <span className={`${c} left-3 top-3 border-l border-t`} aria-hidden />
      <span className={`${c} right-3 top-3 border-r border-t`} aria-hidden />
      <span className={`${c} bottom-3 left-3 border-b border-l`} aria-hidden />
      <span className={`${c} bottom-3 right-3 border-b border-r`} aria-hidden />
    </>
  );
}

const primary = 'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 text-[15px] font-medium text-paper transition-[transform,background-color] duration-150 hover:bg-ink/85 active:scale-[0.98] disabled:opacity-50';
const secondary = 'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-line bg-card px-6 text-[15px] text-ink transition-colors duration-150 hover:bg-raised disabled:opacity-50';

export function ImageUploader({ onUpload, isLoading }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      toast.error('Please choose a JPG or PNG photo.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File size must be less than 10MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => accept(files[0]),
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    multiple: false,
    disabled: isLoading,
    noClick: true,
    noKeyboard: true,
  });

  useEffect(() => {
    if (!isLoading) return;
    const t = setInterval(() => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 2500);
    return () => {
      clearInterval(t);
      setStepIdx(0);
    };
  }, [isLoading]);

  const clear = () => {
    setPreview(null);
    setSelectedFile(null);
    if (cameraRef.current) cameraRef.current.value = '';
  };

  if (!preview || !selectedFile) {
    return (
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border bg-card px-6 py-16 text-center transition-colors sm:py-24 ${
          isDragActive ? 'border-madder bg-raised' : 'border-line'
        }`}
      >
        <Corners active={isDragActive} />
        <input {...getInputProps({ 'aria-label': 'Choose a photo from your device' })} />
        <input
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="sr-only"
          aria-label="Take a photo with your camera"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <p className="label">Plate 01</p>
        <h2 className="mt-3 text-[28px] leading-[32px] tracking-[-0.01em]">Add a photo of the leaf</h2>
        <p className="mx-auto mt-2 max-w-[22rem] text-[15px] leading-[22px] text-ink-2">
          One affected leaf, in daylight, filling most of the frame.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <button type="button" className={primary} onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Take photo
          </button>
          <button type="button" className={secondary} onClick={open}>
            <ImagePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Choose from gallery
          </button>
        </div>
        <p className="label mt-6">JPG or PNG, up to 10 MB. You can also drop a file here</p>
      </div>
    );
  }

  return (
    <div className="rise overflow-hidden rounded-2xl border border-line bg-card">
      <div className="relative aspect-[4/3] w-full bg-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Selected leaf photo" className="h-full w-full object-cover" />
        {!isLoading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-night/80 text-paper transition-colors hover:bg-night"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        )}
        {isLoading && (
          <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col justify-end overflow-hidden bg-night/70 p-5 text-paper">
            <span className="scanline absolute inset-x-0 top-0 h-px bg-paper/80" style={{ "--sweep": "300px" } as React.CSSProperties} aria-hidden />
            <ol className="space-y-1.5">
              {LOADING_STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 text-[14px] ${i <= stepIdx ? 'text-paper' : 'text-paper/45'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${i < stepIdx ? 'bg-paper' : i === stepIdx ? 'bg-[#e08a6e]' : 'bg-paper/30'}`} aria-hidden />
                  {s}
                </li>
              ))}
            </ol>
            <p className="label mt-3 !text-paper/60">This can take up to a minute</p>
          </div>
        )}
      </div>
      <div className="space-y-4 p-4">
        <p className="label truncate">
          {selectedFile.name} · {formatSize(selectedFile.size)}
        </p>
        <div className="flex gap-3">
          <button type="button" className={`${secondary} flex-1`} onClick={clear} disabled={isLoading}>Retake</button>
          <button type="button" className={`${primary} flex-[2]`} onClick={() => onUpload(selectedFile)} disabled={isLoading}>
            {isLoading ? 'Analyzing' : 'Analyze photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
