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

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []).slice(0, 4 - files.length);
    if (!selected.length) return;

    setFiles((prev) => [...prev, ...selected]);
    const newPreviews = selected.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;

    setSubmitting(true);
    setError("");
    try {
      let uploadedMedia = [];
      if (files.length > 0) {
        uploadedMedia = await uploadMediaFiles(files);
      }

      const newPost = await createNewPost({
        content: content.trim(),
        media: uploadedMedia,
      });

      // Hydrate default feed counters for instant local render
      onPostCreated({
        ...newPost,
        isLiked: false,
        likeCount: 0,
        commentCount: 0,
      });

      setContent("");
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      setFiles([]);
      setPreviews([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-neutral-800/70 px-4 py-4 sm:px-6"
    >
      <div className="flex gap-3.5">
        <img
          src={
            user?.avatar ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${user?.username}`
          }
          alt={user?.username}
          className="h-10 w-10 shrink-0 rounded-full object-cover bg-neutral-800"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a thought, snippet, or update..."
            className="w-full resize-none bg-transparent text-sm text-white placeholder-neutral-500 outline-none sm:text-base"
          />

          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {previews.map((item, idx) => (
                <div
                  key={item.url}
                  className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      className="h-40 w-full object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt="Attachment preview"
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute top-2 right-2 rounded-full bg-neutral-950/80 p-1 text-neutral-200 hover:bg-neutral-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-between border-t border-neutral-800/60 pt-3">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={files.length >= 4 || submitting}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-neutral-900 hover:text-white disabled:opacity-40"
              >
                <ImagePlus className="h-4 w-4" />
                <span>Media ({files.length}/4)</span>
              </button>
            </div>

            <RollButton
              type="submit"
              disabled={submitting || (!content.trim() && files.length === 0)}
              className="px-4 py-1.5 text-xs"
            >
              {submitting ? "Posting..." : "Post"}
            </RollButton>
          </div>
        </div>
      </div>
    </form>
  );
}