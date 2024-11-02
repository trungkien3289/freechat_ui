#stage 1
FROM node:20 AS build

WORKDIR /app

# Define a build argument
# ARG BACKEND_URL

# Log the value of BACKEND_URL to check if it's passed correctly
# RUN echo "The backend URL is: $BACKEND_URL"

COPY package.json .

RUN npm install

COPY . .

# Replace environment.ts during build
# ARG BACKEND_URL
# RUN echo "The backend URL is: $BACKEND_URL"
#RUN sed -i "s|http://localhost:5000|${BACKEND_URL}|g" src/app/environment.ts

RUN npm run build --prod

# Stage 2: Serve with NGINX
FROM nginx:alpine

RUN apk add --no-cache bash



# Copy the build output from the Angular app to NGINX's default public directory
COPY --from=build /app/dist/emotion-demo /usr/share/nginx/html

# Copy a custom NGINX configuration file (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/emotion-demo/replace.env.sh /usr/share/nginx/html/replace.env.sh

RUN chmod +x /usr/share/nginx/html/replace.env.sh

# Expose port 80 to the outside world
EXPOSE 80

# Set the entrypoint to your script
# ENTRYPOINT ["/usr/share/nginx/html/replace.env.sh"]

# Start NGINX
# CMD ["nginx", "-g", "daemon off;"]

