'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, ImagePlus, X, Loader2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        className={`rounded-3xl border-2 border-dashed bg-white p-6 text-center transition-colors sm:p-10 ${
          isDragActive ? 'border-green-600 bg-green-50' : 'border-slate-300'
        }`}
      >
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <ScanLine className="h-8 w-8 text-green-700" aria-hidden />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Add a photo of the leaf</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
          One affected leaf, in daylight, filling most of the frame.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" size="lg" className="h-12 rounded-full px-6" onClick={() => cameraRef.current?.click()}>
            <Camera className="mr-2 h-5 w-5" aria-hidden /> Take photo
          </Button>
          <Button type="button" size="lg" variant="outline" className="h-12 rounded-full px-6" onClick={open}>
            <ImagePlus className="mr-2 h-5 w-5" aria-hidden /> Choose from gallery
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-400">JPG or PNG, up to 8 MB. You can also drop a file here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Selected leaf photo" className="h-full w-full object-cover" />
        {!isLoading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/70 text-white"
          >
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <p className="text-sm font-semibold">{LOADING_STEPS[stepIdx]}...</p>
            <p className="text-xs text-slate-200">This can take up to a minute.</p>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <p className="truncate text-xs text-slate-500">
          {selectedFile.name} · {formatSize(selectedFile.size)}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={clear} disabled={isLoading}>
            Retake
          </Button>
          <Button className="h-12 flex-[2] rounded-xl" onClick={() => onUpload(selectedFile)} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze photo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
