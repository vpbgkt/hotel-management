import { gql } from '@apollo/client';

export const GET_MY_NOTIFICATIONS = gql`
  query MyNotifications($limit: Int, $offset: Int) {
    myNotifications(limit: $limit, offset: $offset) {
      items {
        id
        type
        title
        body
        link
        isRead
        createdAt
      }
      unreadCount
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) {
      success
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead {
      success
    }
  }
`;
