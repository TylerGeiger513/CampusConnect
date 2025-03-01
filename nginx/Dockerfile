FROM nginx:alpine

# Remove the default configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom configuration (ensure the file name matches exactly)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Clear the default entrypoint inherited from the base image
ENTRYPOINT []

# Use the nginx binary from PATH to run Nginx
CMD ["nginx", "-g", "daemon off;"]
