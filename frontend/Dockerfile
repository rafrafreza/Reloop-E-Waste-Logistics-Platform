# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Expose the port Vite runs on (default is 5173)
EXPOSE 5173

# Command to run the development server
CMD ["npm", "run", "dev", "--", "--host"]
