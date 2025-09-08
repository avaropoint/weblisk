/**
 * Weblisk Framework - Enhanced Form Handling
 * Server-side form processing with WebSocket integration and file upload support
 */

import type { RouteContext } from "./types.ts";

export interface FormValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null; // return error message or null if valid
  message?: string;
  type?: "string" | "number" | "email" | "url" | "file" | "image";
}

export interface FileUploadConfig {
  maxSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[];
  destination?: string; // upload directory
  filename?: (originalName: string) => string; // custom filename generator
  processImage?: {
    resize?: { width?: number; height?: number };
    format?: "webp" | "jpeg" | "png";
    quality?: number;
  };
  uploadToWebSocket?: boolean; // Stream upload progress via WebSocket
}

export interface FormValidationRules {
  [fieldName: string]: FormValidationRule;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  data: Record<string, unknown>;
  files?: Record<string, File[]>;
}

export interface FormProcessorConfig {
  rules?: FormValidationRules;
  fileUpload?: FileUploadConfig;
  onSuccess?: (
    data: Record<string, unknown>,
    context: RouteContext,
  ) => Promise<unknown> | unknown;
  submit?: (
    data: Record<string, unknown>,
    context: RouteContext,
  ) => Promise<unknown> | unknown;
  onError?: (
    errors: Record<string, string>,
    context: RouteContext,
  ) => Promise<unknown> | unknown;
  onFileUpload?: (
    file: File,
    progress: number,
    context: RouteContext,
  ) => Promise<void> | void;
  sanitize?: boolean;
  hooks?: {
    beforeValidation?: (
      data: Record<string, unknown>,
    ) => Record<string, unknown>;
    afterValidation?: (result: FormValidationResult) => FormValidationResult;
    beforeProcess?: (
      data: Record<string, unknown>,
    ) => Promise<Record<string, unknown>> | Record<string, unknown>;
    afterProcess?: (
      result: unknown,
      data: Record<string, unknown>,
    ) => Promise<unknown> | unknown;
  };
}

/**
 * Server-side form processor that integrates with WebSocket events
 */
export class WebliskFormProcessor {
  private config: FormProcessorConfig;

  constructor(config: FormProcessorConfig = {}) {
    this.config = {
      sanitize: true,
      ...config,
    };
  }

  /**
   * Process form data received via WebSocket
   */
  async processFormData(
    formData: Record<string, unknown>,
    context: RouteContext,
  ): Promise<FormValidationResult> {
    // Sanitize input if enabled
    const sanitizedData = this.config.sanitize
      ? this.sanitizeFormData(formData)
      : formData;

    // Validate the form data
    const validation = this.validateFormData(sanitizedData);

    if (validation.isValid) {
      // Call success handler if provided
      if (this.config.onSuccess) {
        try {
          const result = await this.config.onSuccess(sanitizedData, context);
          return {
            ...validation,
            data: { ...sanitizedData, result },
          };
        } catch (error) {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          return {
            isValid: false,
            errors: { _form: `Processing error: ${errorMessage}` },
            data: sanitizedData,
          };
        }
      }
    } else {
      // Call error handler if provided
      if (this.config.onError) {
        await this.config.onError(validation.errors, context);
      }
    }

    return validation;
  }

  /**
   * Validate form data against rules
   */
  private validateFormData(
    data: Record<string, unknown>,
  ): FormValidationResult {
    const errors: Record<string, string> = {};
    const rules = this.config.rules || {};

    for (const [fieldName, rule] of Object.entries(rules)) {
      const value = data[fieldName];
      const error = this.validateField(value, rule);

      if (error) {
        errors[fieldName] = error;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data,
    };
  }

  /**
   * Validate a single field against its rule
   */
  private validateField(
    value: unknown,
    rule: FormValidationRule,
  ): string | null {
    // Required validation
    if (
      rule.required && (value === undefined || value === null || value === "")
    ) {
      return rule.message || "This field is required";
    }

    // Skip other validations if field is empty and not required
    if (
      !rule.required && (value === undefined || value === null || value === "")
    ) {
      return null;
    }

    const stringValue = String(value);

    // Length validations
    if (rule.minLength && stringValue.length < rule.minLength) {
      return rule.message || `Must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return rule.message ||
        `Must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return rule.message || "Invalid format";
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  /**
   * Sanitize form data to prevent XSS and other attacks
   */
  private sanitizeFormData(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        // Basic HTML entity encoding for strings
        sanitized[key] = value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .trim();
      } else if (Array.isArray(value)) {
        // Recursively sanitize arrays
        sanitized[key] = value.map((item) =>
          typeof item === "string"
            ? this.sanitizeFormData({ temp: item }).temp
            : item
        );
      } else if (typeof value === "object" && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeFormData(
          value as Record<string, unknown>,
        );
      } else {
        // Keep other types as-is (numbers, booleans, etc.)
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Convenience function to create form processors for common patterns
 */
export function createFormProcessor(
  config: FormProcessorConfig,
): WebliskFormProcessor {
  return new WebliskFormProcessor(config);
}

/**
 * Common validation rules for typical form fields
 */
export const commonValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },

  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s-']+$/,
    message: "Name must contain only letters, spaces, hyphens, and apostrophes",
  },

  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: "Please enter a valid phone number",
  },

  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message:
      "Password must be at least 8 characters with uppercase, lowercase, and number",
  },

  url: {
    pattern: /^https?:\/\/.+\..+$/,
    message: "Please enter a valid URL starting with http:// or https://",
  },
};

/**
 * Generate client-side form handling JavaScript
 * This gets injected into pages that need form functionality
 */
export function generateFormClientCode(): string {
  return `
    // Weblisk Form Handling - Client-side utilities
    Weblisk.forms = {
      // Serialize form data
      serialize: function(form) {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
          if (data[key]) {
            // Handle multiple values (checkboxes, multiple selects)
            if (Array.isArray(data[key])) {
              data[key].push(value);
            } else {
              data[key] = [data[key], value];
            }
          } else {
            data[key] = value;
          }
        }
        return data;
      },

      // Submit form via WebSocket
      submit: function(form, options = {}) {
        const data = this.serialize(form);
        const eventName = options.event || 'form-submit';

        // Add form identifier if specified
        if (options.formId) {
          data._formId = options.formId;
        }

        // Send via WebSocket
        Weblisk.sendEvent(eventName, data);

        // Prevent default form submission
        return false;
      },

      // Handle form validation errors
      showErrors: function(errors, formSelector = 'form') {
        const form = document.querySelector(formSelector);
        if (!form) return;

        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        // Show new errors
        for (const [field, message] of Object.entries(errors)) {
          const input = form.querySelector(\`[name="\${field}"]\`);
          if (input) {
            input.classList.add('error');
            const errorEl = document.createElement('div');
            errorEl.className = 'form-error';
            errorEl.textContent = message;
            input.parentNode.insertBefore(errorEl, input.nextSibling);
          }
        }
      },

      // Clear form errors
      clearErrors: function(formSelector = 'form') {
        const form = document.querySelector(formSelector);
        if (!form) return;

        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      },

      // File upload with progress via WebSocket
      uploadFiles: function(files, options = {}) {
        if (!files || files.length === 0) return Promise.resolve([]);

        const uploads = Array.from(files).map(file => this.uploadFile(file, options));
        return Promise.all(uploads);
      },

      // Single file upload with progress streaming
      uploadFile: function(file, options = {}) {
        return new Promise((resolve, reject) => {
          const chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks
          const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

          let offset = 0;
          const totalSize = file.size;

          const uploadChunk = () => {
            const chunk = file.slice(offset, offset + chunkSize);
            const reader = new FileReader();

            reader.onload = (e) => {
              const chunkData = e.target.result;
              const progress = Math.round((offset / totalSize) * 100);

              // Send chunk via WebSocket
              Weblisk.sendEvent('file_upload_chunk', {
                uploadId,
                filename: file.name,
                mimeType: file.type,
                size: totalSize,
                offset,
                chunk: chunkData,
                progress,
                isComplete: offset + chunkSize >= totalSize
              });

              offset += chunkSize;

              if (offset < totalSize) {
                // Continue uploading
                setTimeout(uploadChunk, 10); // Small delay to prevent overwhelming
              } else {
                // Upload complete
                resolve({
                  uploadId,
                  filename: file.name,
                  size: totalSize,
                  mimeType: file.type
                });
              }
            };

            reader.onerror = () => reject(new Error('Failed to read file chunk'));
            reader.readAsArrayBuffer(chunk);
          };

          // Start upload
          uploadChunk();
        });
      },

      // Image optimization and preview
      processImage: function(file, options = {}) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              // Calculate new dimensions
              let { width, height } = img;
              const maxWidth = options.maxWidth || 1920;
              const maxHeight = options.maxHeight || 1080;

              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
              }

              canvas.width = width;
              canvas.height = height;

              // Draw and compress
              ctx.drawImage(img, 0, 0, width, height);

              canvas.toBlob((blob) => {
                resolve(blob);
              }, options.format || 'image/webp', options.quality || 0.8);
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      }
    };
  `;
}

/**
 * Enhanced file upload processor for server-side handling
 */
export class FileUploadProcessor {
  private uploadSessions = new Map<string, {
    filename: string;
    mimeType: string;
    totalSize: number;
    chunks: ArrayBuffer[];
    receivedSize: number;
    startTime: number;
  }>();

  /**
   * Process file upload chunk
   */
  async processChunk(data: {
    uploadId: string;
    filename: string;
    mimeType: string;
    size: number;
    offset: number;
    chunk: ArrayBuffer;
    progress: number;
    isComplete: boolean;
  }): Promise<{ success: boolean; progress: number; fileUrl?: string }> {
    const { uploadId, filename, mimeType, size, chunk, isComplete } = data;

    // Initialize upload session if new
    if (!this.uploadSessions.has(uploadId)) {
      this.uploadSessions.set(uploadId, {
        filename,
        mimeType,
        totalSize: size,
        chunks: [],
        receivedSize: 0,
        startTime: Date.now(),
      });
    }

    const session = this.uploadSessions.get(uploadId)!;
    session.chunks.push(chunk);
    session.receivedSize += chunk.byteLength;

    const progress = Math.round(
      (session.receivedSize / session.totalSize) * 100,
    );

    if (isComplete) {
      // Combine all chunks and save file
      const fileUrl = await this.saveFile(uploadId, session);
      this.uploadSessions.delete(uploadId);

      return {
        success: true,
        progress: 100,
        fileUrl,
      };
    }

    return {
      success: true,
      progress,
    };
  }

  /**
   * Save uploaded file to storage
   */
  private async saveFile(uploadId: string, session: {
    filename: string;
    mimeType: string;
    totalSize: number;
    chunks: ArrayBuffer[];
  }): Promise<string> {
    // Combine chunks
    const totalSize = session.chunks.reduce(
      (sum, chunk) => sum + chunk.byteLength,
      0,
    );
    const combinedArray = new Uint8Array(totalSize);

    let offset = 0;
    for (const chunk of session.chunks) {
      combinedArray.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const ext = session.filename.split(".").pop() || "";
    const basename = session.filename.replace(/\.[^/.]+$/, "");
    const filename = `${timestamp}_${uploadId}_${basename}.${ext}`;

    // Save to uploads directory
    const uploadsDir = "./uploads";
    try {
      await Deno.mkdir(uploadsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    const filepath = `${uploadsDir}/${filename}`;
    await Deno.writeFile(filepath, combinedArray);

    return `/uploads/${filename}`;
  }

  /**
   * Get upload progress
   */
  getUploadProgress(
    uploadId: string,
  ): { progress: number; speed: number } | null {
    const session = this.uploadSessions.get(uploadId);
    if (!session) return null;

    const progress = Math.round(
      (session.receivedSize / session.totalSize) * 100,
    );
    const elapsed = Date.now() - session.startTime;
    const speed = session.receivedSize / (elapsed / 1000); // bytes per second

    return { progress, speed };
  }
}

/**
 * Global file upload processor instance
 */
export const fileUploadProcessor: FileUploadProcessor =
  new FileUploadProcessor();
