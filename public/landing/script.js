

// Close mobile menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-links a');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    const navLinksContainer = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');
    
    navLinksContainer.classList.remove('active');
    hamburger.classList.remove('active');
  });
});

// Add authentication check for dashboard link
const dashboardLink = document.querySelector('a[href="/landing/pages/dashboard.html"]');
if (dashboardLink) {
  dashboardLink.addEventListener('click', function(e) {
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
      e.preventDefault();
      window.location.href = '/login.html';
    }
  });
}

// Update login button/profile icon based on authentication state
function updateAuthUI() {
  const loginBtn = document.querySelector('.login-btn');
  const profileContainer = document.querySelector('.profile-container');
  
  if (sessionStorage.getItem('isLoggedIn') === 'true') {
    // User is logged in - show profile icon, hide login button
    if (loginBtn) loginBtn.style.display = 'none';
    if (profileContainer) profileContainer.style.display = 'flex';
  } else {
    // User is not logged in - show login button, hide profile icon
    if (loginBtn) loginBtn.style.display = 'block';
    if (profileContainer) profileContainer.style.display = 'none';
  }
}

// Check authentication state on page load
window.addEventListener('load', () => {
  // Check if this page load was from a logout redirect
  const urlParams = new URLSearchParams(window.location.search);
  const wasLogout = urlParams.get('loggedout') === 'true';
  
  if (!wasLogout) {
    updateAuthUI();
  } else {
    // If it was a logout, ensure UI reflects logged out state
    const loginBtn = document.querySelector('.login-btn');
    const profileContainer = document.querySelector('.profile-container');
    
    if (loginBtn) loginBtn.style.display = 'block';
    if (profileContainer) profileContainer.style.display = 'none';
    
    // Remove logout parameter from URL for clean appearance
    const url = new URL(window.location);
    url.searchParams.delete('loggedout');
    window.history.replaceState({}, document.title, url);
  }
});

// Update UI when login state changes (e.g., after login/logout)
window.addEventListener('storage', updateAuthUI);

// Add logout functionality - use the global logout function from main script
async function logout() {
  // Try multiple ways to access the global logout function
  const globalLogoutFunc = window.logout || window.globalLogout;
  
  if (typeof globalLogoutFunc === 'function') {
    try {
      return await globalLogoutFunc();
    } catch (error) {
      console.error('Global logout failed:', error);
      // Fall through to local implementation
    }
  }
  
  // Fallback to local implementation
  console.warn('Using fallback logout implementation');
  
  // Clear session storage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('adminCredentials');
  }
  
  // Update UI immediately
  updateAuthUIAfterLogout();
  
  // Small delay to ensure UI updates are visible
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Redirect to landing page with logout indicator
  window.location.href = '/landing/index.html?loggedout=true';
  
  return Promise.resolve();
}

// Helper function to update UI after logout (local implementation)
function updateAuthUIAfterLogout() {
  const loginBtn = document.querySelector('.login-btn');
  const profileContainer = document.querySelector('.profile-container');
  
  // Show login button
  if (loginBtn) {
    loginBtn.style.display = 'block';
    loginBtn.offsetHeight; // Force reflow
  }
  
  // Hide profile container
  if (profileContainer) {
    profileContainer.style.display = 'none';
    profileContainer.offsetHeight; // Force reflow
  }
  
  // Trigger storage event
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'isLoggedIn',
      oldValue: 'true',
      newValue: null
    }));
  }
}

// Add event listeners to the profile icon to show/hide menu on hover and click
const profileIcon = document.querySelector('.profile-icon');
if (profileIcon) {
  // Show menu on hover
  profileIcon.addEventListener('mouseenter', function() {
    const menu = this.nextElementSibling;
    if (menu && menu.classList.contains('profile-menu')) {
      menu.style.display = 'block';
    }
  });
  
  // Hide menu when mouse leaves (with a slight delay to allow interaction with menu)
  profileIcon.addEventListener('mouseleave', function() {
    const self = this;
    setTimeout(function() {
      const menu = self.nextElementSibling;
      if (menu && menu.classList.contains('profile-menu')) {
        // Only hide if mouse is not over the menu
        if (!menu.matches(':hover')) {
          menu.style.display = 'none';
        }
      }
    }, 100);
  });
  
  // Also show menu on click for mobile/touch devices
  profileIcon.addEventListener('click', function() {
    const menu = this.nextElementSibling;
    if (menu && menu.classList.contains('profile-menu')) {
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
  });
}

// Also handle mouseleave on the menu to close it
const profileMenu = document.querySelector('.profile-menu');
if (profileMenu) {
  profileMenu.addEventListener('mouseleave', function() {
    const self = this;
    setTimeout(function() {
      if (!self.matches(':hover') && !document.querySelector('.profile-icon').matches(':hover')) {
        self.style.display = 'none';
      }
    }, 100);
  });
}

// Admin panel shortcut: Ctrl+Shift+X
document.addEventListener('keydown', function(event) {
  if (event.ctrlKey && event.shiftKey && event.key === 'X') {
    event.preventDefault();
    // Open admin panel in a new tab/window
    window.open('/admin/index.html', '_blank');
  }
});

// Close profile menu when clicking outside
document.addEventListener('click', function(event) {
  const profileMenu = document.querySelector('.profile-menu');
  const profileIcon = document.querySelector('.profile-icon');
  
  if (profileMenu && profileIcon && 
      !profileIcon.contains(event.target) && 
      !profileMenu.contains(event.target)) {
    profileMenu.style.display = 'none';
  }
});