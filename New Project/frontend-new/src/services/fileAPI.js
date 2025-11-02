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

export default {
  getFileStructure,
  createFileOrFolder,
  renameFileOrFolder,
  deleteFileOrFolder,
  getFileContent,
  updateFileContent
};
