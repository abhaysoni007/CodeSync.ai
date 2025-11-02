import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useUser } from '../context/UserContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-vscode-bg">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 mb-4"></div>
          <p className="text-vscode-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
