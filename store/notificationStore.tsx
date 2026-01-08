import { create } from "zustand";

export type NotificationType = "success" | "error" |  "info" | "warning";

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
    screen: string; 
}

interface NotificationStore {
    notifications: Notification[];

    addNotification: (message: string, type: NotificationType, screen: string, duration?: number) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],

    addNotification: (message: string, type: NotificationType, screen: string, duration = 3000) => {
        const id = `${Date.now()}-${Math.random()}`;
        const notification: Notification = {id, message, type, screen, duration};

        set ((state) => ({
            notifications: [...state.notifications, notification]
        }));

        if (duration > 0){
            setTimeout(() => {
                get().removeNotification(id);
            }, duration);
        }
    },

    removeNotification: (id: string) => {
        set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
        }));
    },

    clearAll: () => {
        set({ notifications: [] });
    },

}));