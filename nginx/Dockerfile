# Stage 1: Build the React app
FROM node:18-alpine AS builder
WORKDIR /app
# Copy package files from the frontend folder (build context must include the entire project)
COPY frontend/package*.json ./
RUN npm ci --silent
# Copy the entire frontend source code
COPY frontend .
# Build the React application (output will be in /app/build)
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine
# Remove the default configuration
RUN rm -f /etc/nginx/conf.d/default.conf
# Copy your custom Nginx configuration from the nginx folder
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built static assets from the builder stage into Nginx’s web directory
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
