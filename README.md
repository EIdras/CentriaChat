# CentriaChat
My project is a **web chat application**, like *Messenger*, *Discord*, *WhatsApp*...
There is a **login** page where you can register or login.
There is then the main **discussion** page where you can chose in wich channels you want to discuss, display the messages of this channel and, well, send and recieve messages.
From this page, you will aslo have access to a **settings** page where you can change your avatar, display name and prefered theme color, and it should update the database.

## Docker
I have made a **Docker image** so you cun run the web pages, the server and the pre-filled mongo database at the same time.
The image is on Docker Hub so you can just **pull** it with the command  
`docker pull eldryx/centriachat-web:latest`

You can then use the linked `docker-compose.yml` file to run the `docker-compose up command`.
The site should be running on http://127.0.0.1:3000/ .

## Existing users
#### Since I didn't implemented a system to create of modify a channel, a new user will not be part of any of it, but you can still try to create one. 
##### Here is the users I created and that should already be in the database. You should be able to log in with it to discuss in the channels they are part of (there are 3 channels) :
### Jack
login : Jack  
passwd: Jackpasswd1  

Has access to all 3 channels

### Maria
login : Maria  
passwd: Mariapasswd2  

Has access to Study Group + Friends

### David
login : David  
passwd: Davidpasswd3  

Has access to Study group + Clubbers