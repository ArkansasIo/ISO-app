FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build
EXPOSE 8080
CMD ["sh", "-c", "npm run migrate && npm start"]
