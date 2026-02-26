# Password Reset Flow - Complete Implementation Guide

## Current Issue
When user clicks "Forgot Password" → email is sent. But **the reset link redirects to home page (`/#/`)** which doesn't handle the reset token. This means the user can't actually reset their password.

---

## Proper Password Reset Flow

### Step 1: User Clicks "Forgot Password" ✅ (Already Done)
```
User Email: alice@example.com
↓
handlePasswordReset() called
↓
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/#/reset-password`  // ← NEEDS TO BE DIFFERENT
})
↓
Email sent with reset link containing token
```

### Step 2: User Receives Email + Clicks Link
Email contains a link like:
```
https://yourapp.com/#/reset-password?type=recovery&token=abc123xyz&refresh_token=...
```

When user clicks → redirected to your app with token in URL hash

### Step 3: App Handles Reset (New Page Needed)
Create **ResetPassword.tsx** page that:
1. Extracts token from URL parameters
2. Verifies the token with Supabase
3. Gets the user ID from the verified session
4. Allows user to enter new password
5. Updates password

---

## Implementation Steps

### 1. Update Redirect URL in Login.tsx

**Change FROM:**
```typescript
redirectTo: `${window.location.origin}/#/`
```

**Change TO:**
```typescript
redirectTo: `${window.location.origin}/#/reset-password`
```

This tells Supabase to redirect to your reset-password page when user clicks email link.

---

### 2. Create ResetPassword.tsx Page

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // Extract and verify reset token from URL
  useEffect(() => {
    const verifyResetToken = async () => {
      try {
        // Get hash parameters from URL (e.g., #/reset-password?type=recovery&token=...)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash.split('?')[1]);
        
        const type = params.get('type');
        const token = params.get('access_token');

        console.log('Token type:', type);
        console.log('Has token:', !!token);

        if (type === 'recovery' && token) {
          // Method 1: Exchange token for session
          const { data, error: sessionError } = await supabase.auth.refreshSession({
            refresh_token: params.get('refresh_token') || '',
            access_token: token
          });

          if (sessionError) {
            // Method 2: Verify OTP (alternative approach)
            const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
              type: 'recovery',
              token: token,
              email: ''  // Email not needed for recovery token
            });

            if (otpError) {
              throw new Error('Invalid reset link. Link may have expired.');
            }
            
            const loggedInUserId = otpData?.user?.id;
            setUserId(loggedInUserId || null);
          } else {
            // Session created successfully
            const loggedInUserId = data?.user?.id;
            setUserId(loggedInUserId || null);
            console.log('User ID from reset token:', loggedInUserId);
          }
        } else {
          throw new Error('Invalid reset link format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify reset link');
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    verifyResetToken();
  }, [navigate]);

  // Handle password update
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update password with current session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (error && !userId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Reset Link Invalid</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Password Reset Successfully!</h2>
          <p className="text-gray-600 mb-4">Your password has been updated.</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Verifying Reset Link...</h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-primary mb-2">Create New Password</h2>
        <p className="text-center text-sm text-gray-600 mb-6">User ID: {userId?.substring(0, 8)}...</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Confirm password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md font-bold hover:bg-green-800 transition disabled:opacity-50"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
```

---

## How to Get User ID

### ✅ Method 1: From Reset Session (During Reset)
```typescript
// In ResetPassword.tsx after verifying token
const { data, error } = await supabase.auth.refreshSession({
  refresh_token: params.get('refresh_token') || '',
  access_token: token
});

const userId = data?.user?.id;  // ← USER ID IS HERE
console.log('User ID:', userId);
```

### ✅ Method 2: From Current User After Reset
```typescript
// After password is reset, get current user
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;  // ← USER ID IS HERE
```

### ✅ Method 3: Look Up by Email
```typescript
// If you need user ID later, query profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', email)
  .single();

const userId = profile?.id;  // ← USER ID IS HERE
```

---

## Token Flow Diagram

```
User clicks "Forgot Password"
        ↓
Email contains link:
https://app.com/#/reset-password?type=recovery&token=abc123&refresh_token=xyz789
        ↓
User clicks link → Browser navigates to ResetPassword page
        ↓
ResetPassword.tsx useEffect extracts token from URL
        ↓
Call supabase.auth.refreshSession(access_token, refresh_token)
        ↓
✅ Session created with user data
        ↓
data?.user?.id = "uuid-1234-5678"  ← USE THIS USER ID
        ↓
User enters new password + confirms
        ↓
supabase.auth.updateUser({ password: newPassword })
        ↓
✅ Password updated successfully
        ↓
Show success message, redirect to login
```

---

## Steps Summary

### What You Need to Do:

1. **Update Login.tsx** - Change redirect URL to `/reset-password`
2. **Create ResetPassword.tsx** - New page to handle reset process
3. **Add Route** - Add route in App.tsx:
   ```typescript
   import ResetPassword from './pages/ResetPassword';
   
   // In router config:
   { path: '/reset-password', element: <ResetPassword /> }
   ```

4. **Test the Flow**:
   - Go to login page
   - Click "Forgot Password"
   - Enter email
   - Check email for reset link
   - Click link
   - Should show "Create New Password" form
   - Enter new password
   - Should show success message

---

## Key Points

| Question | Answer |
|----------|--------|
| **How to get user ID?** | From `data?.user?.id` after verifying reset token |
| **Token expires?** | Yes, typically 1 hour (Supabase default) |
| **Can user reset multiple times?** | Yes, each reset link is unique |
| **Is it the same user?** | Yes, Supabase ties token to the email sent to |
| **Do I need user ID during reset?** | Not required - Supabase handles it from token |

