function loadHTML(elementId, filePath) {
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
            initializeMenu(); // Call your function to initialize the menu
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

function initializeMenu() {
    const menuButton = document.querySelector('.menu-button');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuButton && navLinks) {
        menuButton.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

// Load the header when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadHTML('header-container', 'header.html'); // Replace 'header-container' with your actual element ID
});



document.addEventListener('DOMContentLoaded', function() {
    loadHTML('header', 'header.html');
    loadHTML('footer', 'footer.html');
});

