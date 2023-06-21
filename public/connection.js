let switchElement = document.getElementById('switch-log-register');
switchElement.addEventListener('click', () => {
    let title = document.getElementById('title');
    if (title.innerText == 'Login') {
        document.getElementById('submit-button').innerText = 'Create account';
        title.innerText = 'Register';
        switchElement.innerText = 'I already have an account';
    } else {
        document.getElementById('submit-button').innerText = 'Login';
        title.innerText = 'Login';
        switchElement.innerText = 'Create account';
    }
});

function displayBannerMessage(message, success = false) {
    const bannerMessageElement = document.getElementById('error-message');
    bannerMessageElement.innerText = message;
    if (success) { 
        bannerMessageElement.classList.add('bg-green');
    } else {
        bannerMessageElement.classList.remove('bg-green');
    }
    bannerMessageElement.classList.remove('hidden');

    // Hide the error message after 5 seconds
    setTimeout(() => {
        bannerMessageElement.classList.add('hidden');
    }, 5000);
}

document.getElementById('submit-button').addEventListener('click', () => {
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value;
    const endpoint = document.getElementById('title').innerText === 'Login' ? '/login' : '/register';
    fetch("http://localhost:3000" + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
    // if response is successful, redirect user to discussion.html
    .then(response => response.json()) // parse the JSON response
    .then(data => {
    console.log(data.message); // log the message property
        if (data.success) {
            console.log('Success. Endpoint: ' + endpoint);
            if (endpoint === '/register') {
                displayBannerMessage('Account created successfully ! You can now log in.', true);
            } else {
                localStorage.setItem('token', data.token);
                window.location.href = 'discussion.html';
            }
        } else {
            displayBannerMessage(data.message);
        }
    })
    .catch(error => {
    console.error('Error:', error);
    });
});