FROM node:14

# Install MongoDB tools
RUN apt-get update && \
    apt-get install -y wget && \
    wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add - && \
    echo "deb http://repo.mongodb.org/apt/debian buster/mongodb-org/4.4 main" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list && \
    apt-get update && \
    apt-get install -y mongodb-org-tools

WORKDIR /usr/src/app

COPY package*.json ./

COPY ./dump /docker-entrypoint-initdb.d/

RUN npm install --only=production

COPY . .

EXPOSE 3000

COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT [ "/docker-entrypoint.sh" ]


