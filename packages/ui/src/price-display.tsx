'use client';

import React from 'react';

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  period?: string; // "night", "hour"
  originalAmount?: number; // For showing discounted price
  className?: string;
}

export function PriceDisplay({
  amount,
  currency = 'INR',
  period,
  originalAmount,
  className = '',
}: PriceDisplayProps) {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  const originalFormatted = originalAmount
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(originalAmount)
    : null;

  return React.createElement(
    'span',
    { className: `inline-flex items-baseline gap-1 ${className}` },
    originalFormatted
      ? React.createElement(
          'span',
          { className: 'text-sm text-gray-400 line-through' },
          originalFormatted,
        )
      : null,
    React.createElement(
      'span',
      { className: 'font-semibold' },
      formatted,
    ),
    period
      ? React.createElement(
          'span',
          { className: 'text-sm text-gray-500' },
          `/${period}`,
        )
      : null,
  );
}
