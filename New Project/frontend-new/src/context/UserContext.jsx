import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { api } from '../utils/api';

const UserContext = createContext(null);

// The API returns raw Mongo documents, which carry `_id`. Components read `user.id`. Normalising
// here (instead of at 20 call sites) keeps "who am I" answerable everywhere.
const withId = (user) => (user ? { ...user, id: user.id || user._id } : user);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(withId(JSON.parse(storedUser)));
          
          // Verify token is still valid
          const response = await api.getProfile();
          setUser(withId(response.data.user));
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } catch (error) {
          console.error('Failed to load user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.login(credentials);
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(withId(newUser));
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.register(userData);
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(withId(newUser));
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    api.logout().catch(() => {}); // Fire and forget
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(withId(updatedUser));
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!token && !!user,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
