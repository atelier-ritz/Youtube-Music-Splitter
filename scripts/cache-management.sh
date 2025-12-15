#!/bin/bash

# Band Practice Webapp - Cache Management Script
# This script provides easy commands to manage cached audio files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
check_backend() {
    if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${RED}❌ Backend is not running on port 3001${NC}"
        echo -e "${YELLOW}💡 Start the backend with: npm run dev:backend${NC}"
        exit 1
    fi
}

# Show usage information
show_usage() {
    echo -e "${BLUE}🎵 Band Practice Webapp - Cache Management${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status      Show current cache status and disk usage"
    echo "  clear-all   Clear all cached audio files (uploads, separated tracks, temp)"
    echo "  clear-temp  Clear temporary files only"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 clear-temp"
    echo "  $0 clear-all"
}

# Show cache status
show_status() {
    echo -e "${BLUE}📊 Getting cache status...${NC}"
    response=$(curl -s http://localhost:3001/api/cache/status)
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Cache Status Retrieved${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo -e "${RED}❌ Failed to get cache status${NC}"
        echo "$response"
    fi
}

# Clear all cache
clear_all() {
    echo -e "${YELLOW}🧹 Clearing all cached audio files...${NC}"
    response=$(curl -s -X POST http://localhost:3001/api/cache/clear)
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ All cached files cleared successfully${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo -e "${RED}❌ Failed to clear cache${NC}"
        echo "$response"
    fi
}

# Clear temp files only
clear_temp() {
    echo -e "${YELLOW}🧹 Clearing temporary files...${NC}"
    response=$(curl -s -X POST http://localhost:3001/api/cache/clear-temp)
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Temporary files cleared successfully${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo -e "${RED}❌ Failed to clear temp files${NC}"
        echo "$response"
    fi
}

# Main script logic
main() {
    case "${1:-help}" in
        "status")
            check_backend
            show_status
            ;;
        "clear-all")
            check_backend
            clear_all
            ;;
        "clear-temp")
            check_backend
            clear_temp
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"