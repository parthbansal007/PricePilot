import React, { useState, useEffect } from 'react';
import { Bell, TrendingDown, AlertTriangle, CheckCircle, Bot, Trash2 } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const getIconAndColor = (type: string) => {
    switch(type) {
      case 'PRICE_DROP': return { icon: TrendingDown, color: 'text-accent', bg: 'bg-accent/10' };
      case 'TARGET_HIT': return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' };
      default: return { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifications
          </h1>
          <p className="text-textSecondary text-sm mt-1">Stay updated with price drops and alerts.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={markAllAsRead} className="text-sm font-medium text-primary hover:underline">Mark all as read</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden">
        <div className="divide-y divide-borderLight">
          {isLoading ? (
            <div className="p-8 text-center text-textSecondary">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-textSecondary">No notifications to show.</div>
          ) : notifications.map((notification) => {
            const { icon: Icon, color, bg } = getIconAndColor(notification.type);
            return (
              <div 
                key={notification._id} 
                className={`p-4 flex gap-4 transition-colors hover:bg-secondaryBg ${!notification.isRead ? 'bg-primary/5' : ''}`}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm font-bold ${!notification.isRead ? 'text-textPrimary' : 'text-textSecondary'}`}>
                      {notification.title || notification.type}
                    </h3>
                    <span className="text-xs text-textSecondary whitespace-nowrap ml-4">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm ${!notification.isRead ? 'text-textPrimary font-medium' : 'text-textSecondary'}`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
