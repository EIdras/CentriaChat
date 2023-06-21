const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const secretkey = process.env.SECRET_KEY;
const uri = process.env.DATABASE_URL;

const port = 3000;

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"],
    methods: ["GET", "POST"],
    credentials: true
  }
});


io.on('connection', (socket) => {
  console.log(' -> a user connected');
  socket.on('new message', (msg) => {
    io.emit('new message', msg);
  });
});

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB Connected...'))
.catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  displayname: String,
  avatar: String,
  color: { primary: String, secondary: String },
});
const channelSchema = new mongoose.Schema({
  name: String,
  icon: String,
  participants: [mongoose.Schema.Types.ObjectId],
});
const messageSchema = new mongoose.Schema({
  channelId: mongoose.Schema.Types.ObjectId,
  sender: { id: mongoose.Schema.Types.ObjectId, username: String },
  text: String,
  timestamp: Date,
});


const User = mongoose.model('User', userSchema);
const Channel = mongoose.model('Channel', channelSchema);
const Message = mongoose.model('Message', messageSchema);




app.post('/register', async (req, res) => {
  console.log("Registering user");
  const { username, password } = req.body;

  // Check if a user with the same username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.json({ success: false, message: 'Username already exists' });
  }

  // Check if the username and password meet the requirements
  if (username.length < 4 || password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    return res.json({ success: false, message: 'Username must be at least 4 characters long and password must be at least 8 characters long and contain at least one letter and one number' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, displayname: username, avatar: 'https://static-00.iconduck.com/assets.00/avatar-default-symbolic-icon-2048x1949-pq9uiebg.png', color: { primary: '#3F5EFB', secondary: '#FC466B' } });
  await user.save();
  res.json({ success: true, message: 'User registered successfully' });
});

// Route for logging in
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id, username: user.username, displayname: user.displayname, avatar: user.avatar, color: user.color }, secretkey, { expiresIn: '1h' });
    res.json({ success: true, message: 'Login successful', token });
  } else {
    res.json({ success: false, message: 'Invalid username or password' });
  }
});

// Route for checking if the user is authenticated
app.get('/check-authentication', authenticateJWT, (req, res) => {
  try {
    // Vérification réussie, la requête peut continuer
    console.log("Authentication successful for user " + req.user.username + "");
    res.status(200).json({ success: true, message: "Authentication successful" });
  } catch (error) {
    // Log the error
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/discussion.html', authenticateJWT, (req, res) => {
  // If this point is reached, the user is authenticated
  res.sendFile(__dirname + '/public/discussion.html');
});

const jwt = require('jsonwebtoken');
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, secretkey, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

function getChannels() {
  return Channel.find().populate('participants');
}

// Route for getting all channels
app.get('/channels', async (req, res) => {
  try {
    const channels = await getChannels();
    res.json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving channels');
  }
});

// Route for getting all messages of a channel
app.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;

    // Vérifier si le channel existe
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Récupérer les messages du channel
    const messages = await Message.find({ channelId: channelId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while trying to fetch messages' });
  }
});

// Route for creating a new message
app.post('/messages', async (req, res) => {
  try {
    const messageData = req.body;
    const newMessage = new Message(messageData);
    await newMessage.save();

    // Emit the new message to all clients
    io.emit('new message', newMessage);

    res.json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while trying to send the message' });
  }
});

// Route for updating a user (patch)
app.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayname, avatar, color } = req.body;

    // Check if the user exists in the database
    if (!await User.findById(userId)) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the displayname is valid
    if (displayname && (displayname.length < 3 || displayname.length > 20)) {
      return res.status(400).json({ error: 'Displayname must be between 3 and 20 characters long' });
    }

    // Check if the avatar is valid (either external link or base64)
    if (avatar && !avatar.match(/^https?:\/\/.+\..+/) && !avatar.match(/^data:image\/(png|jpg|jpeg);base64,.+/)) {
      return res.status(400).json({ error: 'Avatar must be a valid URL or a base64 string' });
    }

    // Check if the color is valid (hex)
    if (color && !color.primary.match(/^#[0-9A-F]{6}$/i) && !color.secondary.match(/^#[0-9A-F]{6}$/i)) {
      return res.status(400).json({ error: 'Color must be a valid hex color' });
    }
    // Update the displayName
    const user = await User.findByIdAndUpdate(userId, { displayname: displayname, avatar: avatar, color: color }, { new: true });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send the updated user
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while trying to update the display name' });
  }
});

http.listen(port, () => console.log('Server started on port ' + port + '. Click here : http://127.0.0.1:3000/'));