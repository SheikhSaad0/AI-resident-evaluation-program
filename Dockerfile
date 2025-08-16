# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Set the PORT environment variable
ENV PORT 8080

# Copy package manager files
COPY package*.json ./

# Copy Prisma schema before installing dependencies
COPY prisma ./prisma/

# Install dependencies
RUN npm install

RUN npx prisma generate

# Copy the rest of the application's source code
COPY . .

# Build the Next.js application for production
RUN npm run build


# Expose the port the app runs on
EXPOSE 8080

# Define the command to run your app, using the PORT variable
CMD ["npm", "start", "--", "-p", "8080"]