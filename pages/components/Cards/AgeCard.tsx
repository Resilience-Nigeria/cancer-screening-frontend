import React from 'react';
import { Calendar, Cake } from 'lucide-react';

interface AgeCardProps {
  dateOfBirth: string;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function AgeCard({ 
  dateOfBirth, 
  className = '', 
  showIcon = true,
  variant = 'default' 
}: AgeCardProps) {
  
  /**
   * Calculate age from date of birth
   * Returns age in years, months, and days
   */
  function calculateAge(dob: string) {
    if (!dob) return null;

    const birthDate = new Date(dob);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
      return null;
    }

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  }

  /**
   * Format age for display
   */
  function formatAge(age: { years: number; months: number; days: number } | null): string {
    if (!age) return 'Invalid date';

    const { years, months, days } = age;

    // For infants (under 1 year)
    if (years === 0) {
      if (months === 0) {
        return days === 1 ? '1 day old' : `${days} days old`;
      }
      if (months === 1 && days === 0) {
        return '1 month old';
      }
      return `${months} ${months === 1 ? 'month' : 'months'}${days > 0 ? ` ${days}d` : ''} old`;
    }

    // For children and adults
    if (years === 1) {
      return months > 0 ? `1 year ${months}m` : '1 year old';
    }

    if (years < 18 && months > 0) {
      return `${years} years ${months}m`;
    }

    return `${years} years old`;
  }

  /**
   * Get age classification based on WHO standards
   */
  function getAgeClassification(age: { years: number; months: number; days: number } | null): string {
    if (!age) return '';

    const totalMonths = age.years * 12 + age.months;

    if (totalMonths < 12) return 'Infancy';
    if (age.years <= 5) return 'Early Childhood';
    if (age.years <= 11) return 'Middle Childhood';
    if (age.years <= 19) return 'Adolescent';
    if (age.years <= 24) return 'Youth';
    if (age.years <= 44) return 'Young Adult';
    if (age.years <= 59) return 'Middle Age';
    if (age.years <= 74) return 'Elderly';
    return 'Senior';
  }

  /**
   * Format date for display
   */
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const age = calculateAge(dateOfBirth);
  const ageText = formatAge(age);
  const ageClassification = getAgeClassification(age);
  const formattedDOB = formatDate(dateOfBirth);

  // Compact variant - single line
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {showIcon && <Cake className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {ageText}
        </span>
      </div>
    );
  }

  // Detailed variant - full card with classification
  if (variant === 'detailed') {
    return (
      <div className={`rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Cake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Age</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {age ? age.years : '—'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {ageClassification}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Full Age:</span>
            <span className="font-medium text-gray-900 dark:text-white">{ageText}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Date of Birth:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formattedDOB}</span>
          </div>
          {age && age.years > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Breakdown:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {age.years}y {age.months}m {age.days}d
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant - simple card
  return (
    <div className={`rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center gap-3">
        {showIcon && (
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Cake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Age</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {ageText}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              Born: {formattedDOB}
            </p>
          </div>
        </div>
      </div>
      {ageClassification && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            {ageClassification}
          </span>
        </div>
      )}
    </div>
  );
}