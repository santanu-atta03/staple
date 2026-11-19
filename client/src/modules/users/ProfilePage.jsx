import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchFollowers,
  fetchFollowing,
  fetchUserPosts,
  fetchUserProfile,
  toggleFollowUser,
  updateMyProfile,
} from "./user.api";
import { uploadMediaFiles } from "../feed/feed.api";
import PostCard from "../feed/PostCard";
import RollButton from "../../components/RollButton";

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, setUser: setCurrentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
  const isOwnProfile = profile?._id?.toString() === currentUserId;

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchUserProfile(username)
      .then(async (userData) => {
        if (!active) return;
        setProfile(userData);
        setEditForm({ name: userData.name || "", bio: userData.bio || "" });

        const [userPosts, followersData, followingData] = await Promise.all([
          fetchUserPosts(userData._id),
          fetchFollowers(userData._id),
          fetchFollowing(userData._id),
        ]);

        if (!active) return;
        setPosts(userPosts);
        setFollowers(followersData);
        setFollowingList(followingData);
        setIsFollowing(
          followersData.some((f) => f._id?.toString() === currentUserId)
        );
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [username, currentUserId]);

  const handleFollowToggle = async () => {
    const prev = isFollowing;
    setIsFollowing(!prev);
    try {
      const res = await toggleFollowUser(profile._id);
      setIsFollowing(res.following);
      const updatedFollowers = await fetchFollowers(profile._id);
      setFollowers(updatedFollowers);
    } catch {
      setIsFollowing(prev);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const [uploaded] = await uploadMediaFiles([file]);
      if (uploaded?.url) {
        const updated = await updateMyProfile({ avatar: uploaded.url });
        setProfile(updated);
        setCurrentUser(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateMyProfile(editForm);
      setProfile(updated);
      setCurrentUser(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-6 py-16 text-center text-sm text-neutral-500">
        User @{username} not found.
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-neutral-800/70 bg-neutral-950/85 px-4 py-3.5 backdrop-blur sm:px-6">
        <h1 className="text-base font-semibold text-white">
          {profile.name || profile.username}
        </h1>
        <p className="text-xs text-neutral-500">{posts.length} posts</p>
      </header>

      {/* Profile Hero */}
      <div className="border-b border-neutral-800/70 px-4 py-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="relative">
            <img
              src={
                profile.avatar ||
                `https://api.dicebear.com/9.x/initials/svg?seed=${profile.username}`
              }
              alt={profile.username}
              className="h-20 w-20 rounded-full object-cover border border-neutral-800 bg-neutral-900"
            />
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-white p-1.5 text-neutral-950 shadow transition hover:bg-neutral-200">
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {isOwnProfile ? (
            <button
              onClick={() => setEditing(!editing)}
              className="rounded-xl border border-neutral-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-900"
            >
              {editing ? "Cancel" : "Edit profile"}
            </button>
          ) : (
            <RollButton
              onClick={handleFollowToggle}
              className={`px-5 py-1.5 text-xs ${
                isFollowing
                  ? "!bg-neutral-900 !text-white border border-neutral-700 hover:!bg-neutral-800"
                  : ""
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </RollButton>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              placeholder="Display name"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
            <textarea
              rows={2}
              value={editForm.bio}
              onChange={(e) =>
                setEditForm({ ...editForm, bio: e.target.value })
              }
              placeholder="Short bio..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
            <RollButton type="submit" disabled={saving} className="text-xs">
              {saving ? "Saving..." : "Save changes"}
            </RollButton>
          </form>
        ) : (
          <div className="mt-4 space-y-2">
            <div>
              <h2 className="text-lg font-bold text-white">
                {profile.name || profile.username}
              </h2>
              <p className="text-sm text-neutral-500">@{profile.username}</p>
            </div>

            {profile.bio && (
              <p className="text-sm leading-relaxed text-neutral-300">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-5 pt-2 text-xs text-neutral-400">
              <span>
                <strong className="font-semibold text-white">
                  {followingList.length}
                </strong>{" "}
                Following
              </span>
              <span>
                <strong className="font-semibold text-white">
                  {followers.length}
                </strong>{" "}
                Followers
              </span>
            </div>
          </div>
        )}
      </div>

      {/* User Posts */}
      <div>
        {posts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-neutral-500">
            No posts yet.
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={{ ...post, authorId: profile }}
              onDeleted={(id) =>
                setPosts((prev) => prev.filter((p) => p._id !== id))
              }
            />
          ))
        )}
      </div>
    </div>
  );
}