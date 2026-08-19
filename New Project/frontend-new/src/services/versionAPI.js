import apiClient from '../utils/api';

/**
 * Version Control API Service
 * Handles file versioning, history, comparison, and restorations
 */

const baseURL = '/api/files';

/**
 * Save a new snapshot version of a file
 * @param {string} fileId - The canonical Mongo file ID or path
 * @param {Object} payload - { content, message, tags, projectId }
 * @returns {Promise} - Created version details
 */
export const saveVersion = async (fileId, payload) => {
  try {
    const response = await apiClient.post(`${baseURL}/${encodeURIComponent(fileId)}/versions`, payload);
    return response.data;
  } catch (error) {
    console.error('Save version error:', error);
    throw error;
  }
};

/**
 * Get version history for a file
 * @param {string} fileId - The file ID or path
 * @param {Object} params - { page, limit, includeAutoSave, projectId }
 * @returns {Promise} - List of versions and currentVersion info
 */
export const getVersionHistory = async (fileId, params = {}) => {
  try {
    const response = await apiClient.get(`${baseURL}/${encodeURIComponent(fileId)}/versions`, { params });
    return response.data;
  } catch (error) {
    console.error('Get version history error:', error);
    throw error;
  }
};

/**
 * Get specific version details including content and diff
 * @param {string} fileId - The file ID or path
 * @param {number} versionNumber - Version number to fetch
 * @param {Object} params - { projectId }
 * @returns {Promise} - Full version details
 */
export const getVersionDetails = async (fileId, versionNumber, params = {}) => {
  try {
    const response = await apiClient.get(`${baseURL}/${encodeURIComponent(fileId)}/versions/${versionNumber}`, { params });
    return response.data;
  } catch (error) {
    console.error('Get version details error:', error);
    throw error;
  }
};

/**
 * Compare two versions of a file
 * @param {string} fileId - The file ID or path
 * @param {number} versionA - First version number
 * @param {number} versionB - Second version number
 * @param {Object} params - { projectId }
 * @returns {Promise} - Diff string and statistics
 */
export const compareVersions = async (fileId, versionA, versionB, params = {}) => {
  try {
    const response = await apiClient.get(`${baseURL}/${encodeURIComponent(fileId)}/compare/${versionA}/${versionB}`, { params });
    return response.data;
  } catch (error) {
    console.error('Compare versions error:', error);
    throw error;
  }
};

/**
 * Restore a file to a specific historical version
 * @param {string} fileId - The file ID or path
 * @param {number} versionNumber - Target version number to restore
 * @param {Object} payload - { message, projectId }
 * @returns {Promise} - Restoration confirmation and newly created head version
 */
export const restoreVersion = async (fileId, versionNumber, payload = {}) => {
  try {
    const response = await apiClient.post(`${baseURL}/${encodeURIComponent(fileId)}/versions/${versionNumber}/restore`, payload);
    return response.data;
  } catch (error) {
    console.error('Restore version error:', error);
    throw error;
  }
};

export default {
  saveVersion,
  getVersionHistory,
  getVersionDetails,
  compareVersions,
  restoreVersion
};
