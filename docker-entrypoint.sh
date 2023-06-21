#!/bin/sh

# Import the collections
mongoimport --host db --db centria_chat --collection channels --type json --file /docker-entrypoint-initdb.d/centria_chat.channels.json --jsonArray
mongoimport --host db --db centria_chat --collection messages --type json --file /docker-entrypoint-initdb.d/centria_chat.messages.json --jsonArray
mongoimport --host db --db centria_chat --collection users --type json --file /docker-entrypoint-initdb.d/centria_chat.users.json --jsonArray

# Start the server
node server.js
