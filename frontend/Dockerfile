# Use official Node LTS image
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose port 5173 for Vite
EXPOSE 5173

# Start the React dev server
CMD ["npm", "start"]
