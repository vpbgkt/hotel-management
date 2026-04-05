'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  // Booking statuses
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CHECKED_IN: 'bg-blue-100 text-blue-800',
  CHECKED_OUT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
  // Payment statuses
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_REFUNDED: 'bg-yellow-100 text-yellow-800',
  REFUNDED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
  // Settlement statuses
  SETTLED: 'bg-green-100 text-green-800',
  DISPUTED: 'bg-red-100 text-red-800',
  // Blog statuses
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-yellow-100 text-yellow-800',
  // Generic
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
  const label = status.replace(/_/g, ' ');

  return React.createElement(
    'span',
    {
      className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`,
    },
    label,
  );
}
