import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import toast from 'react-hot-toast';
import { Terminal, Mail, Lock, User, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const result = await register(registerData);

      if (result.success) {
        toast.success('Registration successful!');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      toast.error('An error occurred during registration');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-vscode-bg py-12 px-4 overflow-y-auto"
      style={{
        backgroundImage: 'radial-gradient(rgba(237,237,239,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="w-full max-w-md px-6 my-8">
        <Link
          to="/"
          className="flex items-center justify-center gap-2.5 mb-8 animate-fade-in w-fit mx-auto"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md border border-vscode-border bg-vscode-panel text-vscode-accent">
            <Terminal className="w-4 h-4" />
          </span>
          <span className="font-mono text-lg font-bold text-vscode-text">
            CodeSync<span className="text-vscode-accent">.ai</span>
          </span>
        </Link>

        <div className="text-center mb-8 animate-fade-in">
          <p className="font-mono text-sm text-vscode-accent mb-2">// join the team</p>
          <h1 className="font-mono text-2xl font-bold text-vscode-text mb-2">
            Create your account
          </h1>
          <p className="text-vscode-textMuted text-sm">Join our collaborative coding community</p>
        </div>

        <div className="bg-vscode-panel border border-vscode-border rounded-lg p-8 shadow-2xl animate-slide-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-vscode-text mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-vscode-textMuted" />
                <Input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  className="h-10 pl-10 bg-vscode-bg border-vscode-border text-vscode-text placeholder:text-vscode-textMuted focus-visible:ring-vscode-accent focus-visible:border-vscode-accent"
                  placeholder="johndoe"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-vscode-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-vscode-textMuted" />
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-10 pl-10 bg-vscode-bg border-vscode-border text-vscode-text placeholder:text-vscode-textMuted focus-visible:ring-vscode-accent focus-visible:border-vscode-accent"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-vscode-text mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-vscode-textMuted" />
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="h-10 pl-10 bg-vscode-bg border-vscode-border text-vscode-text placeholder:text-vscode-textMuted focus-visible:ring-vscode-accent focus-visible:border-vscode-accent"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-vscode-textMuted mt-1">At least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-vscode-text mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-vscode-textMuted" />
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="h-10 pl-10 bg-vscode-bg border-vscode-border text-vscode-text placeholder:text-vscode-textMuted focus-visible:ring-vscode-accent focus-visible:border-vscode-accent"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-vscode-accent text-vscode-bg font-semibold hover:bg-vscode-accentHover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-vscode-textMuted text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-vscode-accent hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 font-mono text-xs text-vscode-textMuted">
          <p>By signing up, you agree to our Terms & Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
