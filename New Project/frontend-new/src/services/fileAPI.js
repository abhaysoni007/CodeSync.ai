import apiClient from '../utils/api';

/**
 * File System API Service
 * Handles all file explorer CRUD operations
 */

const baseURL = '/api/filesystem';

/**
 * Get file structure for a project
 * @param {string} projectId - The project ID
 * @returns {Promise} - File structure tree
 */
export const getFileStructure = async (projectId) => {
  try {
    const response = await apiClient.get(`${baseURL}/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Get file structure error:', error);
    throw error;
  }
};

/**
 * Create a new file or folder
 * @param {string} projectId - The project ID
 * @param {Object} data - { name, type, parentPath, content }
 * @returns {Promise} - Created node
 */
export const createFileOrFolder = async (projectId, data) => {
  try {
    const response = await apiClient.post(`${baseURL}/${projectId}/create`, data);
    return response.data;
  } catch (error) {
    console.error('Create file/folder error:', error);
    throw error;
  }
};

/**
 * Rename a file or folder
 * @param {string} projectId - The project ID
 * @param {Object} data - { path, newName }
 * @returns {Promise} - Updated node
 */
export const renameFileOrFolder = async (projectId, data) => {
  try {
    const response = await apiClient.put(`${baseURL}/${projectId}/rename`, data);
    return response.data;
  } catch (error) {
    console.error('Rename file/folder error:', error);
    throw error;
  }
};

/**
 * Delete a file or folder
 * @param {string} projectId - The project ID
 * @param {Object} data - { path }
 * @returns {Promise} - Deletion confirmation
 */
export const deleteFileOrFolder = async (projectId, data) => {
  try {
    const response = await apiClient.delete(`${baseURL}/${projectId}/delete`, { data });
    return response.data;
  } catch (error) {
    console.error('Delete file/folder error:', error);
    throw error;
  }
};

/**
 * Get file content
 * @param {string} projectId - The project ID
 * @param {Array} path - Path array to the file
 * @returns {Promise} - File content
 */
export const getFileContent = async (projectId, path) => {
  try {
    const response = await apiClient.get(`${baseURL}/${projectId}/file`, {
      params: { path: JSON.stringify(path) }
    });
    return response.data;
  } catch (error) {
    console.error('Get file content error:', error);
    throw error;
  }
};

/**
 * Update file content
 * @param {string} projectId - The project ID
 * @param {Object} data - { path, content }
 * @returns {Promise} - Updated file
 */
export const updateFileContent = async (projectId, data) => {
  try {
    const response = await apiClient.put(`${baseURL}/${projectId}/file`, data);
    return response.data;
  } catch (error) {
    console.error('Update file content error:', error);
    throw error;
  }
};

/**
 * Upload real files into the project (drag-drop / picker).
 * @param {string} projectId
 * @param {File[]} files
 * @param {Array} parentPath - folder path to drop them in, e.g. ['src']
 */
export const uploadFiles = async (projectId, files, parentPath = []) => {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  form.append('parentPath', JSON.stringify(parentPath));

  const response = await apiClient.post(`${baseURL}/${projectId}/upload`, form);
  return response.data;
};

/**
 * Download a file to the user's machine. Goes through the axios client (and therefore the auth
 * header) rather than a bare <a href>, which would arrive unauthenticated.
 */
export const downloadFile = async (projectId, path) => {
  const response = await apiClient.get(`${baseURL}/${projectId}/download`, {
    params: { path: JSON.stringify(path) },
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = path[path.length - 1];
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * URL that renders a project file as a real web page.
 *
 * The token rides in the query string only on this first hit; the server swaps it for an
 * httpOnly cookie so stylesheets, scripts and images load without it.
 */
export const previewUrl = (projectId, path) => {
  const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');
  const rel = (path || []).map(encodeURIComponent).join('/');
  return `${apiURL}/preview/${projectId}/${rel}?t=${encodeURIComponent(token || '')}`;
};

/** Move a file or folder into another folder (drag-and-drop in the explorer). */
export const moveNode = async (projectId, { path, targetPath }) => {
  const response = await apiClient.post(`${baseURL}/${projectId}/move`, { path, targetPath });
  return response.data;
};

/** Plain-text search across the workspace. Results carry a path and a 1-based line number. */
export const searchProject = async (projectId, query, options = {}) => {
  const response = await apiClient.get(`${baseURL}/${projectId}/search`, {
    params: {
      q: query,
      caseSensitive: options.caseSensitive ? 'true' : 'false',
      regex: options.regex ? 'true' : 'false',
    },
  });
  return response.data;
};

/** Which dev servers are listening right now (Ports panel). */
export const listPorts = async (projectId) => {
  const response = await apiClient.get(`/api/terminal/${projectId}/ports`);
  return response.data;
};

export default {
  getFileStructure,
  createFileOrFolder,
  renameFileOrFolder,
  deleteFileOrFolder,
  getFileContent,
  updateFileContent,
  uploadFiles,
  downloadFile,
  previewUrl,
  moveNode,
  searchProject,
  listPorts,
};
