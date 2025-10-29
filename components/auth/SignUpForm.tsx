import React, { useState } from 'react';

interface SignUpFormProps {
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>;
  onToggleMode: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSignUp, onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);

    try {
      await onSignUp(email, password, fullName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="bg-gray-800 shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="fullName">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white border-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="John Smith"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white border-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="your.email@example.com"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white border-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="••••••••"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white border-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="••••••••"
            required
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-sky-400 hover:text-sky-300 text-sm"
          >
            Already have an account? Sign In
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignUpForm;
