/**
 * Static File Handling Module for Weblisk
 * Handles static file serving, MIME type detection, and caching
 */

import { logger } from "./logger.ts";

export interface StaticFile {
  content: string;
  contentType: string;
  isBase64?: boolean;
  lastModified?: Date;
  etag?: string;
}

export interface StaticFileOptions {
  contentType?: string;
  isBase64?: boolean;
  cacheMaxAge?: number;
}

export class StaticFileManager {
  private files = new Map<string, StaticFile>();
  private readonly defaultCacheMaxAge = 86400; // 24 hours

  /**
   * Add a static file
   */
  addFile(
    path: string,
    content: string,
    options: StaticFileOptions = {},
  ): void {
    const normalizedPath = this.normalizePath(path);
    const contentType = options.contentType || this.getMimeType(path);
    const etag = this.generateETag(content);

    const staticFile: StaticFile = {
      content,
      contentType,
      isBase64: options.isBase64 || false,
      lastModified: new Date(),
      etag,
    };

    this.files.set(normalizedPath, staticFile);
    logger.info(`Static file registered: ${normalizedPath}`, { contentType });
  }

  /**
   * Load static files from a directory
   */
  async loadFromDirectory(directory: string): Promise<void> {
    try {
      for await (const entry of Deno.readDir(directory)) {
        if (entry.isFile) {
          const filePath = `${directory}/${entry.name}`;
          const content = await Deno.readTextFile(filePath);
          this.addFile(`/${entry.name}`, content);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load static files from ${directory}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get a static file
   */
  getFile(path: string): StaticFile | null {
    const normalizedPath = this.normalizePath(path);
    return this.files.get(normalizedPath) || null;
  }

  /**
   * Check if a static file exists
   */
  hasFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return this.files.has(normalizedPath);
  }

  /**
   * Remove a static file
   */
  removeFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return this.files.delete(normalizedPath);
  }

  /**
   * Handle static file request and return Response
   */
  handleRequest(path: string, request?: Request): Response | null {
    const staticFile = this.getFile(path);
    if (!staticFile) {
      return null;
    }

    // Handle conditional requests (304 Not Modified)
    if (request) {
      const ifNoneMatch = request.headers.get("If-None-Match");
      if (ifNoneMatch && staticFile.etag && ifNoneMatch === staticFile.etag) {
        return new Response(null, { status: 304 });
      }

      const ifModifiedSince = request.headers.get("If-Modified-Since");
      if (ifModifiedSince && staticFile.lastModified) {
        const modifiedSince = new Date(ifModifiedSince);
        if (staticFile.lastModified <= modifiedSince) {
          return new Response(null, { status: 304 });
        }
      }
    }

    const headers: HeadersInit = {
      "Content-Type": staticFile.contentType,
      "Cache-Control": `public, max-age=${this.defaultCacheMaxAge}`,
    };

    if (staticFile.etag) {
      headers["ETag"] = staticFile.etag;
    }

    if (staticFile.lastModified) {
      headers["Last-Modified"] = staticFile.lastModified.toUTCString();
    }

    // Handle base64 content
    if (staticFile.isBase64) {
      try {
        const binaryString = atob(staticFile.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Response(bytes, { headers });
      } catch {
        return new Response("Invalid base64 content", { status: 500 });
      }
    }

    return new Response(staticFile.content, { headers });
  }

  /**
   * Get MIME type for file extension
   */
  private getMimeType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Text formats
      "txt": "text/plain",
      "html": "text/html",
      "htm": "text/html",
      "css": "text/css",
      "js": "application/javascript",
      "mjs": "application/javascript",
      "json": "application/json",
      "xml": "application/xml",
      "svg": "image/svg+xml",

      // Images
      "png": "image/png",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "gif": "image/gif",
      "webp": "image/webp",
      "avif": "image/avif",
      "ico": "image/x-icon",
      "bmp": "image/bmp",
      "tiff": "image/tiff",

      // Fonts
      "woff": "font/woff",
      "woff2": "font/woff2",
      "ttf": "font/ttf",
      "otf": "font/otf",
      "eot": "application/vnd.ms-fontobject",

      // Audio
      "mp3": "audio/mpeg",
      "wav": "audio/wav",
      "ogg": "audio/ogg",
      "m4a": "audio/mp4",

      // Video
      "mp4": "video/mp4",
      "webm": "video/webm",
      "avi": "video/x-msvideo",
      "mov": "video/quicktime",

      // Documents
      "pdf": "application/pdf",
      "doc": "application/msword",
      "docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      // Archives
      "zip": "application/zip",
      "tar": "application/x-tar",
      "gz": "application/gzip",

      // Web app manifest and related
      "manifest": "application/manifest+json",
      "webmanifest": "application/manifest+json",
    };

    return mimeTypes[ext || ""] || "application/octet-stream";
  }

  /**
   * Normalize file path
   */
  private normalizePath(path: string): string {
    return path.startsWith("/") ? path : `/${path}`;
  }

  /**
   * Generate ETag for content
   */
  private generateETag(content: string): string {
    // Simple hash-based ETag generation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  /**
   * Get all registered file paths
   */
  getAllPaths(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Get statistics about static files
   */
  getStats(): {
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
  } {
    let totalSize = 0;
    const filesByType: Record<string, number> = {};

    for (const file of this.files.values()) {
      totalSize += file.content.length;
      const type = file.contentType.split("/")[0];
      filesByType[type] = (filesByType[type] || 0) + 1;
    }

    return {
      totalFiles: this.files.size,
      totalSize,
      filesByType,
    };
  }

  /**
   * Clear all static files
   */
  clear(): void {
    this.files.clear();
  }
}

// Export singleton instance
export const staticFileManager: StaticFileManager = new StaticFileManager();
