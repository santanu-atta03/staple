import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createNewPost, uploadMediaFiles } from "./feed.api";
import RollButton from "../../components/RollButton";

export default function PostComposer({ onPostCreated }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []).slice(
      0,
      4 - files.length,
    );

    if (!selected.length) return;

    setFiles((current) => [...current, ...selected]);

    setPreviews((current) => [
      ...current,
      ...selected.map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
      })),
    ]);

    event.target.value = "";
  };

  const removeAttachment = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles((current) => current.filter((_, i) => i !== index));
    setPreviews((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!content.trim() && files.length === 0) return;

    setSubmitting(true);
    setError("");

    try {
      const media = files.length ? await uploadMediaFiles(files) : [];

      const post = await createNewPost({
        content: content.trim(),
        media,
      });

      onPostCreated({
        ...post,
        isLiked: false,
        likeCount: 0,
        commentCount: 0,
      });

      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
      setContent("");
      setFiles([]);
      setPreviews([]);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Failed to publish post.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-[22px] border border-[#f2f2f2] bg-white px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <img
          src={
            user?.avatar ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${user?.username}`
          }
          alt={user?.username}
          className="h-8 w-8 rounded-full bg-[#e8e5df] object-cover"
        />

        <textarea
          rows={1}
          data-post-composer
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={`What's on your mind, ${
            user?.name?.split(" ")[0] || user?.username || "there"
          }?`}
          className="h-9 flex-1 resize-none rounded-full bg-[#f3f1ed] px-4 py-[9px] text-[11px] outline-none focus:ring-1 focus:ring-[#9b60aa]"
        />
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {previews.map((preview, index) => (
            <div
              key={preview.url}
              className="relative overflow-hidden rounded-xl border border-[#e5e7eb]"
            >
              {preview.type === "video" ? (
                <video
                  src={preview.url}
                  controls
                  className="h-40 w-full object-cover"
                />
              ) : (
                <img
                  src={preview.url}
                  alt="Preview"
                  className="h-40 w-full object-cover"
                />
              )}

              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="absolute right-2 top-2 rounded-full bg-black/80 p-1 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#b30000]">{error}</p>}

      <div className="mt-3 flex items-center justify-between border-t border-[#eeeae2] pt-3">
        <button
          type="button"
          disabled={files.length >= 4 || submitting}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] text-[#616161]"
        >
          <ImagePlus className="h-4 w-4" />
          Media ({files.length}/4)
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <RollButton
          type="submit"
          disabled={submitting || (!content.trim() && files.length === 0)}
          className="bg-black px-4 py-1.5 text-xs text-white"
        >
          {submitting ? "Posting..." : "Post"}
        </RollButton>
      </div>
    </form>
  );
}