#!/bin/sh
set -e

# Default to /api if BACKEND_URL is not set
export BACKEND_URL=${BACKEND_URL:-/api}

# Substitute environment variables in config template
envsubst '${BACKEND_URL}' < /usr/share/nginx/html/assets/config.template.js > /usr/share/nginx/html/assets/config.js

# Start nginx
exec nginx -g "daemon off;"
