# Use Apify's base image with Puppeteer pre-installed
FROM apify/actor-node-puppeteer-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . ./

# Run the actor
CMD npm start