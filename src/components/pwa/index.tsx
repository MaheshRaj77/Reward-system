/**
 * PWA UI Components
 * Install button and family code dialog
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

// ============================================
// INSTALL APP BUTTON
// ============================================

interface InstallAppButtonProps {
  onInstall: () => void;
  isInstalled: boolean;
  variant?: 'default' | 'minimal';
}

export function InstallAppButton({
  onInstall,
  isInstalled,
  variant = 'default',
}: InstallAppButtonProps) {
  if (isInstalled) return null;

  if (variant === 'minimal') {
    return (
      <button
        onClick={onInstall}
        className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2"
        title="Install app on device"
      >
        <span>📱</span>
        Install App
      </button>
    );
  }

  return (
    <Button
      onClick={onInstall}
      variant="secondary"
      size="sm"
      className="flex items-center gap-2"
      title="Save app on your device for offline access"
    >
      <span>📱</span>
      Save App
    </Button>
  );
}

// ============================================
// FAMILY CODE DIALOG
// ============================================

interface FamilyCodeDialogProps {
  isOpen: boolean;
  onSave: (code: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  currentFamilyCode?: string | null;
}

export function FamilyCodeDialog({
  isOpen,
  onSave,
  onCancel,
  isLoading = false,
  currentFamilyCode,
}: FamilyCodeDialogProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'enter' | 'display'>('enter');

  // If family code is provided and dialog just opened, show display mode
  useEffect(() => {
    if (isOpen && currentFamilyCode) {
      setMode('display');
      setCode('');
      setError('');
    } else if (isOpen) {
      setMode('enter');
      setCode('');
      setError('');
    }
  }, [isOpen, currentFamilyCode]);

  if (!isOpen) return null;

  // Display mode: show the family code
  if (mode === 'display' && currentFamilyCode) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Family Code Saved</h2>
          <p className="text-gray-600 mb-6">
            Your family code has been saved to this device. You can now access family data offline.
          </p>

          <div className="bg-gradient-to-r from-indigo-100 to-blue-100 border-2 border-indigo-300 rounded-xl p-6 mb-6 text-center">
            <p className="text-sm text-indigo-700 mb-2">Your Family Code</p>
            <p className="text-4xl font-bold text-indigo-900 tracking-[0.25em] font-mono">{currentFamilyCode}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              📱 This code is stored locally on this device. You can view all family members' information offline.
            </p>
          </div>

          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Enter mode: prompt for family code
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Family code is required');
      return;
    }

    if (code.length < 4) {
      setError('Family code must be at least 4 characters');
      return;
    }

    try {
      onSave(code);
      setCode('');
      setError('');
    } catch (err) {
      setError('Failed to save family code');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Family Code</h2>
        <p className="text-gray-600 mb-6">
          Enter your family code to store it on this device and access family information offline.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="familyCode" className="block text-sm font-medium text-gray-900 mb-2">
              Family Code
            </label>
            <input
              id="familyCode"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="e.g., FAM123ABC"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading}
              autoFocus
            />
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              💡 Your parent should share the family code with you. It will be saved on this device for offline access.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// INSTALL PROMPT BANNER
// ============================================

interface InstallPromptBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPromptBanner({
  onInstall,
  onDismiss,
}: InstallPromptBannerProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-4 flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📱</span>
        <div>
          <p className="font-semibold">Install Family Rewards</p>
          <p className="text-sm text-indigo-100">Save the app on your device for offline access</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onDismiss}
          className="px-4 py-2 text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg font-medium transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={onInstall}
          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg font-medium transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
