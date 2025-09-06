# Production deployment script
#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="ghcr.io/avaropoint/weblisk"
CONTAINER_NAME="weblisk-app"
NETWORK_NAME="weblisk-network"
ENV_FILE=".env"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warn "Environment file $ENV_FILE not found. Creating from template..."
        cp .env.example "$ENV_FILE"
        log_warn "Please edit $ENV_FILE with your configuration before continuing"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Build or pull Docker image
build_image() {
    local tag=${1:-latest}
    log_info "Building Docker image with tag: $tag"
    
    docker build \
        --tag "${DOCKER_IMAGE}:${tag}" \
        --tag "${DOCKER_IMAGE}:latest" \
        .
        
    log_info "Docker image built successfully"
}

# Deploy with Docker Compose
deploy_compose() {
    log_info "Deploying with Docker Compose..."
    
    # Pull latest images
    docker-compose pull
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Health check
    if health_check; then
        log_info "Deployment successful!"
    else
        log_error "Deployment failed health check"
        docker-compose logs weblisk
        exit 1
    fi
}

# Deploy with Docker directly
deploy_docker() {
    local tag=${1:-latest}
    log_info "Deploying with Docker (tag: $tag)..."
    
    # Create network if it doesn't exist
    docker network create "$NETWORK_NAME" 2>/dev/null || true
    
    # Stop and remove existing container
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    
    # Run new container
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network "$NETWORK_NAME" \
        --env-file "$ENV_FILE" \
        -p 3000:3000 \
        --restart unless-stopped \
        --health-cmd="deno eval \"fetch('http://localhost:3000/health').then(r => r.ok ? Deno.exit(0) : Deno.exit(1))\"" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        "${DOCKER_IMAGE}:${tag}"
    
    # Wait for container to be ready
    log_info "Waiting for container to be ready..."
    sleep 10
    
    # Health check
    if health_check; then
        log_info "Deployment successful!"
        show_status
    else
        log_error "Deployment failed health check"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
}

# Health check
health_check() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    return 1
}

# Show deployment status
show_status() {
    log_info "=== Deployment Status ==="
    
    if command -v docker-compose &> /dev/null && [[ -f docker-compose.yml ]]; then
        docker-compose ps
    else
        docker ps --filter "name=$CONTAINER_NAME"
    fi
    
    echo
    log_info "Application URL: http://localhost:3000"
    log_info "Health Check: http://localhost:3000/health"
    
    # Show logs
    log_info "Recent logs:"
    if command -v docker-compose &> /dev/null && [[ -f docker-compose.yml ]]; then
        docker-compose logs --tail=20 weblisk
    else
        docker logs --tail=20 "$CONTAINER_NAME"
    fi
}

# Stop deployment
stop_deployment() {
    log_info "Stopping deployment..."
    
    if command -v docker-compose &> /dev/null && [[ -f docker-compose.yml ]]; then
        docker-compose down
    else
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi
    
    log_info "Deployment stopped"
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  build [TAG]          Build Docker image with optional tag"
    echo "  deploy-compose       Deploy using Docker Compose"
    echo "  deploy-docker [TAG]  Deploy using Docker directly with optional tag"
    echo "  health               Run health check"
    echo "  status               Show deployment status"
    echo "  stop                 Stop deployment"
    echo "  logs                 Show application logs"
    echo "  help                 Show this help message"
    echo
    echo "Examples:"
    echo "  $0 build v1.2.3"
    echo "  $0 deploy-compose"
    echo "  $0 deploy-docker latest"
    echo "  $0 status"
}

# Show logs
show_logs() {
    if command -v docker-compose &> /dev/null && [[ -f docker-compose.yml ]]; then
        docker-compose logs -f weblisk
    else
        docker logs -f "$CONTAINER_NAME"
    fi
}

# Main script
main() {
    case "${1:-help}" in
        "build")
            check_prerequisites
            build_image "${2:-latest}"
            ;;
        "deploy-compose")
            check_prerequisites
            deploy_compose
            ;;
        "deploy-docker")
            check_prerequisites
            deploy_docker "${2:-latest}"
            ;;
        "health")
            health_check && log_info "Health check passed" || log_error "Health check failed"
            ;;
        "status")
            show_status
            ;;
        "stop")
            stop_deployment
            ;;
        "logs")
            show_logs
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
