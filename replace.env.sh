#!/bin/bash

# Replace placeholder variables in a frontend file (e.g., env.json)
echo "Replacing environment variables in frontend file ${API_URL}"
sed -i 's|http://localhost:5000|'${API_URL}'|g' /usr/share/nginx/html/assets/env.json

nginx -g "daemon off;"
# After replacement, start the actual app (e.g., web server)
# exec "$@"
