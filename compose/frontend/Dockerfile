# Use official Node.js image as base
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock first
COPY frontend/package.json frontend/yarn.lock ./

# Enable Corepack and install the correct Yarn version
RUN corepack enable && corepack prepare yarn@4.5.3 --activate

# Install dependencies using Yarn 4
RUN yarn install --immutable 

# Copy the rest of the application
COPY frontend .

# Set environment variables (optional)
ENV PORT=3000

# Ensure dependencies are correctly linked
RUN yarn rebuild

# Build the Vite project
RUN yarn build

# Expose the port
EXPOSE 3000

# Start Vite development server
CMD ["yarn", "dev", "--host", "0.0.0.0"]

# # Serve the build using yarn dlx (without global install)
# CMD ["yarn", "dlx", "serve", "-s", "dist", "-l", "3000"]
