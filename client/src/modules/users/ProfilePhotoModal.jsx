import { useRef, useState } from "react";
import { X, Upload, RotateCcw } from "lucide-react";

export default function ProfilePhotoModal({
  isOpen,
  isSelf,
  avatarUrl,
  userName,
  onClose,
  onChangePhoto,
  onResetPhoto,
}) {
  const fileInputRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target.result;
        await onChangePhoto(dataUrl);
        onClose();
      } catch (err) {
        console.error("Failed to upload photo:", err);
      } finally {
        setIsUpdating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = async () => {
    setIsUpdating(true);
    try {
      await onResetPhoto();
      onClose();
    } catch (err) {
      console.error("Failed to reset photo:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      {/* Hidden file input for device photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center w-full max-w-sm rounded-[32px] bg-white p-6 sm:p-7 shadow-2xl animate-scale-up"
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Big Instagram-style Profile Avatar View */}
        <div className="relative mb-4 mt-2">
          <div className="h-44 w-44 sm:h-48 sm:w-48 rounded-full p-1 bg-white ring-4 ring-[#f4f2ea] shadow-xl overflow-hidden">
            <img
              src={avatarUrl || "/default-avatar.svg"}
              alt={userName || "Profile photo"}
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.svg";
              }}
              className="h-full w-full rounded-full object-cover select-none"
            />
          </div>
        </div>

        {/* User Name */}
        <h3 className="text-[18px] font-bold text-[#18181b] tracking-tight text-center">
          {userName || "Profile Photo"}
        </h3>
        <p className="text-xs text-[#71717a] mt-0.5 mb-5 text-center">
          {isSelf ? "Your Staple profile picture" : `@${userName}'s profile photo`}
        </p>

        {/* Action Options for Own Profile (like Instagram) */}
        {isSelf && (
          <div className="w-full flex flex-col gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18181b] py-3 px-4 text-[13.5px] font-semibold text-white shadow-xs hover:bg-neutral-800 active:scale-98 transition cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Photo from Computer</span>
            </button>

            <button
              type="button"
              disabled={isUpdating}
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white border border-[#ece8de] py-2.5 px-4 text-[13px] font-medium text-[#ef4444] hover:bg-red-50 hover:border-red-200 active:scale-98 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Remove Current Photo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
