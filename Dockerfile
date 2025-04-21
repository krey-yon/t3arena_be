#set an official image of node.js runtime
FROM node:22-alpine

#set the working directory in the container
WORKDIR /app

#copy all package.json file in the working directory
COPY package*.json ./

#install dependency
RUN ls
RUN npm install

#Sets an environment variable called PORT with the value 3001 inside the container.
#why? After dependencies are installed, now you bring your source code (.js, .ts, .env, etc.).
COPY . .

#Sets an environment variable called PORT with the value 3001 inside the container.
ENV PORT=3001

#This is the command that will run when you start the container.
CMD [ "npm", "run", "start" ]