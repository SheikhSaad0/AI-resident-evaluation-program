# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package manager files
COPY package*.json ./

# Copy Prisma schema before installing dependencies
# This is the crucial fix to ensure 'prisma generate' works on install
COPY prisma ./prisma/

# Install dependencies (this will also trigger 'prisma generate')
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Build the Next.js application for production
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run your app
CMD ["npm", "start"]