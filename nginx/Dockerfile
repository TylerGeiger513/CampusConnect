# nginx/Dockerfile

# Stage 1: Build the Frontend
FROM node:18-alpine as frontend-build
WORKDIR /app
# Copy package files and the production env file (.env.prod) so that your build picks it up.
COPY frontend/package*.json ./
COPY frontend/.env.prod ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Setup NGINX to serve the built frontend and proxy API calls.
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/
# Copy the built frontend from Stage 1.
COPY --from=frontend-build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
