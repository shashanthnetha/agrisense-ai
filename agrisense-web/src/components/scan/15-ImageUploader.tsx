'use client';

import { createPortal } from 'react-dom';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, ImagePlus, X, Check, TriangleAlert } from 'lucide-react';
import { checkPhoto, type PhotoCheck } from '@/lib/photoCheck';
import { toast } from 'sonner';
import { PhotoScene } from '@/components/scene/PhotoScene';

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
  language: string;
  onLanguageChange: (lang: string) => void;
  showLanguage: boolean;
}

export const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu'];

const MAX_BYTES = 10 * 1024 * 1024;
const LOADING_STEPS = ['Uploading photo', 'Checking the leaf', 'Preparing your report'];

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/* Corner ticks make the frame read as a specimen plate. */
function Corners({ active = false }: { active?: boolean }) {
  const c = `absolute border-lime/60 transition-[width,height,border-color] duration-200 ${active ? 'h-8 w-8 !border-lime' : 'h-5 w-5'}`;
  return (
    <>
      <span className={`${c} left-3 top-3 border-l border-t`} aria-hidden />
      <span className={`${c} right-3 top-3 border-r border-t`} aria-hidden />
      <span className={`${c} bottom-3 left-3 border-b border-l`} aria-hidden />
      <span className={`${c} bottom-3 right-3 border-b border-r`} aria-hidden />
    </>
  );
}

const primary = 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 text-[15px] font-medium text-night transition-[transform,background-color] duration-150 hover:bg-lime/85 active:scale-[0.98] disabled:opacity-50';
const secondary = 'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-bone/40 px-6 text-[15px] text-bone transition-colors duration-150 hover:bg-bone/10 disabled:opacity-50';

export function ImageUploader({ onUpload, isLoading, language, onLanguageChange, showLanguage }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [sceneOn, setSceneOn] = useState(false);
  const [checks, setChecks] = useState<PhotoCheck[] | null>(null);
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
    reader.onload = () => {
      const url = reader.result as string;
      setPreview(url);
      setChecks(null);
      checkPhoto(url).then(setChecks).catch(() => setChecks(null));
    };
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

  // Paste a photo (Ctrl or Cmd + V) anywhere on the page.
  useEffect(() => {
    if (isLoading) return;
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); accept(f); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [accept, isLoading]);

  useEffect(() => {
    if (!isLoading) return;
    const t = setInterval(() => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 2500);
    return () => {
      clearInterval(t);
      setStepIdx(0);
    };
  }, [isLoading]);

  // While the full-screen reading stage is up, the page behind it must not take focus.
  useEffect(() => {
    if (!isLoading) return;
    const root = document.querySelector('[data-scan-page]');
    root?.setAttribute('inert', '');
    return () => root?.removeAttribute('inert');
  }, [isLoading]);

  const clear = () => {
    setPreview(null);
    setSelectedFile(null);
    setChecks(null);
    if (cameraRef.current) cameraRef.current.value = '';
  };

  if (!preview || !selectedFile) {
    return (
      <div
        {...getRootProps()}
        className={`dark-surface relative rounded-[6px] border bg-bone/[0.04] flex min-h-[26rem] flex-col items-center justify-center px-6 py-16 text-center transition-colors lg:min-h-[34rem] ${
          isDragActive ? 'border-lime bg-bone/10' : 'border-bone/25'
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
        <span className="absolute inset-x-[9%] inset-y-[11%] border border-dashed border-bone/25" aria-hidden />
        <span className="label absolute left-[9%] top-[5%]">Daylight</span>
        <span className="label absolute right-[9%] top-[5%]">10 to 15 cm</span>
        <span className="label absolute bottom-[4%] left-[9%]">One leaf fills the frame</span>
        <span className="label absolute bottom-[4%] right-[9%]">Hold steady</span>
        <p className="label relative">Step 1 of 2</p>
        <h2 className="mt-3 text-[28px] leading-[32px] tracking-[-0.01em]">Add a photo of the leaf</h2>
        <p className="mx-auto mt-2 max-w-[22rem] text-[15px] leading-[22px] text-bone/75">
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
        <p className="label mt-6">JPG or PNG, up to 10 MB. Drop or paste a photo here too</p>
      </div>
    );
  }

  return (
    <div className="dark-surface rise overflow-hidden rounded-[6px] border border-bone/20 bg-night text-bone">
      <div className="relative aspect-[4/3] w-full bg-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
        <img src={preview} alt="Selected leaf photo, shown whole" className="relative h-full w-full object-contain" />
        {!isLoading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-night/80 text-bone transition-colors hover:bg-night"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        )}
        {isLoading && (
          createPortal(<div role="status" aria-live="polite" aria-label="Reading your photo" className="dark-surface stage-in fixed inset-0 z-30 overflow-hidden bg-night text-bone">
            {/* The same full-bleed frame the report opens on, so the photo does not jump. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-3xl min-[640px]:hidden" />
            <span className="absolute inset-0 bg-gradient-to-b from-night/10 via-night/60 to-night min-[640px]:hidden" aria-hidden />
            {/* Same frame as the report: whole photo on top on phones, full-bleed on wide screens. */}
            <div className="relative mt-7 h-[36svh] min-h-[170px] overflow-hidden min-[640px]:absolute min-[640px]:inset-0 min-[640px]:mt-0 min-[640px]:h-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-full w-full object-contain object-top min-[640px]:object-cover min-[640px]:object-[60%_40%]" />
              {!sceneOn && <span className="sweep absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-bone/30 to-transparent" aria-hidden />}
              <PhotoScene src={preview} mode="read" onActive={setSceneOn} />
            </div>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[70%] bg-gradient-to-t from-night via-night/80 to-transparent min-[640px]:block" aria-hidden />
            <div className="relative px-5 pt-5 min-[640px]:absolute min-[640px]:inset-x-0 min-[640px]:bottom-0 min-[640px]:mx-auto min-[640px]:max-w-[1320px] min-[640px]:px-10 min-[640px]:pb-14 min-[640px]:pt-0">
              <p className="label">Your photo · being read evenly, nothing marked</p>
              <p className="display mt-2 text-[40px] sm:text-[72px]"><em>Reading</em> the leaf</p>
              <ol className="mt-4 space-y-1.5">
                {LOADING_STEPS.map((s, i) => (
                  <li key={s} className={`flex items-center gap-3 text-[14px] ${i <= stepIdx ? 'text-bone' : 'text-bone/45'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${i < stepIdx ? 'bg-bone' : i === stepIdx ? 'bg-lime' : 'bg-bone/30'}`} aria-hidden />
                    {s}
                  </li>
                ))}
              </ol>
              <p className="label mt-3">This can take up to a minute</p>
            </div>
          </div>, document.body)
        )}
      </div>
      <div className="space-y-4 p-4">
        <p className="label truncate">
          {selectedFile.name} · {formatSize(selectedFile.size)}
        </p>
        <div aria-label="Photo check" className="rounded-lg border border-bone/15 p-3">
          <p className="label">Quick photo check · on your device, advisory only</p>
          {checks ? (
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-[13px] leading-[18px]">
                  {c.tone === 'ok'
                    ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" strokeWidth={2} aria-label="OK" />
                    : <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff9a62]" strokeWidth={2} aria-label="Check" />}
                  <span><span className="text-bone">{c.label}.</span> <span className="text-bone/70">{c.note}</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-bone/55">Checking size, light and focus</p>
          )}
        </div>
        {showLanguage && (
          <fieldset disabled={isLoading} className="flex flex-wrap items-center justify-between gap-3">
            <legend className="sr-only">Audio summary language</legend>
            <span className="label" aria-hidden>Audio summary language</span>
            <div role="radiogroup" aria-label="Audio summary language" className="inline-flex rounded-full border border-bone/30 p-0.5">
              {LANGUAGES.map((l) => (
                <label key={l} className="cursor-pointer">
                  <input type="radio" name="audio-language" value={l} checked={language === l} onChange={() => onLanguageChange(l)} className="peer sr-only" />
                  <span className="inline-flex h-9 items-center rounded-full px-3.5 text-[13px] text-bone/80 transition-colors peer-checked:bg-bone peer-checked:text-night peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-lime">{l}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
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
