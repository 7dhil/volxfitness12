const passwordField = document.getElementById("passwordField");
const togglePass = document.getElementById("togglePass");

if (togglePass && passwordField) {
  togglePass.addEventListener("click", () => {
    if (passwordField.type === "password") {
      passwordField.type = "text";
      togglePass.textContent = "Hide";
    } else {
      passwordField.type = "password";
      togglePass.textContent = "Show";
    }
  });
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.querySelector('.login-btn');
  const profileContainer = document.querySelector('.profile-container');
  
  // Don't check login status on login/signup pages to prevent button flickering
  const currentPage = window.location.pathname;
  const isAuthPage = currentPage.includes('login') || currentPage.includes('signup') || currentPage === '/';
  
  if (!isAuthPage) {
    // Check if user is logged in by checking for stored user data
    checkLoginStatus();
  }
  
  if (loginBtn) {
    // Check if this is the login page by looking at the button text
    const buttonText = loginBtn.textContent.trim().toLowerCase();
    
    // Check if this is a login button (for login page)
    if (loginBtn.classList.contains('login-btn') && buttonText.includes('login')) {
      loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.querySelector('input[type="email"]').value;
        const password = document.getElementById('passwordField').value;
        
        try {
          const response = await fetch('/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Store user data to indicate logged in state
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', email);
            
            alert('Login successful!');
            // Redirect to home page instead of admin panel
            window.location.href = '/';
          } else {
            alert(data.error || 'Login failed');
          }
        } catch (error) {
          console.error('Error:', error);
          alert('An error occurred during login');
        }
      });
    } 
    // Check if this is the signup page
    else if (buttonText === 'sign up') {
      loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.querySelector('input[type="email"]').value;
        const password = document.getElementById('passwordField').value;
        
        try {
          const response = await fetch('/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: email.split('@')[0], email, password })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            alert('Account created successfully!');
            // Redirect to login page (corrected path)
            window.location.href = '/login.html';
          } else {
            alert(data.error || 'Signup failed');
          }
        } catch (error) {
          console.error('Error:', error);
          alert('An error occurred during signup');
        }
      });
    }
  }
});

// Keyboard shortcut for admin panel (Ctrl+Shift+X)
// Add this to the document root to ensure it works on all pages
document.addEventListener('keydown', (e) => {
  // Check if Ctrl+Shift+X is pressed
  if (e.ctrlKey && e.shiftKey && e.key === 'X') {
    e.preventDefault();
    e.stopPropagation();
    // Redirect to admin panel
    window.location.href = '/admin/index.html';
  }
}, true); // Use capture phase to ensure it's handled first

// Function to check login status and update UI
async function checkLoginStatus() {
  const loginBtn = document.querySelector('.login-btn');
  const profileContainer = document.querySelector('.profile-container');
  
  // Check if user is logged in by making a request to the server
  try {
    const response = await fetch('/users/profile', {
      method: 'GET',
      credentials: 'include' // Include cookies/sessions in the request
    });
    
    if (response.ok) {
      const userData = await response.json();
      // User is logged in, show profile icon
      if (loginBtn) loginBtn.style.display = 'none';
      if (profileContainer) {
        profileContainer.style.display = 'flex';
        profileContainer.style.alignItems = 'center';
        profileContainer.style.position = 'relative';
        profileContainer.style.zIndex = '1001';
      }
    } else {
      // User is not logged in, show login button
      if (loginBtn) loginBtn.style.display = 'block';
      if (profileContainer) profileContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking login status:', error);
    // On error, assume user is not logged in
    if (loginBtn) loginBtn.style.display = 'block';
    if (profileContainer) profileContainer.style.display = 'none';
  }
}

// Function to handle logout
async function logout() {
  try {
    // Clear session storage first
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('adminCredentials');
    }
    
    // Update UI immediately to show login button and hide profile
    updateAuthUIAfterLogout();
    
    // Make the logout request to the server
    const response = await fetch('/logout', {
      method: 'GET',
      credentials: 'include'
    });
    
    // Small delay to ensure UI updates are visible
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Redirect to home page with logout indicator
    window.location.href = '/?loggedout=true';
    
    // Return a resolved promise for consistency
    return Promise.resolve();
  } catch (error) {
    console.error('Error logging out:', error);
    // Clear session storage even if server request fails
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('adminCredentials');
    }
    
    // Update UI
    updateAuthUIAfterLogout();
    
    // Small delay to ensure UI updates are visible
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Redirect to home page anyway with logout indicator
    window.location.href = '/?loggedout=true';
    
    // Return a resolved promise for consistency
    return Promise.resolve();
  }
}

// Helper function to update UI after logout
function updateAuthUIAfterLogout() {
  const loginBtn = document.querySelector('.login-btn');
  const profileContainer = document.querySelector('.profile-container');
  
  // Show login button
  if (loginBtn) {
    loginBtn.style.display = 'block';
    // Force reflow to ensure the change takes effect
    loginBtn.offsetHeight;
  }
  
  // Hide profile container
  if (profileContainer) {
    profileContainer.style.display = 'none';
    // Force reflow to ensure the change takes effect
    profileContainer.offsetHeight;
  }
  
  // Also trigger storage event to notify other tabs/pages
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'isLoggedIn',
      oldValue: 'true',
      newValue: null
    }));
  }
}

// Add CSS for profile icon and menu with higher z-index
const style = document.createElement('style');
style.textContent = `
  .profile-container {
    display: flex;
    align-items: center;
    position: relative;
    z-index: 1001;
  }
  
  .profile-icon {
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background-color 0.3s;
    z-index: 1002;
  }
  
  .profile-icon:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .profile-menu {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    background: #1e1e25;
    min-width: 120px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1003;
    overflow: hidden;
  }
  
  .profile-container:hover .profile-menu {
    display: block;
  }
  
  .profile-menu a {
    display: block;
    padding: 12px 16px;
    text-decoration: none;
    color: white;
    font-size: 14px;
  }
  
  .profile-menu a:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;
document.head.appendChild(style);

// Also check login status on every page load to ensure consistency
window.addEventListener('load', () => {
  const currentPage = window.location.pathname;
  const isAuthPage = currentPage.includes('login') || currentPage.includes('signup') || currentPage === '/';
  
  // Check if this page load was from a logout redirect
  const urlParams = new URLSearchParams(window.location.search);
  const wasLogout = urlParams.get('loggedout') === 'true';
  
  // Don't check login status immediately after logout
  if (!isAuthPage && !wasLogout) {
    // Small delay to ensure any logout processes complete
    setTimeout(() => {
      checkLoginStatus();
    }, 200);
  }
  
  // Remove logout parameter from URL for clean appearance
  if (wasLogout) {
    const url = new URL(window.location);
    url.searchParams.delete('loggedout');
    window.history.replaceState({}, document.title, url);
  }
});

// Make logout function available globally immediately after definition
window.logout = logout;

// Also make it available on the window object for compatibility
window.globalLogout = logout;