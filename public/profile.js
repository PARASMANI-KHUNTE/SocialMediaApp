document.addEventListener('DOMContentLoaded', () => {
    // Elements for profile editing
    const editProfileBtn = document.querySelector('#edit-profile-btn');
    const saveProfileBtn = document.querySelector('#save-profile-btn');
    const avatarInput = document.querySelector('#avatar-input');
    const bannerInput = document.querySelector('#banner-input');
    const avatarPreview = document.querySelector('#avatar-preview');
    const bannerPreview = document.querySelector('#banner-preview');
    const editProfileForm = document.querySelector('#edit-profile-form');

    // Show the edit profile form
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            editProfileForm.classList.toggle('hidden');
        });
    } else {
        console.error('Edit Profile button not found!');
    }

    // Preview avatar image
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                avatarPreview.src = URL.createObjectURL(file);
            }
        });
    }

    // Preview banner image
    if (bannerInput) {
        bannerInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                bannerPreview.src = URL.createObjectURL(file);
            }
        });
    }

    // Save profile changes
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const formData = new FormData();
            if (avatarInput.files[0]) {
                formData.append('avatar', avatarInput.files[0]);
            }
            if (bannerInput.files[0]) {
                formData.append('banner', bannerInput.files[0]);
            }
            const spinner = document.getElementById('loadingSpinner');
    
            // Show the spinner
            spinner.classList.remove('hidden');
            try {
                const response = await fetch('/profile', {
                    method: 'PUT',
                    body: formData,
                    credentials: 'include'
                });
                const data = await response.json();
                console.log('Profile updated:', data);
                // Update the profile view with the new data
                document.querySelector('#avatar').src = data.avatarUrl;
                document.querySelector('#banner').src = data.bannerUrl;
                editProfileForm.classList.add('hidden');
            } catch (error) {
                console.error('Error updating profile:', error);
            }finally {
                spinner.classList.add('hidden'); // Hide the spinner after upload attempt
              }
        });
    }

    // Fetch and display profile data
    async function loadProfileData() {
        try {
            const response = await fetch('/profile', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }
            const userData = await response.json();

            document.querySelector('#username').innerText = `@${userData.username}`;
            document.querySelector('#name').innerText = `Name: ${userData.name}`;
            document.querySelector('#email').innerText = `Email: ${userData.email}`;
            document.querySelector('#followers').innerText = `Followers: ${userData.followers}`;
            document.querySelector('#following').innerText = `Following: ${userData.following}`;
            document.querySelector('#avatar').src = userData.avatarUrl || 'path/to/default/avatar.jpg';
            document.querySelector('#banner').src = userData.bannerUrl || 'path/to/default/banner.jpg';

            // Fetch and display user posts
            const postsResponse = await fetch('/posts', { credentials: 'include' });
            if (!postsResponse.ok) {
                throw new Error('Failed to fetch posts');
            }
            const postsData = await postsResponse.json();
            const postsContainer = document.querySelector('#posts');

            postsContainer.innerHTML = ''; // Clear existing posts
            postsData.forEach(post => {
                const postElement = document.createElement('div');
                postElement.classList.add('bg-white', 'shadow-md', 'rounded-lg', 'overflow-hidden', 'mb-6');

                let mediaContent = '';
                if (post.Media === 'img') {
                    mediaContent = `<img src="${post.PostUrl}" class="w-full h-auto rounded-md mt-2" alt="Post Image">`;
                } else if (post.Media === 'video') {
                    mediaContent = `<video controls class="w-full h-auto rounded-md mt-2"><source src="${post.PostUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
                }

                postElement.innerHTML = `
                    <div class="p-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-lg font-semibold">${post.Title}</h3>
                                <p class="text-gray-600">${post.Decs}</p>
                                ${mediaContent}
                                <div class="flex items-center mt-2">
                                    <span class="text-gray-600 mr-4">Likes: ${post.likes}</span>
                                    <span class="text-gray-600">Dislikes: ${post.dislikes}</span>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <button class="edit-post-btn text-blue-500 mr-2" data-id="${post._id}" data-media-url="${post.PostUrl}">Edit</button>
                                <button class="delete-post-btn text-red-500" data-id="${post._id}" data-media-url="${post.PostUrl}">Delete</button>
                            </div>
                        </div>
                        <div class="edit-post-form hidden mt-4 p-4 border-t border-gray-200">
                            <input type="text" class="edit-post-title bg-gray-100 p-2 rounded-md w-full mb-2" placeholder="New title" value="${post.Title}">
                            <textarea class="edit-post-desc bg-gray-100 p-2 rounded-md w-full mb-2" placeholder="New description">${post.Decs}</textarea>
                            <button class="save-post-btn bg-green-500 text-white px-4 py-2 rounded-md">Save</button>
                        </div>
                    </div>
                `;

                postsContainer.appendChild(postElement);
            });

            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-post-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const postId = e.target.dataset.id;
                    const postElement = e.target.closest('.bg-white');
                    const editForm = postElement.querySelector('.edit-post-form');
                    editForm.classList.toggle('hidden');
                });
            });

            document.querySelectorAll('.save-post-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const postElement = e.target.closest('.bg-white');
                    const postId = postElement.querySelector('.edit-post-btn').dataset.id;
                    const newTitle = postElement.querySelector('.edit-post-title').value;
                    const newDesc = postElement.querySelector('.edit-post-desc').value;

                    try {
                        const response = await fetch(`/posts/${postId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ Title: newTitle, Decs: newDesc }),
                            credentials: 'include'
                        });
                        const data = await response.json();
                        console.log('Post updated:', data);
                        postElement.querySelector('h3').innerText = data.Title;
                        postElement.querySelector('p').innerText = data.Decs;
                        postElement.querySelector('.edit-post-form').classList.add('hidden');
                    } catch (error) {
                        console.error('Error updating post:', error);
                    }
                });
            });

            document.querySelectorAll('.delete-post-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const postId = e.target.dataset.id;
                    const mediaUrl = e.target.dataset.mediaUrl;

                    try {
                        const response = await fetch(`/posts/${postId}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mediaUrl: mediaUrl }),
                            credentials: 'include'
                        });
                        if (response.ok) {
                            e.target.closest('.bg-white').remove();
                            console.log('Post deleted');
                            alert("Post has been deleted")
                        }
                    } catch (error) {
                        console.error('Error deleting post:', error);
                        alert('Error deleting post:', error)
                    }
                });
            });

        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }

    loadProfileData();
});
