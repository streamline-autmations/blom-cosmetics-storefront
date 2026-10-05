import React, { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { MAX_INSPIRATION_IMAGES, ShadeRequest, ShadeRequestErrors } from '../../lib/shadeRequest';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'hmvetruz';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'blom_unsigned';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface ShadeRequestFormProps {
  value: ShadeRequest;
  onChange: (next: ShadeRequest) => void;
  errors: ShadeRequestErrors;
  onUploadingChange: (uploading: boolean) => void;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100';

const uploadImage = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'blom/custom-requests');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || 'Upload failed');
  return json.secure_url as string;
};

export const ShadeRequestForm = React.forwardRef<HTMLDivElement, ShadeRequestFormProps>(
  ({ value, onChange, errors, onUploadingChange }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [uploadError, setUploadError] = useState('');

    // Latest request, updated synchronously on every change so uploads that finish in
    // the same tick each build on the previous one instead of a stale render.
    const valueRef = useRef(value);
    valueRef.current = value;
    const update = (patch: Partial<ShadeRequest>) => {
      const next = { ...valueRef.current, ...patch };
      valueRef.current = next;
      onChange(next);
    };

    const set = (field: keyof ShadeRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ [field]: e.target.value });

    const remainingSlots = MAX_INSPIRATION_IMAGES - value.inspiration_images.length - pendingCount;

    const handleFiles = async (fileList: FileList | null) => {
      if (!fileList) return;
      setUploadError('');
      const images = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) {
        setUploadError('Please choose an image file (JPG, PNG, WEBP or HEIC).');
        return;
      }
      const tooBig = images.filter((f) => f.size > MAX_FILE_BYTES);
      const accepted = images.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, Math.max(0, remainingSlots));
      if (tooBig.length) setUploadError('Images must be under 10MB.');
      else if (images.length > accepted.length) setUploadError(`You can add up to ${MAX_INSPIRATION_IMAGES} photos.`);
      if (accepted.length === 0) return;

      setPendingCount((n) => n + accepted.length);
      onUploadingChange(true);
      await Promise.all(
        accepted.map(async (file) => {
          try {
            const url = await uploadImage(file);
            const current = valueRef.current.inspiration_images;
            if (current.length < MAX_INSPIRATION_IMAGES) {
              update({ inspiration_images: [...current, url] });
            }
          } catch {
            setUploadError('One of your photos could not upload. Please try again.');
          } finally {
            setPendingCount((n) => {
              const next = n - 1;
              if (next === 0) onUploadingChange(false);
              return next;
            });
          }
        })
      );
    };

    const removeImage = (url: string) =>
      update({ inspiration_images: valueRef.current.inspiration_images.filter((u) => u !== url) });

    const fieldError = (message?: string, id?: string) =>
      message ? <p id={id} className="mt-1.5 text-xs font-medium text-red-600">{message}</p> : null;

    return (
      <div ref={ref} className="mb-8 rounded-2xl border border-pink-100 bg-pink-50/40 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900">Your shade request</h3>
        <p className="mt-1 mb-5 text-sm text-gray-600">
          Tell Avané what you have in mind so she can prepare your shade before the live.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="sr-tiktok" className="mb-1.5 block text-sm font-semibold text-gray-900">
              TikTok handle <span className="text-pink-500">*</span>
            </label>
            <input
              id="sr-tiktok"
              type="text"
              autoComplete="off"
              placeholder="@yourhandle"
              value={value.tiktok_handle}
              onChange={set('tiktok_handle')}
              aria-invalid={Boolean(errors.tiktok_handle)}
              aria-describedby={errors.tiktok_handle ? 'sr-tiktok-error' : undefined}
              className={inputClass}
            />
            {fieldError(errors.tiktok_handle, 'sr-tiktok-error')}
          </div>

          <div>
            <label htmlFor="sr-vibe" className="mb-1.5 block text-sm font-semibold text-gray-900">
              Describe your shade / vibe <span className="text-pink-500">*</span>
            </label>
            <textarea
              id="sr-vibe"
              rows={3}
              maxLength={600}
              placeholder="e.g. a soft milky pink with a little sparkle, like strawberry milk"
              value={value.vibe}
              onChange={set('vibe')}
              aria-invalid={Boolean(errors.vibe)}
              aria-describedby={errors.vibe ? 'sr-vibe-error' : undefined}
              className={`${inputClass} resize-y`}
            />
            {fieldError(errors.vibe, 'sr-vibe-error')}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sr-base" className="mb-1.5 block text-sm font-semibold text-gray-900">
                Base colour <span className="font-normal text-gray-500">(one)</span>
              </label>
              <input
                id="sr-base"
                type="text"
                maxLength={120}
                placeholder="e.g. nude pink"
                value={value.base_colour}
                onChange={set('base_colour')}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="sr-addins" className="mb-1.5 block text-sm font-semibold text-gray-900">
                Add-ins <span className="font-normal text-gray-500">(max two)</span>
              </label>
              <input
                id="sr-addins"
                type="text"
                maxLength={200}
                placeholder="e.g. rose gold glitter + silver foil"
                value={value.add_ins}
                onChange={set('add_ins')}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="sr-name" className="mb-1.5 block text-sm font-semibold text-gray-900">
              Shade name idea
            </label>
            <input
              id="sr-name"
              type="text"
              maxLength={60}
              placeholder="e.g. Strawberry Milk"
              value={value.shade_name}
              onChange={set('shade_name')}
              className={inputClass}
            />
          </div>

          <fieldset aria-describedby={errors.inspiration ? 'sr-inspiration-error' : undefined}>
            <legend className="mb-1.5 block text-sm font-semibold text-gray-900">
              Inspiration <span className="text-pink-500">*</span>
              <span className="ml-1 font-normal text-gray-500">upload a photo, paste a link, or both</span>
            </legend>

            {remainingSlots > 0 && (
              <label
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-100 ${
                  isDragging ? 'border-pink-400 bg-pink-50' : 'border-pink-200 bg-white hover:border-pink-300'
                }`}
              >
                <ImagePlus className="mb-2 h-6 w-6 text-pink-500" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-900">Drag a photo here or tap to choose</span>
                <span className="mt-1 text-xs text-gray-500">
                  Screenshots welcome · up to {MAX_INSPIRATION_IMAGES} photos, 10MB each
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                />
              </label>
            )}

            {(value.inspiration_images.length > 0 || pendingCount > 0) && (
              <ul className="mt-3 flex flex-wrap gap-3" aria-label="Your inspiration photos">
                {value.inspiration_images.map((url, idx) => (
                  <li key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <img src={url} alt={`Inspiration photo ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      aria-label={`Remove inspiration photo ${idx + 1}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/70 text-white hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {Array.from({ length: pendingCount }).map((_, idx) => (
                  <li key={`pending-${idx}`} className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-200 bg-white">
                    <Loader2 className="h-5 w-5 animate-spin text-pink-500" aria-label="Uploading photo" />
                  </li>
                ))}
              </ul>
            )}
            {uploadError && <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">{uploadError}</p>}

            <div className="relative mt-3">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="url"
                inputMode="url"
                aria-label="Inspiration link"
                placeholder="Paste an inspiration link"
                value={value.inspiration_link}
                onChange={set('inspiration_link')}
                className={`${inputClass} pl-10`}
              />
            </div>
            {fieldError(errors.inspiration, 'sr-inspiration-error')}
          </fieldset>
        </div>
      </div>
    );
  }
);

ShadeRequestForm.displayName = 'ShadeRequestForm';
