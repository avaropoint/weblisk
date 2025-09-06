# Production-ready Dockerfile for Weblisk Framework
FROM denoland/deno:1.45.5

# Set working directory
WORKDIR /app

# Set production environment
ENV WEBLISK_ENV=production
ENV WEBLISK_LOG_LEVEL=INFO
ENV WEBLISK_LOG_FORMAT=json

# Copy application files
COPY . .

# Cache dependencies
RUN deno cache lib/weblisk.ts src/app.ts

# Create non-root user for security
RUN groupadd -r weblisk && useradd -r -g weblisk weblisk
RUN chown -R weblisk:weblisk /app
USER weblisk

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD deno eval "fetch('http://localhost:3000/health').then(r => r.ok ? Deno.exit(0) : Deno.exit(1))" || exit 1

# Start application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/app.ts"]
