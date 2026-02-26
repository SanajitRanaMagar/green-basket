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
  const [isVerifying, setIsVerifying] = useState(true);
  
  const navigate = useNavigate();

  // Extract and verify reset token from URL
  useEffect(() => {
    const verifyResetToken = async () => {
      try {
        setIsVerifying(true);

        // Check if user already has a valid recovery session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.user?.id) {
          // User has valid session from recovery link
          console.log('Valid recovery session found. User ID:', session.user.id);
          setUserId(session.user.id);
          setIsVerifying(false);
          return;
        }

        // No valid session - try to extract token from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash.split('?')[1]);
        
        const type = params.get('type');
        const token = params.get('access_token');

        console.log('Token type:', type);
        console.log('Has access token:', !!token);

        if (type === 'recovery' && token) {
          // Try to exchange token for session
          const refreshToken = params.get('refresh_token');
          
          if (refreshToken) {
            const { data, error: refreshError } = await supabase.auth.refreshSession({
              refresh_token: refreshToken,
              access_token: token
            });

            if (refreshError) throw refreshError;
            
            const loggedInUserId = data?.user?.id;
            setUserId(loggedInUserId || null);
            console.log('User ID from recovery token:', loggedInUserId);
          } else {
            throw new Error('Missing refresh token in recovery link');
          }
        } else {
          throw new Error('Invalid or expired reset link. Please request a new one.');
        }

        setIsVerifying(false);
      } catch (err) {
        console.error('Reset token verification error:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify reset link');
        setIsVerifying(false);
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
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Show error state if link invalid/expired
  if (error && !userId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <div className="text-4xl text-red-500 mb-2">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Reset Link Invalid</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Redirecting to login page...</p>
          <button
            onClick={() => navigate('/login')}
            className="text-primary font-bold hover:underline"
          >
            Go to Login Now
          </button>
        </div>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <div className="text-4xl text-green-500 mb-2">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Password Reset Successfully!</h2>
          </div>
          <p className="text-gray-600 mb-6">Your password has been updated and you can now login with your new password.</p>
          <p className="text-sm text-gray-500 mb-6">Redirecting to login page...</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary text-white py-2 rounded-md font-bold hover:bg-green-800 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">Verifying Reset Link...</h2>
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
          </div>
          <p className="text-sm text-gray-500">Please wait while we verify your reset link.</p>
        </div>
      </div>
    );
  }

  // Show password form only if user verified
  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <img src="/images/greenbasket-logo.png" alt="GreenBasket Logo" className="h-32 w-auto" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-primary mb-2">Create New Password</h2>
        <p className="text-center text-xs text-gray-500 mb-6">Verified User ID: {userId.substring(0, 12)}...</p>

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
              placeholder="Enter new password (min 6 characters)"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
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
              placeholder="Re-enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md font-bold hover:bg-green-800 transition disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Remember your password? 
            <a href="/#/login" className="text-primary font-bold hover:underline ml-1">
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
