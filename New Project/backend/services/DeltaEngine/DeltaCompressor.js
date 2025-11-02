import pako from 'pako';

/**
 * DeltaCompressor - Handles compression and decompression of delta patches
 * Uses gzip compression for efficient storage
 */
class DeltaCompressor {
  /**
   * Compress a delta patch
   */
  static async compress(deltaString) {
    try {
      if (!deltaString || deltaString.length === 0) {
        return {
          data: '',
          ratio: 1.0,
          originalSize: 0,
          compressedSize: 0
        };
      }

      const originalSize = Buffer.byteLength(deltaString, 'utf8');
      
      // Convert string to Uint8Array
      const input = new TextEncoder().encode(deltaString);
      
      // Compress using pako (gzip)
      const compressed = pako.gzip(input, { level: 6 });
      
      // Convert to base64 for storage
      const base64 = Buffer.from(compressed).toString('base64');
      const compressedSize = Buffer.byteLength(base64, 'utf8');
      
      const ratio = originalSize > 0 ? compressedSize / originalSize : 1.0;

      return {
        data: base64,
        ratio,
        originalSize,
        compressedSize
      };
    } catch (error) {
      console.error('[DeltaCompressor] Compression error:', error);
      throw error;
    }
  }

  /**
   * Decompress a delta patch
   */
  static async decompress(compressedData) {
    try {
      if (!compressedData || compressedData.length === 0) {
        return '';
      }

      // Convert from base64
      const compressed = Buffer.from(compressedData, 'base64');
      
      // Decompress using pako
      const decompressed = pako.ungzip(compressed);
      
      // Convert back to string
      const result = new TextDecoder().decode(decompressed);

      return result;
    } catch (error) {
      console.error('[DeltaCompressor] Decompression error:', error);
      throw error;
    }
  }

  /**
   * Batch compress multiple deltas
   */
  static async batchCompress(deltas) {
    const results = [];
    
    for (const delta of deltas) {
      const compressed = await this.compress(delta);
      results.push(compressed);
    }

    return results;
  }

  /**
   * Check if compression is beneficial
   */
  static shouldCompress(data, threshold = 1024) {
    const size = Buffer.byteLength(data, 'utf8');
    return size > threshold;
  }
}

/**
 * Export helper functions
 */
export const compressDelta = (data) => DeltaCompressor.compress(data);
export const decompressDelta = (data) => DeltaCompressor.decompress(data);
export const batchCompressDelta = (deltas) => DeltaCompressor.batchCompress(deltas);
export const shouldCompress = (data, threshold) => DeltaCompressor.shouldCompress(data, threshold);

export default DeltaCompressor;
