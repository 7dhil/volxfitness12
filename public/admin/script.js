// Handle authentication for admin pages
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on a page that requires authentication
    const currentPage = window.location.pathname;
    
    // Pages that require authentication
    const protectedPages = [
        '/admin/users.html',
        '/admin/add-user.html',
        '/admin/edit-user.html'
    ];
    
    if (protectedPages.some(page => currentPage.includes(page))) {
        const credentials = sessionStorage.getItem('adminCredentials');
        if (!credentials) {
            window.location.href = '/admin/index.html';
            return;
        }
        
        // Verify credentials are still valid
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            });
            
            if (!response.ok) {
                sessionStorage.removeItem('adminCredentials');
                window.location.href = '/admin/index.html';
                return;
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            sessionStorage.removeItem('adminCredentials');
            window.location.href = '/admin/index.html';
            return;
        }
    }
    
    // Existing functionality for user management
    if (document.getElementById('userTableBody')) {
        const credentials = sessionStorage.getItem('adminCredentials');
        if (credentials) {
            await loadUsers(credentials);
        }
    }

    if (document.getElementById('addUserForm')) {
        document.getElementById('addUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const credentials = sessionStorage.getItem('adminCredentials');

            await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`
                },
                body: JSON.stringify({ name, email, password })
            });

            window.location.href = 'users.html';
        });
    }

    if (document.getElementById('editUserForm')) {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        const credentials = sessionStorage.getItem('adminCredentials');
        
        // Load user data
        const user = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        }).then(res => res.json());

        document.getElementById('userId').value = user._id;
        document.getElementById('name').value = user.name;
        document.getElementById('email').value = user.email;

        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('userId').value;
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const credentials = sessionStorage.getItem('adminCredentials');

            await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`
                },
                body: JSON.stringify({ name, email, password })
            });

            window.location.href = 'users.html';
        });
    }
});

async function loadUsers(credentials) {
    try {
        const users = await fetch('/api/users', {
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        }).then(res => res.json());
        const userTableBody = document.getElementById('userTableBody');
        userTableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <a href="edit-user.html?id=${user._id}">Edit</a>
                    <button onclick="deleteUser('${user._id}', '${credentials}')">Delete</button>
                </td>
            `;
            userTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function deleteUser(id, credentials) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            });
            // Reload users
            await loadUsers(credentials);
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }
}