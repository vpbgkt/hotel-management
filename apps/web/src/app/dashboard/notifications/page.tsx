'use client';

/**
 * Notifications Inbox Page — Hotel Manager
 * Displays in-app notifications with mark-as-read and mark-all-read.
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  CalendarCheck,
  Star,
  CreditCard,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GET_MY_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from '@/lib/graphql/queries/notifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  BOOKING_CONFIRMED: <CalendarCheck className="w-5 h-5 text-green-600" />,
  BOOKING_CANCELLED: <AlertCircle className="w-5 h-5 text-red-500" />,
  BOOKING_MODIFIED: <CalendarCheck className="w-5 h-5 text-blue-600" />,
  PAYMENT_RECEIVED: <CreditCard className="w-5 h-5 text-green-600" />,
  PAYMENT_REFUNDED: <CreditCard className="w-5 h-5 text-amber-600" />,
  REVIEW_SUBMITTED: <Star className="w-5 h-5 text-amber-500" />,
  REVIEW_REPLY: <MessageSquare className="w-5 h-5 text-blue-500" />,
  REVIEW_APPROVED: <Star className="w-5 h-5 text-green-500" />,
};

interface NotificationsData {
  myNotifications: {
    items: Notification[];
    unreadCount: number;
  };
}

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [offset, setOffset] = useState(0);

  const { data, loading, fetchMore } = useQuery<NotificationsData>(GET_MY_NOTIFICATIONS, {
    variables: { limit: PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
    refetchQueries: [{ query: GET_MY_NOTIFICATIONS, variables: { limit: PAGE_SIZE, offset: 0 } }],
  });

  const [markAllRead, { loading: markingAll }] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    refetchQueries: [{ query: GET_MY_NOTIFICATIONS, variables: { limit: PAGE_SIZE, offset: 0 } }],
  });

  const notifications: Notification[] = data?.myNotifications?.items || [];
  const unreadCount: number = data?.myNotifications?.unreadCount || 0;

  const handleMarkRead = async (id: string) => {
    await markRead({ variables: { notificationId: id } });
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchMore({
      variables: { limit: PAGE_SIZE, offset: newOffset },
      updateQuery: (prev: NotificationsData, { fetchMoreResult }: { fetchMoreResult?: NotificationsData }) => {
        if (!fetchMoreResult) return prev;
        return {
          myNotifications: {
            ...fetchMoreResult.myNotifications,
            items: [
              ...prev.myNotifications.items,
              ...fetchMoreResult.myNotifications.items,
            ],
          },
        };
      },
    });
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="gap-2"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No notifications yet</h3>
            <p className="text-gray-500 text-sm">
              You&apos;ll see booking updates, payment confirmations, and review alerts here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => {
              const icon = NOTIFICATION_ICONS[notif.type] || <Bell className="w-5 h-5 text-gray-400" />;
              const timeAgo = formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true });

              const content = (
                <div
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    notif.isRead
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-blue-50/50 hover:bg-blue-50'
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">{icon}</div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${notif.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />
                      )}
                    </div>
                    {notif.body && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkRead(notif.id);
                        }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        title="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                    {notif.link && (
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                </div>
              );

              if (notif.link) {
                return (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => {
                      if (!notif.isRead) handleMarkRead(notif.id);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }

              return <div key={notif.id}>{content}</div>;
            })}
          </div>

          {/* Load More */}
          {notifications.length >= offset + PAGE_SIZE && (
            <div className="px-5 py-4 border-t border-gray-100 text-center">
              <Button variant="ghost" size="sm" onClick={handleLoadMore} className="text-brand-600">
                Load More
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
