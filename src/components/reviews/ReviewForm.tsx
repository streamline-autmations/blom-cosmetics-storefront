import React from 'react';
import { submitReview } from '../../lib/reviews';
import { OptimizedImage } from '../seo/OptimizedImage';
import { X, Star as StarIcon, Upload, Check } from 'lucide-react';

type ReviewFormProps = {
  productSlug: string;
  product?: { name: string; price?: number; compareAtPrice?: number; image?: string };
};

export function ReviewForm({ productSlug, product }: ReviewFormProps) {
  const [status, setStatus] = React.useState<'idle'|'saving'|'done'|'error'>('idle');
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number>(0);
  const [hoverRating, setHoverRating] = React.useState<number>(0);
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<{ body?: string; rating?: string }>(()=>({}));

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'hmvetruz';
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'blom_unsigned';

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 3);
    setPhotos(files);
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)));
  }

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder', 'blom/reviews');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd });
    const j = await res.json();
    if (!res.ok || j.error) throw new Error(j.error?.message || 'Upload failed');
    return j.secure_url as string;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Basic validation
    const nextErrors: typeof errors = {};
    if (!fd.get('body')) nextErrors.body = 'Please share a few words about your experience';
    if (!rating) nextErrors.rating = 'Please select a star rating';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setStatus('saving');

      // Upload photos to Cloudinary FIRST
      const photoUrls: string[] = [];
      if (photos.length > 0) {
        for (const file of photos) {
          try {
            const url = await uploadToCloudinary(file);
            photoUrls.push(url);
          } catch (err) {
            console.warn('Photo upload failed:', err);
          }
        }
      }

      // Build payload with photo URLs
      const payload = {
        product_slug: productSlug,
        reviewer_name: String(fd.get('name') || 'Anonymous'),
        reviewer_email: String(fd.get('email') || ''),
        rating: Number(rating),
        title: String(fd.get('title') || ''),
        body: String(fd.get('body') || ''),
        photos: photoUrls // ✅ ADD THIS
      };

      console.log('Submitting review with photos:', payload);
      await submitReview(payload);

      setStatus('done');
      setPhotos([]);
      setPhotoPreviews([]);
      setRating(0);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error('Review submission error:', error);
      setStatus('error');
      setErrors({ body: error.message || 'Failed to submit review. Please try again.' });
    }
  }

  const Star: React.FC<{ index: number }> = ({ index }) => (
    <button
      type="button"
      aria-label={`${index} star`}
      onMouseEnter={() => setHoverRating(index)}
      onMouseLeave={() => setHoverRating(0)}
      onClick={() => setRating(index)}
      className="transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 rounded"
    >
      <StarIcon
        className={`w-8 h-8 transition-colors ${
          (hoverRating || rating) >= index
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-300'
        }`}
      />
    </button>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all duration-200 bg-pink-400 hover:bg-pink-500 hover:shadow-lg hover:shadow-pink-400/50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
      >
        <StarIcon className="w-4 h-4" />
        Write a Review
      </button>

      {open && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-pink-50 to-blue-50 border-b border-gray-200">
              <div>
                <h4 className="text-xl font-bold text-gray-900">Write a Review</h4>
                <p className="text-sm text-gray-600 mt-0.5">Share your experience with others</p>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product preview */}
            {product && (
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-white shadow-sm border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                    {product.image ? (
                      <OptimizedImage src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-gray-400 text-center p-2">No image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-lg truncate">{product.name}</div>
                    {typeof product.price === 'number' && (
                      <div className="text-base mt-1">
                        {product.compareAtPrice ? (
                          <>
                            <span className="line-through text-gray-400 mr-2">R{product.compareAtPrice}</span>
                            <span className="font-bold text-pink-400">R{product.price}</span>
                          </>
                        ) : (
                          <span className="font-bold text-gray-900">R{product.price}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="overflow-y-auto flex-1">
              <form onSubmit={onSubmit} className="px-6 py-6 space-y-6">
                {/* Star rating */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Your Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(i => <Star key={i} index={i} />)}
                    {rating > 0 && (
                      <span className="ml-3 text-sm font-medium text-gray-600">
                        {rating === 5 && 'Excellent'}
                        {rating === 4 && 'Good'}
                        {rating === 3 && 'Average'}
                        {rating === 2 && 'Poor'}
                        {rating === 1 && 'Very Poor'}
                      </span>
                    )}
                  </div>
                  {errors.rating && <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <span>⚠</span> {errors.rating}
                  </p>}
                </div>

                {/* Name and Email */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="review-name" className="block text-sm font-semibold text-gray-900 mb-2">
                      Your Name
                    </label>
                    <input
                      id="review-name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="review-email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email <span className="text-gray-500 font-normal text-xs">(optional)</span>
                    </label>
                    <input
                      id="review-email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="review-title" className="block text-sm font-semibold text-gray-900 mb-2">
                    Review Title <span className="text-gray-500 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    id="review-title"
                    name="title"
                    type="text"
                    placeholder="Great product! Highly recommend"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Review body */}
                <div>
                  <label htmlFor="review-body" className="block text-sm font-semibold text-gray-900 mb-2">
                    Your Review <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="review-body"
                    name="body"
                    placeholder="Share details about quality, feel, results, and your overall experience..."
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 min-h-[140px] resize-y"
                  />
                  {errors.body && <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <span>⚠</span> {errors.body}
                  </p>}
                </div>

                {/* Order ID */}
                <div>
                  <label htmlFor="review-order" className="block text-sm font-semibold text-gray-900 mb-2">
                    Order Number <span className="text-gray-500 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    id="review-order"
                    name="order_id"
                    type="text"
                    placeholder="BLM-XXXXXX"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Help us verify your purchase</p>
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Add Photos <span className="text-gray-500 font-normal text-xs">(up to 3, optional)</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-pink-400 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-400 group-hover:text-pink-400 transition-colors" />
                        <p className="mb-1 text-sm font-medium text-gray-600">Click to upload photos</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={onPhotoChange}
                        className="hidden"
                      />
                    </label>
                    {photoPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {photoPreviews.map((src, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={src}
                              alt={`Preview ${i + 1}`}
                              className="w-full h-32 object-cover rounded-xl border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newPhotos = [...photos];
                                const newPreviews = [...photoPreviews];
                                newPhotos.splice(i, 1);
                                newPreviews.splice(i, 1);
                                setPhotos(newPhotos);
                                setPhotoPreviews(newPreviews);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              aria-label="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Verified buyer */}
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <input
                    id="review-verified"
                    name="verified"
                    type="checkbox"
                    className="w-5 h-5 text-pink-400 border-gray-300 rounded focus:ring-pink-400 focus:ring-2 cursor-pointer"
                  />
                  <label htmlFor="review-verified" className="text-sm font-medium text-gray-700 cursor-pointer">
                    I'm a verified buyer of this product
                  </label>
                </div>

                {/* Hidden rating field for compatibility */}
                <input type="hidden" name="rating" value={rating} />

                {/* Success/Error messages */}
                {status === 'done' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">Thank you!</p>
                      <p className="text-sm text-green-700">Your review has been submitted and is awaiting approval.</p>
                    </div>
                  </div>
                )}
                {status === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
                      <X className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-1">Something went wrong</p>
                      <p className="text-sm text-red-700">
                        {errors.body && errors.body !== 'Please share a few words about your experience' 
                          ? errors.body 
                          : 'Please try again later. Check the console for details.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={status === 'saving' || status === 'done'}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 bg-pink-400 hover:bg-pink-500 hover:shadow-lg hover:shadow-pink-400/50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {status === 'saving' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : status === 'done' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Submitted!
                      </>
                    ) : (
                      <>
                        <StarIcon className="w-4 h-4" />
                        Submit Review
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-6 py-3.5 rounded-xl font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


