FROM node:18-alpine
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --silent
# Copy all source code and build the app
COPY . .
RUN npm run build
# Install a lightweight static file server (like "serve")
RUN npm install -g serve
EXPOSE 5000
# Serve the built app on port 5000
CMD ["serve", "-s", "build", "-l", "5000"]
