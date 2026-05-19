import React from 'react';
import { useRouter } from 'next/router';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, getRoleName } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30">
          <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          You don't have permission to access this page.
        </p>

        {user && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
            Your role: <span className="font-semibold text-gray-700 dark:text-gray-300">{getRoleName()}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <button
            onClick={() => router.push('/ncsr/dashboard')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}