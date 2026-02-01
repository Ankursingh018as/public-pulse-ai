FROM node:20-alpine

WORKDIR /app

# Copy shared schemas if they exist (assuming context is root or structure allows)
# In monorepo docker compose, we mount volumes, but for build we might need copy
# For this setup, we'll install dependencies

COPY package.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
