const serverUrl = 'http://localhost:3000';

// Check if the user is authenticated before continuing
fetch(`${serverUrl}/check-authentication`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
  }
})
  .then(response => {
    if (response.status === 401 || response.status === 403) {
      window.location.href = 'index.html';
      // Redirect to the login page if the user is not authenticated
    } else {
      // Display the page if the user is authenticated
      document.body.classList.remove('hidden');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });

const socket = io(serverUrl, {
  withCredentials: true
});
socket.on('new message', function (newMessage) {
  if (newMessage.channelId === currentChannelId) {
    displayMessage(newMessage);
  }
});

// GLOBAL VARIABLES
let currentUser = null;
let currentChannelId = null;
let oldAvatar = null;
let displayedMessages = new Set(); // Set to store IDs of displayed messages


// Get the JWT from localStorage
const token = localStorage.getItem('token');
if (token) {
  // Decode the JWT to get all the info about the user
  const decodedToken = jwtDecode(token);
  currentUser = {
    id: decodedToken.payload.id,
    username: decodedToken.payload.username,
    displayname: decodedToken.payload.displayname,
    avatar: decodedToken.payload.avatar,
    color: decodedToken.payload.color,
  }
  console.log('Payload: ' + JSON.stringify(decodedToken.payload));
}

function jwtDecode(t) {
  let token = {};
  token.raw = t;
  token.header = JSON.parse(window.atob(t.split('.')[0]));
  token.payload = JSON.parse(window.atob(t.split('.')[1]));
  return (token)
}

changeThemeColors();

updateMessageContainerColor = () => {
  const messageInputContainer = document.querySelector('.message-input-container');
  const messageInput = document.querySelector('.message-input');
  if (messageInput.hasAttribute('disabled')) {
    messageInputContainer.classList.add('bg-gray');
  } else {
    messageInputContainer.classList.remove('bg-gray');
  }
}
updateMessageContainerColor();

// Get the list of channels from the server
fetch(`${serverUrl}/channels`)
  .then(response => response.json())
  .then(channels => {
    const chatList = document.querySelector('.chat-list');
    chatList.innerHTML = ''; // Delete existing channels

    // Build elements for each channel and add them to the DOM
    channels.forEach(channel => {
      // Check if the current user is a participant in the channel
      if (channel.participants.map(id => id.toString()).includes(currentUser.id)) {
        const chatElement = document.createElement('div');
        chatElement.className = 'chat';
        chatElement.addEventListener('click', () => {
          currentChannelId = channel._id;
          document.querySelector('.message-input').removeAttribute('disabled');
          document.querySelector('.send-button').classList.remove('hidden');
          updateMessageContainerColor();
          displayMessagesForChannel(currentChannelId);
          highlightSelectedChannel(chatElement);
        });

        const imgElement = document.createElement('img');
        imgElement.src = channel.icon;
        imgElement.alt = `Channel icon ${channel.name}`;

        const pElement = document.createElement('p');
        pElement.textContent = channel.name;

        chatElement.append(imgElement);
        chatElement.append(pElement);
        chatList.append(chatElement);
      }
    });
  })
  .catch(error => console.error('Error:', error));

function highlightSelectedChannel(selectedElement) {
  // Remove the 'selected' class from all chat elements
  const chatElements = document.querySelectorAll('.chat');
  chatElements.forEach(chatElement => {
    chatElement.classList.remove('selected');
  });

  // Add the 'selected' class to the selected chat element
  selectedElement.classList.add('selected');
}


const messageList = document.querySelector('#message-list');
function displayMessagesForChannel(channelId) {
  // Get the messages for the specified channel
  fetch(`${serverUrl}/channels/${channelId}/messages`)
    .then(response => response.json())
    .then(messages => {
      messageList.innerHTML = ''; // Delete existing messages

      // Build elements for each message and add them to the DOM
      messages.forEach(message => {
        displayMessage(message);
      });
    })
    .catch(error => console.error('Error:', error));
}

// ===== FUNCTIONS FOR SENDING AND DISPLAYING MESSAGES ===== //
function displayMessage(message) {
  // Check if the message has already been displayed
  if (displayedMessages.has(message._id)) {
    return;
  }

  // Add the message ID to the set of displayed messages
  displayedMessages.add(message.messageId);

  const messageElement = document.createElement('div');
  const send = message.sender.id === currentUser.id;
  messageElement.className = 'message ' + (send ? 'sent' : 'received');

  const textElement = document.createElement('div');
  textElement.className = 'text';
  textElement.textContent = message.text;

  if (!send) {
    const senderNameElement = document.createElement('div');
    senderNameElement.className = 'sender-name';
    senderNameElement.textContent = message.sender.username;
    messageElement.append(senderNameElement);
  }

  messageElement.append(textElement);
  messageList.append(messageElement);
}

document.querySelector('.send-button').addEventListener('click', () => {
  sendMessage();
});

document.querySelector('.message-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Prevent newline being added in the textarea
    sendMessage();
  }
});

sendMessage = () => {
  const messageInput = document.querySelector('.message-input');
  const messageText = messageInput.value;

  if (messageText.trim() === '') {
    return;
  }

  const message = {
    channelId: currentChannelId,
    sender: { id: currentUser.id, username: currentUser.displayname },
    text: messageText,
    timestamp: new Date().toISOString(),
  };

  // Emit the new message to the server via websocket
  socket.emit('new message', message);

  // Also send the message to the server via a POST request to save it in the database
  fetch(`${serverUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(newMessage => {
      // The server should return the newly created message
      messageInput.value = ''; // Clear the input field
    })
    .catch(error => console.error('Error:', error));
}

// ===== FUNCTIONS FOR LOADING AND SAVING SETTINGS ===== //
const settingsButton = document.querySelector('.settings-button');
const settingsModal = document.querySelector('#settings-modal');
const settingsModalBackground = document.querySelector('.settings-modal-background');

settingsButton.addEventListener('click', () => {
  if (settingsModal.classList.contains('hidden')) {
    loadSettings();
    settingsModal.style.display = 'block';
    settingsModalBackground.style.display = 'block';
    settingsModal.classList.remove('hidden');
  } else {
    settingsModal.classList.add('hidden');
    settingsModal.style.display = 'none';
    settingsModalBackground.style.display = 'none';
  }
});

loadSettings = () => {
  if (!currentUser) {
    return;
  }
  const usernameTextArea = document.querySelector('#display-name');
  usernameTextArea.value = currentUser.displayname;
  const avatarImg = document.querySelector('#profile-picture');
  avatarImg.src = currentUser.avatar;
  const colorPicker = document.querySelector('.color-square-container');
  colorPicker.children[0].style.backgroundColor = currentUser.color.primary;
  colorPicker.children[1].style.backgroundColor = currentUser.color.secondary;
}


/*
--------------------
|  Save settings   |
--------------------
*/
const saveSettingsButton = document.querySelector('#save-button');
saveSettingsButton.addEventListener('click', () => {

  // Get the displayname from the textarea
  const usernameTextArea = document.querySelector('#display-name');
  const newDisplayname = usernameTextArea.value;

  // Check if the user has changed the displayname or avatar TODO
  if (currentUser.avatar === oldAvatar && newDisplayname === currentUser.displayname) {
    return;
  }

  // Update the user on the database
  fetch(`${serverUrl}/users/${currentUser.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ displayname: newDisplayname, avatar: currentUser.avatar, color: currentUser.color })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }
    )
    .then(updatedUser => {
      // The server should return the updated user
      currentUser = { id: updatedUser._id, username: updatedUser.username, displayname: updatedUser.displayname, avatar: updatedUser.avatar, color: updatedUser.color };
      // Hide the settings modal
      settingsModal.classList.add('hidden');
      settingsModal.style.display = 'none';
      settingsModalBackground.style.display = 'none';
    }
    )
    .catch(error => console.error('Error:', error));
});

const logoutButton = document.querySelector('#logout-button');
logoutButton.addEventListener('click', () => {
  // Clear local storage
  localStorage.removeItem('token');
  // Redirect to login page
  window.location.href = 'index.html';
});

const avatarPicker = document.querySelector('#profile-picture-picker');
avatarPicker.addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    // Check if the file size is less than 5KB
    if (file.size > 5 * 1024) {
      alert('Please select an image file that is less than 5KB');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const dataUrl = reader.result;
      // Update the currentUser "avatar" property with the data URL
      oldAvatar = currentUser.avatar;
      currentUser.avatar = dataUrl;
      // Update the avatar image element with the new data URL
      const avatarImg = document.querySelector('#profile-picture');
      avatarImg.src = dataUrl;
    });
    reader.readAsDataURL(file);
  });
  fileInput.click();
});

let square1 = document.getElementById('square-1');
let square2 = document.getElementById('square-2');

square1.addEventListener('click', () => {
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.addEventListener('input', () => {
    currentUser.color.primary = colorPicker.value;
    square1.style.backgroundColor = currentUser.color.primary;
    changeThemeColors()
  });
  colorPicker.click();
});

square2.addEventListener('click', () => {
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.addEventListener('input', () => {
    currentUser.color.secondary = colorPicker.value;
    square2.style.backgroundColor = currentUser.color.secondary;
    changeThemeColors()
  });
  colorPicker.click();
});

function changeThemeColors() {
  // if the user has colors values in localStorage, modify css of the page
  if (currentUser.color) {
    const primaryColor = currentUser.color.primary;
    const secondaryColor = currentUser.color.secondary;
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
  }
}