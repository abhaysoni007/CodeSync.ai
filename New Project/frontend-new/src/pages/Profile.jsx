import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  User, Mail, Upload, Save, X, Key, Eye, EyeOff, 
  CheckCircle, XCircle, Loader2, Camera, ArrowLeft 
} from 'lucide-react';

const API_PROVIDERS = [
  { id: 'google', name: 'Google Gemini', placeholder: 'AIza...', info: 'Get free API key from https://aistudio.google.com/' }
];

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // User profile state
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  
  // API keys state
  const [apiKeys, setApiKeys] = useState({
    google: ''
  });
  const [savedKeys, setSavedKeys] = useState({
    google: false
  });
  const [showKeys, setShowKeys] = useState({
    google: false
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'api-keys'

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.getUserProfile();
      
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        setFullName(userData.fullName || '');
        
        // Set avatar preview if exists
        if (userData.avatar) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          setAvatarPreview(`${API_URL}${userData.avatar}`);
        }

        // Check which API keys are saved
        const userApiKeys = userData.apiKeys || {};
        const keysStatus = {};
        API_PROVIDERS.forEach(provider => {
          keysStatus[provider.id] = !!userApiKeys[provider.id];
          if (userApiKeys[provider.id]) {
            setApiKeys(prev => ({
              ...prev,
              [provider.id]: userApiKeys[provider.id]
            }));
          }
        });
        setSavedKeys(keysStatus);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showMessage('error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        showMessage('error', 'Only image files are allowed (JPEG, PNG, GIF, WebP)');
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const formData = new FormData();
      
      if (fullName !== user?.fullName) {
        formData.append('fullName', fullName);
      }
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await api.updateUserProfile(formData);
      
      if (response.data.success) {
        showMessage('success', 'Profile updated successfully!');
        setUser(response.data.data.user);
        setAvatarFile(null);
        
        // Update avatar preview
        if (response.data.data.user.avatar) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          setAvatarPreview(`${API_URL}${response.data.data.user.avatar}`);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAPIKeyUpdate = async (provider) => {
    const apiKey = apiKeys[provider];
    
    if (!apiKey || apiKey.trim() === '') {
      showMessage('error', `Please enter ${API_PROVIDERS.find(p => p.id === provider)?.name} API key`);
      return;
    }

    try {
      setSaving(true);
      const response = await api.updateUserAPIKeys({
        provider,
        apiKey,
        action: 'set'
      });

      if (response.data.success) {
        setSavedKeys(prev => ({ ...prev, [provider]: true }));
        showMessage('success', `${API_PROVIDERS.find(p => p.id === provider)?.name} API key saved!`);
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      showMessage('error', error.response?.data?.message || 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleAPIKeyDelete = async (provider) => {
    if (!window.confirm(`Are you sure you want to delete ${API_PROVIDERS.find(p => p.id === provider)?.name} API key?`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await api.updateUserAPIKeys({
        provider,
        action: 'delete'
      });

      if (response.data.success) {
        setSavedKeys(prev => ({ ...prev, [provider]: false }));
        setApiKeys(prev => ({ ...prev, [provider]: '' }));
        showMessage('success', `${API_PROVIDERS.find(p => p.id === provider)?.name} API key deleted!`);
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      showMessage('error', error.response?.data?.message || 'Failed to delete API key');
    } finally {
      setSaving(false);
    }
  };

  const toggleKeyVisibility = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4]">
      {/* Header */}
      <div className="bg-[#252526] border-b border-[#3e3e42] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-[#2a2d2e] rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold">Profile Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-[#252526] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'profile'
                ? 'bg-[#007acc] text-white'
                : 'text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
          >
            <User className="w-4 h-4 inline-block mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'api-keys'
                ? 'bg-[#007acc] text-white'
                : 'text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
          >
            <Key className="w-4 h-4 inline-block mr-2" />
            API Keys
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
            <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
            
            <form onSubmit={handleProfileUpdate}>
              {/* Avatar Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Profile Picture</label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#3e3e42]"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-[#2a2d2e] flex items-center justify-center border-2 border-[#3e3e42]">
                        <User className="w-12 h-12 text-[#858585]" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#858585] mb-2">
                      Upload a profile picture. Max size: 5MB
                    </p>
                    <p className="text-xs text-[#858585]">
                      Allowed formats: JPEG, PNG, GIF, WebP
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Username (Read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  <User className="w-4 h-4 inline-block mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full px-4 py-2 bg-[#3c3c3c] border border-[#3e3e42] rounded-lg text-[#858585] cursor-not-allowed"
                />
              </div>

              {/* Email (Read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  <Mail className="w-4 h-4 inline-block mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-[#3c3c3c] border border-[#3e3e42] rounded-lg text-[#858585] cursor-not-allowed"
                />
              </div>

              {/* Full Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2 bg-[#3c3c3c] border border-[#3e3e42] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#cccccc]"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
            <h2 className="text-xl font-semibold mb-2">Gemini API Key</h2>
            <p className="text-sm text-[#858585] mb-6">
              Configure your Gemini API key. Get it for free from Google AI Studio. The key is encrypted and stored securely.
            </p>

            <div className="space-y-4">
              {API_PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  className="border border-[#3e3e42] rounded-lg p-4 hover:border-[#525252] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-blue-400" />
                      <h3 className="font-medium">{provider.name}</h3>
                    </div>
                    {savedKeys[provider.id] && (
                      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Configured</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={apiKeys[provider.id] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                        placeholder={provider.placeholder}
                        className="w-full px-4 py-2 bg-[#3c3c3c] border border-[#3e3e42] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#cccccc] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(provider.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#858585] hover:text-[#cccccc]"
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAPIKeyUpdate(provider.id)}
                      disabled={saving || !apiKeys[provider.id]}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>

                    {savedKeys[provider.id] && (
                      <button
                        type="button"
                        onClick={() => handleAPIKeyDelete(provider.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#858585]">
                    {provider.info}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-medium text-blue-400 mb-2 flex items-center">
                <Key className="w-4 h-4 mr-2" />
                How to Get Free Gemini API Key
              </h4>
              <ol className="text-sm text-[#cccccc] space-y-1 list-decimal list-inside">
                <li>Visit <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">aistudio.google.com</a></li>
                <li>Sign in with your Google account</li>
                <li>Click "Get API Key" button</li>
                <li>Copy your API key (starts with "AIza...")</li>
                <li>Paste it above and click Save</li>
              </ol>
              <p className="text-sm text-[#cccccc] mt-3">
                <strong>Free Tier:</strong> 15 requests/min, 1M tokens/day, No credit card required
              </p>
            </div>

            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h4 className="font-medium text-green-400 mb-2">
                Available Gemini Models
              </h4>
              <ul className="text-sm text-[#cccccc] space-y-1">
                <li>🚀 <strong>Gemini 2.0 Flash</strong> - Ultra-fast responses (Default)</li>
                <li>🧠 <strong>Gemini 1.5 Pro</strong> - Advanced reasoning, longer context</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
