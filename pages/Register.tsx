import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { UserRole } from '../types';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [existingRole, setExistingRole] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  // Check if email already exists in profiles
  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('email', emailToCheck.toLowerCase())
      .single();
    
    if (data) {
      setEmailExists(true);
      setExistingRole(data.role);
    } else {
      setEmailExists(false);
      setExistingRole(null);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail) checkEmailExists(newEmail);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // If email exists in profiles but no auth account, update the profile role
      if (emailExists) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role })
          .eq('email', email.toLowerCase());
        
        if (updateError) {
          setError('Could not update your role. Please contact support.');
          setLoading(false);
          return;
        }
        
        setError(null);
        navigate('/login');
        return;
      }

      // Normal registration for new email
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setEmailExists(true);
          setError('This email is already registered. Try logging in, or contact support if you forgot your password.');
        } else {
          setError(error.message);
        }
        setLoading(false);
      } else {
        setError(null);
        setRegisteredEmail(email);
        setConfirmationPending(true);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <img src="/images/greenbasket-logo.png" alt="GreenBasket Logo" className="h-32 w-auto" />
        </div>

        {confirmationPending ? (
          <>
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
              <div className="text-4xl text-green-600 mb-4">📧</div>
              <h2 className="text-2xl font-bold text-primary mb-4">Verify Your Email</h2>
              <p className="text-gray-700 mb-4">
                We've sent a confirmation link to:
              </p>
              <p className="text-lg font-bold text-primary mb-6 break-words">
                {registeredEmail}
              </p>
              <div className="bg-blue-50 border border-blue-300 rounded p-4 mb-6 text-left">
                <p className="text-sm text-gray-800 mb-2">
                  📌 <strong>What to do next:</strong>
                </p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>1. Check your email (inbox or spam folder)</li>
                  <li>2. Click the confirmation link</li>
                  <li>3. Return to login with your credentials</li>
                </ul>
              </div>
              <p className="text-xs text-gray-600 mb-6">
                Confirmation link expires in 24 hours
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary text-white py-2 rounded-md font-bold hover:bg-green-800 transition"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => {
                    setConfirmationPending(false);
                    setEmail('');
                    setPassword('');
                    setError(null);
                  }}
                  className="w-full bg-gray-300 text-gray-800 py-2 rounded-md font-bold hover:bg-gray-400 transition"
                >
                  Create Another Account
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-center text-primary mb-6">Create Account</h2>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            
            {emailExists && existingRole && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 text-sm">
                <p className="font-bold mb-2">Account Already Exists</p>
                <p className="mb-3">This email is registered as a <strong>{existingRole}</strong>. 
                {existingRole !== role && (
                  <>
                    <br/><br/>
                    Would you like to change your role to <strong>{role}</strong>?
                  </>
                )}
                </p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={loading}
                />
              </div>
              
              {!emailExists && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 rounded-md border ${role === 'customer' ? 'bg-green-100 border-primary text-primary font-bold' : 'border-gray-300 text-gray-600'}`}
                    disabled={loading}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('farmer')}
                    className={`py-2 rounded-md border ${role === 'farmer' ? 'bg-green-100 border-primary text-primary font-bold' : 'border-gray-300 text-gray-600'}`}
                    disabled={loading}
                  >
                    Farmer
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2 rounded-md font-bold hover:bg-green-800 transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : emailExists ? 'Update Role' : 'Register'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
