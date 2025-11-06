# Use official Node LTS image
FROM node:22-bullseye-slim

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 8000
EXPOSE 8000

# Start the backend with nodemon for hot reload
CMD ["npm", "run", "dev"]
