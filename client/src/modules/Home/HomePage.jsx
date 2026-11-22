import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Image as ImageIcon,
  Smile,
  UserPlus,
  Film,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Check,
  MapPin,
  TrendingUp,
  Users,
  Camera,
  Footprints,
  Music2,
  ArrowRight,
  Play,
  Pause,
  Coffee,
  X,
  Trash2,
  Loader2,
  Plus,
  Inbox,
  PenTool,
  Edit3,
  Globe,
  Lock,
  Eye,
  FileText,
  CornerDownRight,
  Share2,
  UploadCloud,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchFeed,
  createNewPost,
  deletePost,
  editPost,
  togglePostLike,
  addPostComment,
  replyToComment,
  deleteComment,
  voteOnPoll,
  toggleBookmark,
  toggleAudioPlayback,
  fetchStoriesList,
  markStoryViewed,
  deleteStory,
  fetchSidebarData,
  toggleFollowPerson,
  toggleGroupMembership,
  uploadMediaFiles,
} from "./home.api";

import StoryViewerModal from "./StoryViewerModal";
import StoryUploadModal from "./StoryUploadModal";
import GroupDetailsModal from "./GroupDetailsModal";
import CreateGroupModal from "./CreateGroupModal";
import EditPostModal from "./EditPostModal";

export default function HomePage() {
  const { user } = useAuth();
  const [feedTab, setFeedTab] = useState("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Dynamic posts fetched strictly from backend database
  const [posts, setPosts] = useState([]);

  // Stories fetched from backend
  const [stories, setStories] = useState([]);

  // Sidebar Suggestions fetched from backend
  const [people, setPeople] = useState([]);
  const [trending, setTrending] = useState([]);
  const [groups, setGroups] = useState([]);

  // Composer State
  const [composerText, setComposerText] = useState("");
  const [selectedFeeling, setSelectedFeeling] = useState("");
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [composerMediaList, setComposerMediaList] = useState([]);
  const [composerLocation, setComposerLocation] = useState("San Francisco, CA");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [postVisibility, setPostVisibility] = useState("public");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Story Modals
  const [viewerStoryIndex, setViewerStoryIndex] = useState(null);
  const [showStoryUploadModal, setShowStoryUploadModal] = useState(false);

  // Group Modals
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  // Edit Post Modal
  const [editingPost, setEditingPost] = useState(null);

  // Active Comments Inputs & Expanded States
  const [commentInputs, setCommentInputs] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState(null); // commentId
  const [expandedComments, setExpandedComments] = useState({});

  // Audio Playback
  const [activeAudioPostId, setActiveAudioPostId] = useState(null);

  // Search input focus / recent searches
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const recentSearches = ["#filmphotography", "#spatialdesign", "Marcus Chen", "Copenhagen", "Tokyo"];

  // Toast alert
  const [toastMessage, setToastMessage] = useState(null);

  const composerInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // 1. Initial Load: Fetch Feed, Stories, and Sidebar from Backend DB
  const loadFeedData = async () => {
    setIsLoadingFeed(true);
    try {
      const feedData = await fetchFeed(feedTab, searchQuery);
      setPosts(feedData || []);
    } catch (err) {
      console.error("Feed load error:", err);
      setPosts([]);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const loadSidebarData = async () => {
    try {
      const data = await fetchSidebarData();
      if (data) {
        if (data.people) setPeople(data.people);
        if (data.trending) setTrending(data.trending);
        if (data.groups) setGroups(data.groups);
      }
    } catch (err) {
      console.warn("Sidebar load error:", err);
    }
  };

  const loadStoriesData = async () => {
    try {
      const data = await fetchStoriesList();
      setStories(data || []);
    } catch (err) {
      console.warn("Stories load error:", err);
    }
  };

  useEffect(() => {
    loadFeedData();
  }, [feedTab]);

  useEffect(() => {
    loadSidebarData();
    loadStoriesData();

    // Check for saved local draft
    const draft = localStorage.getItem("staple_post_draft");
    if (draft) {
      try {
        setSavedDraft(JSON.parse(draft));
      } catch (e) {}
    }

    // Listen for global posts created from AppLayout
    const handleGlobalPostCreated = (e) => {
      if (e.detail) {
        setPosts((prev) => [e.detail, ...prev]);
        loadSidebarData();
        showToast("New post appeared in feed!");
      }
    };
    window.addEventListener("staple:post_created", handleGlobalPostCreated);
    return () => window.removeEventListener("staple:post_created", handleGlobalPostCreated);
  }, []);

  // 2. Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      loadFeedData();
    }, 280);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handler: Real File Upload (Cloudinary / Backend Storage)
  const handleMediaUpload = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setIsUploadingMedia(true);
    try {
      const uploaded = await uploadMediaFiles(files);
      if (uploaded && uploaded.length > 0) {
        setComposerMediaList((prev) => [...prev, ...uploaded]);
        showToast(`Uploaded ${uploaded.length} photo(s) via Cloudinary`);
      }
    } catch (err) {
      console.error("Media upload error:", err);
      showToast("Photo upload failed");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveComposerMedia = (index) => {
    setComposerMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Handler: Draft management
  const handleSaveDraft = () => {
    if (!composerText.trim() && composerMediaList.length === 0) return;
    const draft = {
      text: composerText,
      media: composerMediaList,
      feeling: selectedFeeling,
      location: composerLocation,
      savedAt: new Date().toLocaleTimeString(),
    };
    localStorage.setItem("staple_post_draft", JSON.stringify(draft));
    setSavedDraft(draft);
    showToast("Draft saved locally");
  };

  const handleRestoreDraft = () => {
    if (!savedDraft) return;
    setComposerText(savedDraft.text || "");
    setComposerMediaList(savedDraft.media || []);
    setSelectedFeeling(savedDraft.feeling || "");
    setComposerLocation(savedDraft.location || "San Francisco, CA");
    showToast("Draft loaded into composer");
  };

  const handleClearDraft = () => {
    localStorage.removeItem("staple_post_draft");
    setSavedDraft(null);
    showToast("Draft cleared");
  };

  // Handler: Create Post (100% Backend & DB)
  const handleCreatePost = async (e) => {
    e?.preventDefault();
    if (!composerText.trim() && composerMediaList.length === 0) return;

    setIsSubmittingPost(true);
    const postPayload = {
      content: composerText.trim() + (selectedFeeling ? ` — feeling ${selectedFeeling}` : ""),
      media: composerMediaList,
      location: composerLocation,
      visibility: postVisibility,
    };

    try {
      const newPost = await createNewPost(postPayload);
      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
        showToast("Post published to database!");
        // Clear draft if it matched
        handleClearDraft();
        loadSidebarData();
      }
    } catch (err) {
      console.error("Failed to create post:", err);
      showToast("Failed to publish post");
    } finally {
      setComposerText("");
      setSelectedFeeling("");
      setComposerMediaList([]);
      setIsPreviewMode(false);
      setIsSubmittingPost(false);
    }
  };

  // Handler: Delete Post (Backend & DB)
  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      showToast("Post deleted from database");
      loadSidebarData();
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // Handler: Toggle Like (Backend & DB)
  const handleToggleLike = async (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id === postId) {
          const newLiked = !p.isLiked;
          const newLikes = Math.max(0, (p.likesCount || 0) + (newLiked ? 1 : -1));
          return { ...p, isLiked: newLiked, likesCount: newLikes };
        }
        return p;
      })
    );

    try {
      const res = await togglePostLike(postId);
      if (res) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId
              ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount }
              : p
          )
        );
      }
    } catch (err) {
      console.warn("Backend like sync failed:", err);
    }
  };

  // Handler: Toggle Bookmark (Backend & DB)
  const handleToggleBookmark = async (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id === postId) {
          return { ...p, isSaved: !p.isSaved };
        }
        return p;
      })
    );

    try {
      const res = await toggleBookmark(postId);
      showToast(res.isSaved ? "Saved to Bookmarks" : "Removed from Bookmarks");
    } catch (err) {
      console.warn("Backend bookmark sync:", err);
    }
  };

  // Handler: Add Comment (Backend & DB)
  const handleAddComment = async (postId, e) => {
    e?.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

    try {
      const res = await addPostComment(postId, commentText);
      if (res && res.comment) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p._id === postId) {
              return {
                ...p,
                commentsCount: res.commentsCount,
                comments: res.comments,
              };
            }
            return p;
          })
        );
        showToast("Comment posted!");
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  // Handler: Add Threaded Reply to Comment
  const handleAddReply = async (postId, commentId, e) => {
    e?.preventDefault();
    const replyText = replyInputs[commentId]?.trim();
    if (!replyText) return;

    setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
    setActiveReplyBox(null);

    try {
      const res = await replyToComment(postId, commentId, replyText);
      if (res && res.comments) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p._id === postId) {
              return {
                ...p,
                commentsCount: res.commentsCount,
                comments: res.comments,
              };
            }
            return p;
          })
        );
        showToast("Reply sent!");
      }
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  // Handler: Delete Comment
  const handleDeleteComment = async (postId, commentId) => {
    try {
      await deleteComment(postId, commentId);
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === postId) {
            const nextComments = (p.comments || []).filter((c) => c._id !== commentId);
            return {
              ...p,
              commentsCount: Math.max(0, (p.commentsCount || 1) - 1),
              comments: nextComments,
            };
          }
          return p;
        })
      );
      showToast("Comment deleted");
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Handler: Vote on Poll (Backend & DB)
  const handleVotePoll = async (postId, optionId) => {
    try {
      const updatedPoll = await voteOnPoll(postId, optionId);
      if (updatedPoll) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, poll: updatedPoll } : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  // Handler: Toggle Audio
  const handleToggleAudio = async (postId) => {
    const isPlaying = activeAudioPostId === postId;
    setActiveAudioPostId(isPlaying ? null : postId);

    try {
      await toggleAudioPlayback(postId);
    } catch (err) {
      console.warn("Backend audio sync:", err);
    }
  };

  // Handler: Follow Person (Backend & DB)
  const handleToggleFollow = async (personId) => {
    try {
      const updatedPerson = await toggleFollowPerson(personId);
      if (updatedPerson) {
        setPeople((prev) =>
          prev.map((p) => (p.id === personId ? updatedPerson : p))
        );
        showToast(
          updatedPerson.isFollowing
            ? `Followed ${updatedPerson.name}`
            : `Unfollowed ${updatedPerson.name}`
        );
        if (feedTab === "following") {
          loadFeedData();
        }
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  // Handler: Dismiss Suggested Person
  const handleDismissPerson = (personId) => {
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    showToast("Suggestion dismissed");
  };

  // Handler: Join Group (Backend & DB)
  const handleToggleGroup = async (groupId) => {
    try {
      const updatedGroup = await toggleGroupMembership(groupId);
      if (updatedGroup) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? updatedGroup : g))
        );
        showToast(
          updatedGroup.joined
            ? `Joined ${updatedGroup.name}`
            : `Left ${updatedGroup.name}`
        );
      }
    } catch (err) {
      console.error("Failed to toggle group:", err);
    }
  };

  // Handler: Click Trending Tag
  const handleSelectTrending = (tag) => {
    const cleanTag = tag.replace("#", "");
    setSearchQuery(cleanTag);
    showToast(`Filtering by ${tag}`);
  };

  // Handler: Story actions
  const handleOpenStoryViewer = (index) => {
    setViewerStoryIndex(index);
    const story = stories[index];
    if (story) {
      markStoryViewed(story.id).catch(() => {});
      // update state
      setStories((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, isViewed: true } : s))
      );
    }
  };

  const handleDeleteOwnStory = async (storyId) => {
    try {
      await deleteStory(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      setViewerStoryIndex(null);
      showToast("Story deleted");
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  return (
    <div className="w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-xl backdrop-blur animate-fade-in-slide">
          {toastMessage}
        </div>
      )}

      {/* Broad 2-Column Grid with generous spacing */}
      <div className="flex justify-between gap-6 pt-3 pb-16 lg:gap-8 xl:gap-10 lg:pt-4">
        {/* CENTER FEED COLUMN: Broad and spacious */}
        <section className="w-full flex-1 max-w-[700px] xl:max-w-[730px] space-y-4 sm:space-y-5">
          {/* TOP TABS & CONTROLS */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedTab("for-you")}
                className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-all duration-150 ${
                  feedTab === "for-you"
                    ? "bg-white text-black shadow-xs ring-1 ring-black/5"
                    : "text-[#52525b] hover:text-black"
                }`}
              >
                For You
              </button>
              <button
                type="button"
                onClick={() => setFeedTab("following")}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[14px] font-medium transition-all duration-150 ${
                  feedTab === "following"
                    ? "bg-white text-black shadow-xs ring-1 ring-black/5 font-semibold"
                    : "text-[#52525b] hover:text-black"
                }`}
              >
                <span>Following</span>
                <span className="h-2 w-2 rounded-full bg-[#35675d]" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Feed preferences"
                onClick={() => showToast("Feed filtered by chronological freshness")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#71717a] hover:bg-[#edeae3] hover:text-black transition"
              >
                <SlidersHorizontal className="h-4.5 w-4.5 stroke-[1.8]" />
              </button>
              <button
                type="button"
                aria-label="Curated mode"
                onClick={() => showToast("Curated algorithmic ranking refreshed")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#71717a] hover:bg-[#edeae3] hover:text-black transition"
              >
                <Sparkles className="h-4.5 w-4.5 stroke-[1.8]" />
              </button>
            </div>
          </div>

          {/* STORIES ROW */}
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="no-scrollbar flex items-center gap-4 sm:gap-5 overflow-x-auto px-1">
              {/* Elena's Create Story Slot */}
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      const ownStoryIdx = stories.findIndex((s) => s.isYours);
                      if (ownStoryIdx !== -1) {
                        handleOpenStoryViewer(ownStoryIdx);
                      } else {
                        setShowStoryUploadModal(true);
                      }
                    }}
                    className="flex h-15 w-15 items-center justify-center rounded-full p-[1.5px] transition hover:scale-105"
                  >
                    <img
                      src="/recreation/avatar_left_elena_hires.png"
                      alt="Your story"
                      onError={(e) => {
                        e.target.src = "/recreation/avatar_left_elena.png";
                      }}
                      className="h-full w-full rounded-full object-cover ring-2 ring-[#dcd8ce]"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStoryUploadModal(true)}
                    title="Add a new story"
                    className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1863dc] text-[12px] font-bold text-white shadow-xs transition hover:scale-110 active:scale-95"
                  >
                    +
                  </button>
                </div>
                <span className="max-w-18 truncate text-[12px] font-medium text-[#27272a]">
                  Your story
                </span>
              </div>

              {/* Dynamic Stories List */}
              {stories
                .map((story, originalIdx) => ({ story, originalIdx }))
                .filter(({ story }) => !story.isYours)
                .map(({ story, originalIdx }) => (
                  <button
                    key={story.id || originalIdx}
                    type="button"
                    onClick={() => handleOpenStoryViewer(originalIdx)}
                    className="group flex shrink-0 cursor-pointer flex-col items-center gap-1.5"
                  >
                    <div
                      className={`flex h-15 w-15 items-center justify-center rounded-full p-[2.5px] transition group-hover:scale-105 ${
                        story.isViewed
                          ? "ring-2 ring-[#e4e0d6]"
                          : "bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] to-[#8b5cf6]"
                      }`}
                    >
                      <div className="h-full w-full rounded-full bg-white p-[1.5px]">
                        <img
                          src={story.avatar || "/recreation/avatar_maya.png"}
                          alt={story.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      </div>
                    </div>
                    <span className="max-w-18 truncate text-[12px] font-medium text-[#27272a]">
                      {story.name}
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* POST COMPOSER */}
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            {/* Draft Banner if exists */}
            {savedDraft && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-[#faf7f0] border border-[#f0ece0] px-3 py-1.5 text-[12px]">
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Unsaved draft from {savedDraft.savedAt}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDraft}
                    className="font-semibold text-[#1863dc] hover:underline"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="text-neutral-400 hover:text-rose-600"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreatePost}>
              <div className="flex items-start gap-3">
                <img
                  src="/recreation/avatar_left_elena_hires.png"
                  alt="Elena Vance"
                  onError={(e) => {
                    e.target.src = "/recreation/avatar_left_elena.png";
                  }}
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 mt-1"
                />

                <div className="flex-1 space-y-2">
                  {/* Visibility & Location Tags Header */}
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                    <div className="flex items-center gap-1 rounded-full bg-[#f2efe9] px-2.5 py-0.5 text-neutral-700">
                      {postVisibility === "public" ? (
                        <Globe className="h-3 w-3 text-neutral-500" />
                      ) : postVisibility === "close_friends" ? (
                        <Users className="h-3 w-3 text-neutral-500" />
                      ) : (
                        <Lock className="h-3 w-3 text-neutral-500" />
                      )}
                      <select
                        value={postVisibility}
                        onChange={(e) => setPostVisibility(e.target.value)}
                        className="bg-transparent text-[11.5px] font-medium outline-none cursor-pointer"
                      >
                        <option value="public">Public</option>
                        <option value="close_friends">Close Friends</option>
                        <option value="private">Only Me</option>
                      </select>
                    </div>

                    {showLocationInput ? (
                      <div className="flex items-center gap-1 rounded-full bg-[#f2efe9] px-2.5 py-0.5">
                        <MapPin className="h-3 w-3 text-neutral-500" />
                        <input
                          type="text"
                          value={composerLocation}
                          onChange={(e) => setComposerLocation(e.target.value)}
                          className="bg-transparent text-[11.5px] outline-none w-32"
                          placeholder="Location..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowLocationInput(false)}
                          className="text-neutral-400 hover:text-black"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLocationInput(true)}
                        className="flex items-center gap-1 rounded-full bg-[#f2efe9] px-2.5 py-0.5 text-neutral-600 hover:text-black transition"
                      >
                        <MapPin className="h-3 w-3 text-neutral-500" />
                        <span>{composerLocation}</span>
                      </button>
                    )}

                    {/* Preview Switch Button */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                      className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                        isPreviewMode
                          ? "bg-black text-white"
                          : "bg-[#f2efe9] text-neutral-600 hover:text-black"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      <span>{isPreviewMode ? "Editing" : "Preview"}</span>
                    </button>
                  </div>

                  {/* Input or Preview Mode */}
                  {isPreviewMode ? (
                    <div className="rounded-2xl border border-dashed border-[#dcd8ce] bg-[#fbfaf8] p-3 text-[13.5px] leading-relaxed text-neutral-800">
                      <p>{composerText || "Preview text will show here..."}</p>
                      {selectedFeeling && (
                        <p className="mt-1 text-[12px] font-semibold text-amber-600">
                          — feeling {selectedFeeling}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl bg-[#f2efe9] px-4 py-2.5 focus-within:ring-1 focus-within:ring-[#1863dc]">
                      <textarea
                        ref={composerInputRef}
                        data-post-composer
                        rows={2}
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        placeholder="What's on your mind, Elena?"
                        className="w-full resize-none bg-transparent text-[13.5px] text-[#18181b] placeholder-[#71717a] outline-none"
                      />
                      {isSubmittingPost || isUploadingMedia ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#1863dc]" />
                      ) : (
                        <Sparkles className="h-4 w-4 shrink-0 text-[#a1a1aa]" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Media Preview Grid (Cloudinary attachments) */}
              {composerMediaList.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 px-1">
                  {composerMediaList.map((media, idx) => (
                    <div
                      key={idx}
                      className="group relative h-28 overflow-hidden rounded-xl border border-black/5 bg-neutral-100"
                    >
                      <img
                        src={media.url}
                        alt="Uploaded preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveComposerMedia(idx)}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Feeling Pill */}
              {selectedFeeling && (
                <div className="mt-2.5 flex items-center gap-2 px-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5eb] border border-[#fbd8b5] px-2.5 py-0.5 text-[11px] font-medium text-[#b45309]">
                    <span>Feeling {selectedFeeling}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFeeling("")}
                      className="hover:text-black font-bold"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}

              {/* Feelings Picker Popup */}
              {showFeelingPicker && (
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#fbfaf8] border border-[#ece8de] p-3 text-[12px] animate-fade-in">
                  {[
                    "✨ Grateful",
                    "☕ Cozy",
                    "📸 Inspired",
                    "🍵 Calm",
                    "🌿 Peaceful",
                    "🎧 In the Groove",
                    "🗼 Exploring",
                    "🎨 Creating",
                    "📚 Focused",
                  ].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setSelectedFeeling(f);
                        setShowFeelingPicker(false);
                      }}
                      className="rounded-lg p-2 text-left hover:bg-[#edeae3] transition"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}

              {/* Hidden File Input for Cloudinary Uploads */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaUpload}
              />

              {/* Composer Action Buttons */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#f2eee4] pt-3 px-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#3f3f46] hover:text-black transition disabled:opacity-50"
                  >
                    <ImageIcon className="h-4.5 w-4.5 text-[#10b981]" />
                    <span>{isUploadingMedia ? "Uploading..." : "Photo/Video"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFeelingPicker(!showFeelingPicker)}
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#3f3f46] hover:text-black transition"
                  >
                    <Smile className="h-4.5 w-4.5 text-[#f59e0b]" />
                    <span>Feeling</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setComposerText((t) => t + " @marcus_v @sarah_lin ");
                    }}
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#3f3f46] hover:text-black transition"
                  >
                    <UserPlus className="h-4.5 w-4.5 text-[#1863dc]" />
                    <span>Tag friends</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setComposerText((t) => t + " #StapleReel ");
                    }}
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#3f3f46] hover:text-black transition"
                  >
                    <Film className="h-4.5 w-4.5 text-[#ef4444]" />
                    <span>Reel</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={!composerText.trim() && composerMediaList.length === 0}
                    className="rounded-full px-3 py-1 text-[12px] font-medium text-neutral-500 hover:bg-[#edeae3] hover:text-neutral-800 transition disabled:opacity-40"
                  >
                    Save Draft
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmittingPost ||
                      isUploadingMedia ||
                      (!composerText.trim() && composerMediaList.length === 0)
                    }
                    className="flex items-center gap-1.5 rounded-full bg-black px-5 py-1.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-neutral-800 active:scale-95 disabled:opacity-40"
                  >
                    {isSubmittingPost ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <span>Post</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* LOADING STATE */}
          {isLoadingFeed && (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#ece8de]/60 bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <Loader2 className="h-6 w-6 animate-spin text-[#1863dc]" />
              <p className="mt-3 text-[13px] font-medium text-[#71717a]">
                Fetching feed from database...
              </p>
            </div>
          )}

          {/* EMPTY STATE (Clean Initial Database State) */}
          {!isLoadingFeed && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#ece8de]/60 bg-white p-10 sm:p-14 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)] animate-fade-in-slide">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f2ea] text-[#71717a]">
                {feedTab === "following" ? (
                  <Users className="h-7 w-7 stroke-[1.5]" />
                ) : (
                  <Inbox className="h-7 w-7 stroke-[1.5]" />
                )}
              </div>

              <h3 className="mt-4 text-[18px] font-bold text-[#18181b]">
                {searchQuery
                  ? `No posts found for "${searchQuery}"`
                  : feedTab === "following"
                  ? "Your Following feed is clean"
                  : "No posts yet"}
              </h3>

              <p className="mt-1.5 max-w-[380px] text-[13px] leading-relaxed text-[#71717a]">
                {searchQuery
                  ? "Try searching for a different creator, keyword, or hashtag."
                  : feedTab === "following"
                  ? "Follow fellow visual artists, architects, or photographers in the sidebar to curate your personal stream."
                  : "Your database is initialized with zero posts. Be the first to share an essay, street photograph, or thoughts above!"}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {feedTab === "following" ? (
                  <button
                    type="button"
                    onClick={() => setFeedTab("for-you")}
                    className="rounded-full bg-black px-5 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-neutral-800"
                  >
                    Explore For You Feed
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      composerInputRef.current?.focus();
                      composerInputRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                    className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-neutral-800"
                  >
                    <PenTool className="h-4 w-4" />
                    <span>Create Your First Post</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DYNAMIC POSTS STREAM (RENDERED STRICTLY FROM DATABASE) */}
          {!isLoadingFeed &&
            posts.map((post) => {
              const author = post.authorId || {};
              const isAuthorElena = author.username === "elenavance";
              const isPlayingAudio = activeAudioPostId === post._id;

              return (
                <article
                  key={post._id}
                  className="rounded-[22px] border border-[#ece8de]/60 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in-slide"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {author.avatar ? (
                        <img
                          src={author.avatar}
                          alt={author.name}
                          onError={(e) => {
                            e.target.src =
                              author.fallbackAvatar || "/recreation/avatar_left_elena.png";
                          }}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                        />
                      ) : (
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            post.authorId?.avatarBg || "bg-[#f87171]"
                          } text-white text-[12px] font-bold`}
                        >
                          {author.initials || "ST"}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5 leading-tight">
                          <Link
                            to={`/u/${author.username || "elenavance"}`}
                            className="text-[13.5px] font-semibold text-[#18181b] hover:underline"
                          >
                            {author.name || "Elena Vance"}
                          </Link>
                          {author.isVerified && (
                            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white">
                              <Check className="h-2 w-2 stroke-[3]" />
                            </span>
                          )}
                          <span className="text-[12px] text-[#71717a]">
                            {author.username ? `@${author.username} • ` : "• "}
                            {post.time || "Just now"}
                          </span>
                        </div>
                        {post.location && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[#71717a]">
                            <MapPin className="h-3 w-3 stroke-[1.8] text-[#71717a]" />
                            <span>{post.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.badge && (
                        <span className="rounded-md bg-[#e7f7ed] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#2d7a4d]">
                          {post.badge}
                        </span>
                      )}

                      {/* Edit Button for own posts */}
                      {isAuthorElena && (
                        <button
                          type="button"
                          onClick={() => setEditingPost(post)}
                          title="Edit post"
                          className="rounded-lg p-1 text-[#71717a] hover:text-black transition"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        aria-label="More options"
                        onClick={() => {
                          if (isAuthorElena) {
                            handleDeletePost(post._id);
                          } else {
                            navigator.clipboard?.writeText(
                              window.location.origin + "/post/" + post._id
                            );
                            showToast("Post link copied to clipboard!");
                          }
                        }}
                        className="rounded-lg p-1 text-[#71717a] hover:text-black transition"
                      >
                        {isAuthorElena ? (
                          <Trash2 className="h-4 w-4 text-[#ef4444]" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Content Text */}
                  <div className="mt-3 space-y-1">
                    <p className="text-[13.5px] leading-[1.5] text-[#27272a] whitespace-pre-wrap">
                      {post.content}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectTrending(tag)}
                            className="text-[12.5px] font-medium text-[#1863dc] hover:underline"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Media Attachment (Supports Multiple Images via Cloudinary) */}
                  {post.media && post.media.length > 0 && (
                    <div
                      className={`mt-3.5 overflow-hidden rounded-2xl border border-[#e8e4da] bg-[#f4f5f0] ${
                        post.media.length > 1 ? "grid grid-cols-2 gap-1.5 p-1" : ""
                      }`}
                    >
                      {post.media.map((item, mIdx) => (
                        <div key={mIdx} className="relative overflow-hidden rounded-xl">
                          <img
                            src={item.url}
                            alt={item.alt || "Post Media"}
                            className={`w-full object-cover ${
                              post.media.length === 1 ? "h-auto max-h-[520px]" : "h-56"
                            }`}
                          />
                          {item.badge && (
                            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                              <Camera className="h-3 w-3" />
                              <span>{item.badge}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audio Card Widget */}
                  {post.audio && (
                    <div className="mt-3.5 flex items-center justify-between rounded-2xl bg-[#f2efe8] p-3 sm:p-3.5 transition-colors hover:bg-[#eae6dd]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fae4af] text-[#b45309] shadow-2xs">
                          <Coffee className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#18181b]">
                            {post.audio.title}
                          </p>
                          <p className="text-[11.5px] text-[#71717a]">
                            {isPlayingAudio
                              ? "● Playing now (48kHz Lossless)"
                              : post.audio.subtitle}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleAudio(post._id)}
                        className="flex items-center gap-1.5 rounded-full border border-neutral-300/60 bg-white/90 px-3.5 py-1 text-[12px] font-medium text-[#18181b] shadow-2xs hover:bg-white active:scale-95"
                      >
                        {isPlayingAudio ? (
                          <>
                            <Pause className="h-3 w-3 fill-current" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 fill-current" />
                            <span>Play</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Poll Card Widget */}
                  {post.poll && (
                    <div className="mt-3.5 space-y-2">
                      {post.poll.options.map((opt) => {
                        const total = post.poll.totalVotes || 1;
                        const pct = Math.round((opt.votes / total) * 100);
                        const isSelected = post.poll.selectedOption === opt.id;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleVotePoll(post._id, opt.id)}
                            className={`group relative flex w-full items-center justify-between overflow-hidden rounded-xl bg-[#f4f2ea] p-2.5 sm:p-3 text-left text-[13px] transition ${
                              isSelected ? "ring-1 ring-[#10b981]" : ""
                            }`}
                          >
                            <div
                              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                isSelected ? "bg-[#d1ede1]" : "bg-[#e4e2da]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative z-10 flex items-center gap-2.5 font-medium text-[#18181b]">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/70 text-[10.5px] font-bold text-[#18181b]">
                                {opt.label || opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            <span className="relative z-10 font-bold text-[#18181b]">
                              {pct}%
                            </span>
                          </button>
                        );
                      })}

                      <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-[#71717a]">
                        <span>
                          {post.poll.totalVotes?.toLocaleString()} votes •{" "}
                          {post.poll.expiresIn || "active"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            showToast(`Total verified votes: ${post.poll.totalVotes}`)
                          }
                          className="font-medium text-[#1863dc] hover:underline"
                        >
                          See results breakdown
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="mt-3.5 flex items-center justify-between text-[#3f3f46]">
                    <div className="flex items-center gap-4 sm:gap-5">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(post._id)}
                        className="flex items-center gap-1.5 transition active:scale-90"
                      >
                        <Heart
                          className={`h-5 w-5 transition-transform ${
                            post.isLiked
                              ? "fill-[#ef4444] text-[#ef4444] scale-110"
                              : "text-[#3f3f46] hover:text-black"
                          }`}
                        />
                        <span className="text-[12.5px] font-medium">
                          {post.likesCount || 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post._id]: !prev[post._id],
                          }))
                        }
                        className="flex items-center gap-1.5 transition hover:text-black active:scale-90"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-[12.5px] font-medium">
                          {post.commentsCount || 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            window.location.origin + "/post/" + post._id
                          );
                          showToast("Link copied to clipboard!");
                        }}
                        className="flex items-center transition hover:text-black active:scale-90"
                      >
                        <Share2 className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(post._id)}
                      className="transition active:scale-90"
                    >
                      <Bookmark
                        className={`h-5 w-5 ${
                          post.isSaved
                            ? "fill-black text-black"
                            : "text-[#3f3f46] hover:text-black"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Comments Preview */}
                  {post.commentsCount > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post._id]: !prev[post._id],
                        }))
                      }
                      className="mt-2 block text-[12px] text-[#71717a] hover:underline"
                    >
                      {expandedComments[post._id]
                        ? "Hide comments"
                        : `View all ${post.commentsCount} comments`}
                    </button>
                  )}

                  {/* Render Comments & Threaded Replies */}
                  <div className="mt-2 space-y-2">
                    {(post.comments || []).map((comm, idx) => (
                      <div key={comm._id || idx} className="group/comm text-[12.5px] text-[#27272a]">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-black">
                              {comm.author?.name || "Elena Vance"}
                            </span>{" "}
                            <span>{comm.content}</span>
                          </div>

                          <div className="flex items-center gap-2 opacity-0 group-hover/comm:opacity-100 transition text-[11px] text-neutral-400">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReplyBox(
                                  activeReplyBox === comm._id ? null : comm._id
                                )
                              }
                              className="hover:text-black hover:underline"
                            >
                              Reply
                            </button>
                            {comm.author?.name === "Elena Vance" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(post._id, comm._id)}
                                className="hover:text-rose-600"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Threaded Replies */}
                        {comm.replies && comm.replies.length > 0 && (
                          <div className="ml-5 mt-1.5 space-y-1.5 border-l-2 border-[#ece8de] pl-2.5">
                            {comm.replies.map((reply, rIdx) => (
                              <div key={reply._id || rIdx} className="text-[12px]">
                                <span className="font-semibold text-black">
                                  {reply.author?.name || "Elena Vance"}
                                </span>{" "}
                                <span className="text-neutral-700">{reply.content}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input Box */}
                        {activeReplyBox === comm._id && (
                          <form
                            onSubmit={(e) => handleAddReply(post._id, comm._id, e)}
                            className="ml-5 mt-2 flex items-center gap-2"
                          >
                            <CornerDownRight className="h-3.5 w-3.5 text-neutral-400" />
                            <input
                              type="text"
                              value={replyInputs[comm._id] || ""}
                              onChange={(e) =>
                                setReplyInputs({
                                  ...replyInputs,
                                  [comm._id]: e.target.value,
                                })
                              }
                              placeholder={`Reply to ${comm.author?.name || "comment"}...`}
                              className="flex-1 rounded-full border border-[#ece8de] bg-[#fbf9f5] px-3 py-1 text-[12px] outline-none focus:border-black"
                            />
                            <button
                              type="submit"
                              disabled={!replyInputs[comm._id]?.trim()}
                              className="rounded-full bg-black px-3 py-1 text-[11.5px] font-semibold text-white disabled:opacity-40"
                            >
                              Send
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Inline Comment Input Box */}
                  <form
                    onSubmit={(e) => handleAddComment(post._id, e)}
                    className="mt-2.5 flex items-center justify-between gap-2.5 border-t border-[#f4f1ea] pt-2"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <img
                        src="/recreation/avatar_left_elena_hires.png"
                        alt="Elena Vance"
                        className="h-5 w-5 rounded-full object-cover"
                      />
                      <input
                        type="text"
                        value={commentInputs[post._id] || ""}
                        onChange={(e) =>
                          setCommentInputs({
                            ...commentInputs,
                            [post._id]: e.target.value,
                          })
                        }
                        placeholder="Add a comment..."
                        className="w-full bg-transparent text-[12.5px] text-[#18181b] placeholder-[#a1a1aa] outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!commentInputs[post._id]?.trim()}
                      className="text-[12.5px] font-semibold text-[#1863dc] disabled:opacity-40 hover:underline"
                    >
                      Post
                    </button>
                  </form>
                </article>
              );
            })}
        </section>

        {/* RIGHT WIDGETS COLUMN (Desktop): Broad and spacious */}
        <aside className="hidden w-[330px] xl:w-[350px] shrink-0 space-y-4 sm:space-y-5 xl:block">
          {/* SEARCH BAR & SUGGESTIONS */}
          <div className="relative">
            <div className="relative flex items-center rounded-full border border-[#ece8de]/60 bg-white px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] focus-within:border-neutral-400">
              <Search className="h-4 w-4 text-[#71717a]" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends, reels, places..."
                className="ml-2.5 w-full bg-transparent text-[13px] text-[#18181b] placeholder-[#71717a] outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[#71717a] hover:text-black"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="rounded bg-[#f0eee9] px-2 py-0.5 font-mono text-[10.5px] text-[#71717a]">
                  ⌘K
                </kbd>
              )}
            </div>

            {/* Recent Searches Dropdown */}
            {isSearchFocused && !searchQuery && (
              <div className="absolute top-12 inset-x-0 z-30 rounded-2xl border border-[#ece8de] bg-white p-3 shadow-xl animate-fade-in">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Recent Searches
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSearchQuery(s.replace("#", ""))}
                      className="rounded-full bg-[#f4f2ea] px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 hover:bg-[#eae6dd]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PEOPLE YOU MAY KNOW (DATABASE BACKED) */}
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3.5">
              <h2 className="text-[15px] font-bold text-[#18181b]">
                People You May Know
              </h2>
              <button
                type="button"
                onClick={() => showToast("All recommendations synced")}
                className="text-[12px] font-semibold text-[#1863dc] hover:underline"
              >
                See All
              </button>
            </div>

            <div className="space-y-3.5">
              {people.map((person) => (
                <div key={person.id} className="group/item flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link to={`/u/${person.username || person.id}`}>
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt={person.name}
                          onError={(e) => {
                            e.target.src = person.fallback || "/recreation/avatar_marcus.png";
                          }}
                          className="h-8.5 w-8.5 rounded-full object-cover ring-1 ring-black/5"
                        />
                      ) : (
                        <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-gradient-to-tr from-[#9333ea] to-[#ec4899] text-[10.5px] font-bold text-white">
                          {person.initials || "KV"}
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/u/${person.username || person.id}`}
                          className="truncate text-[13px] font-semibold text-[#18181b] hover:underline"
                        >
                          {person.name}
                        </Link>
                        {person.isVerified && (
                          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1863dc] text-white">
                            <Check className="h-2 w-2 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[11.5px] text-[#71717a]">
                        {person.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(person.id)}
                      className={`rounded-full px-3.5 py-1 text-[12px] font-semibold transition active:scale-95 ${
                        person.isFollowing
                          ? "bg-[#edeae3] text-[#18181b]"
                          : person.id === "karan"
                          ? "bg-black text-white hover:bg-neutral-800"
                          : "bg-[#1863dc] text-white hover:bg-blue-600"
                      }`}
                    >
                      {person.isFollowing
                        ? person.id === "karan"
                          ? "Following"
                          : "Added"
                        : person.id === "karan"
                        ? "Follow"
                        : "Add Friend"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissPerson(person.id)}
                      title="Dismiss"
                      className="opacity-0 group-hover/item:opacity-100 text-neutral-400 hover:text-black transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TRENDING TAGS (DYNAMICALLY DERIVED FROM DATABASE POSTS) */}
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3.5">
              <h2 className="text-[15px] font-bold text-[#18181b]">
                Trending Tags & Sounds
              </h2>
              <TrendingUp className="h-4.5 w-4.5 text-[#71717a]" />
            </div>

            {trending.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-[#8e8e93]">
                No trending hashtags yet. Include{" "}
                <span className="font-semibold text-black">#tags</span> in your posts to
                start community trends!
              </p>
            ) : (
              <div className="space-y-3">
                {trending.map((trend) => (
                  <button
                    key={trend.id}
                    type="button"
                    onClick={() => handleSelectTrending(trend.tag)}
                    className="group flex w-full flex-col text-left transition"
                  >
                    <span className="text-[13px] font-semibold text-[#18181b] group-hover:text-[#1863dc] transition">
                      {trend.tag}
                    </span>
                    <span className="text-[11.5px] text-[#71717a]">
                      {trend.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SUGGESTED GROUPS (DATABASE BACKED) */}
          <div className="rounded-[22px] border border-[#ece8de]/60 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3.5">
              <h2 className="text-[15px] font-bold text-[#18181b]">
                Suggested Groups
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                title="Create Group"
                className="flex items-center gap-1 text-[12px] font-semibold text-[#1863dc] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between">
                  <div
                    onClick={() => setSelectedGroup(group)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                        group.id === "photo"
                          ? "bg-[#e6f4ea] text-[#2d7a4d]"
                          : "bg-[#feedde] text-[#c05621]"
                      }`}
                    >
                      {group.id === "photo" ? (
                        <Camera className="h-4.5 w-4.5" />
                      ) : (
                        <Footprints className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="truncate text-[13px] font-semibold text-[#18181b] hover:underline block">
                        {group.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-[#71717a]">
                        {group.members}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group.id)}
                    className={`rounded-full px-3.5 py-1 text-[12px] font-semibold transition active:scale-95 shrink-0 ${
                      group.joined
                        ? "bg-black text-white"
                        : "bg-[#edeae3] text-[#18181b] hover:bg-[#e4e0d6]"
                    }`}
                  >
                    {group.joined ? "Joined" : "Join"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <footer className="space-y-1.5 px-1 text-[11.5px] text-[#8e8e93]">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <a href="#" className="hover:underline">
                Privacy
              </a>
              <a href="#" className="hover:underline">
                Terms
              </a>
              <a href="#" className="hover:underline">
                Advertising
              </a>
              <a href="#" className="hover:underline">
                Cookies
              </a>
              <a href="#" className="hover:underline">
                More
              </a>
            </div>
            <p>Staple Social © 2026 • Connect with friends & the world</p>
          </footer>
        </aside>
      </div>

      {/* FULL-SCREEN STORY VIEWER MODAL */}
      {viewerStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewerStoryIndex}
          currentUser={user}
          onClose={() => setViewerStoryIndex(null)}
          onDeleteStory={handleDeleteOwnStory}
          onReply={(storyId, text) => {
            showToast("Story reply sent!");
          }}
        />
      )}

      {/* STORY UPLOAD MODAL */}
      <StoryUploadModal
        isOpen={showStoryUploadModal}
        currentUser={user}
        onClose={() => setShowStoryUploadModal(false)}
        onStoryCreated={(newStory) => {
          setStories((prev) => [...prev, newStory]);
          showToast("Story added to carousel!");
        }}
      />

      {/* GROUP DETAILS MODAL */}
      <GroupDetailsModal
        group={selectedGroup}
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        onToggleJoin={(gId) => {
          handleToggleGroup(gId);
          setSelectedGroup((prev) =>
            prev && prev.id === gId ? { ...prev, joined: !prev.joined } : prev
          );
        }}
        onOpenCreateGroup={() => setShowCreateGroupModal(true)}
      />

      {/* CREATE GROUP MODAL */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={(newGrp) => {
          setGroups((prev) => [newGrp, ...prev]);
          showToast(`Group "${newGrp.name}" created!`);
        }}
      />

      {/* EDIT POST MODAL */}
      <EditPostModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onPostUpdated={(updated) => {
          setPosts((prev) =>
            prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p))
          );
          showToast("Post updated in database!");
          loadSidebarData();
        }}
      />
    </div>
  );
}
