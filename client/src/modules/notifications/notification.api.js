import api from "../../api/axios";

export const fetchNotifications = async (page = 1) => {
  const { data } = await api.get(`/notifications?page=${page}`);
  return data.notifications || [];
};

export const markAllNotificationsRead = async () => {
  await api.patch("/notifications/read-all");
};