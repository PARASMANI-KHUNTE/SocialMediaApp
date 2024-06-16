console.log("JS is absolutly fine !");

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("logoutButton")
    .addEventListener("click", function () {
      axios
        .post("/logout")
        .then((response) => {
          console.log("Logout Success:", response.data);
          window.location.href = "/";
        })
        .catch((error) => {
          console.error("Logout Error:", error);
        });
    });
  // Your JavaScript code here
  const postmodel = document.getElementById("postModel");
  isdiplayed = false;
  document.getElementById("togglePostModel").addEventListener("click", () => {
    console.log("Clicked!");

    if (!isdiplayed) {
      postmodel.style.display = "block";
      isdiplayed = true;
    } else {
      postmodel.style.display = "none";
      isdiplayed = false;
    }
  });

  const mediaTypeRadios = document.querySelectorAll('input[name="mediaType"]');
  const mediaFileSection = document.getElementById("mediaFileSection");
  const mediaFileInput = document.getElementById("mediaFile");
  const imgPreview = document.getElementById("imgPreview");
  const videoPreview = document.getElementById("videoPreview");

  mediaTypeRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      if (event.target.value === "img" || event.target.value === "video") {
        mediaFileSection.classList.remove("hidden");
      } else {
        mediaFileSection.classList.add("hidden");
        imgPreview.style.display = "none";
        videoPreview.style.display = "none";
      }
    });
  });

  mediaFileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    const mediaType = document.querySelector(
      'input[name="mediaType"]:checked'
    ).value;

    if (file) {
      const fileURL = URL.createObjectURL(file);

      if (mediaType === "img") {
        imgPreview.src = fileURL;
        imgPreview.style.display = "block";
        videoPreview.style.display = "none";
      } else if (mediaType === "video") {
        videoPreview.src = fileURL;
        videoPreview.style.display = "block";
        imgPreview.style.display = "none";
      }
    }
  });

  document
    .getElementById("postForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const postTitle = document.getElementById("postTitle").value;
      console.log(postTitle);

      const postDesc = document.getElementById("postDesc").value;
      console.log(postDesc);

      const mediaType = document.querySelector(
        'input[name="mediaType"]:checked'
      ).value;

      const mediaFile = document.getElementById("mediaFile").files[0]; // Assuming media is uploaded through a file input
      if (!postTitle || !postDesc || !mediaType) {
        alert(
          "Please fill in all required fields (Title, Description, and Media Type)."
        );
        return;
      }

      const formData = new FormData();

      formData.append("postTitle", postTitle);
      formData.append("postDesc", postDesc);
      formData.append("mediaType", mediaType);
      console.log(formData);
      // Check if media file is selected based on media type
      if (mediaType === "img" || mediaType === "video") {
        if (!mediaFile) {
          alert("Please select a media file to upload.");
          return;
        }
        formData.append("file", mediaFile); // Assuming the file input field id is 'mediaFile'
      }

      const spinner = document.getElementById("loadingSpinner");

      // Show the spinner
      spinner.classList.remove("hidden");
      try {
        const response = await fetch("/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          alert("Post created successfully!");
          const postmodel = document.getElementById("postModel");
          postmodel.style.display = "none";
          // Clear the form after successful upload (optional)
          document.getElementById("postForm").reset();
        } else {
          alert("Error creating post.");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Error creating post.");
      } finally {
        spinner.classList.add("hidden"); // Hide the spinner after upload attempt
      }
    });



  const feedSection = document.getElementById("feedSection");
  const loadingSpinner = document.getElementById("loadingSpinner");

  let page = 1;
  let loading = false;

  loadPosts();
  window.addEventListener("scroll", handleScroll);

  function handleScroll() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 5 && !loading) {
      loadPosts();
    }
  }

  function loadPosts() {
    loading = true;
    loadingSpinner.classList.remove("hidden");
    axios
      .get(`/all-posts?page=${page}`)
      .then((response) => {
        const posts = response.data;
        posts.forEach((post) => {
          const postCard = createPostCard(post);
          feedSection.appendChild(postCard);
        });
        page++;
        loading = false;
        loadingSpinner.classList.add("hidden");
      })
      .catch((error) => {
        console.error("Error loading posts:", error);
        loading = false;
        loadingSpinner.classList.add("hidden");
      });
  }

  function createPostCard(post) {
    const postCard = document.createElement("div");
    

   
    postCard.classList.add(
      "bg-white",
      "rounded-lg",
      "shadow-md",
      "p-6",
      "mb-6",
      "w-full",
      "max-w-2xl",
      "mx-auto"
    );

    const userInfo = document.createElement("div");
    userInfo.classList.add("flex", "items-center", "mb-4");
    userInfo.innerHTML = `
        <div>
          <p class="font-bold">${post.PostBy}</p>
          <p class="text-sm text-gray-500">${post.PostDate}</p>
        </div>
      `;
    postCard.appendChild(userInfo);

    const postContent = document.createElement("div");
    postContent.classList.add("mb-4");
    postContent.innerHTML = `
        <h2 class="text-xl font-bold mb-2">${post.Title}</h2>
        <p>${post.Decs}</p>
  
        <button id="likebtn" class="bg-blue-400 p-1 rounded text-white m-1 hover:bg-blue-600">like ${post.likes}<button/>
        <button id="dislikebtn" class="bg-blue-400 p-1 rounded text-white m-1 hover:bg-blue-600">Dislike ${post.dislikes}<button/>
      `;


    
    postCard.appendChild(postContent);

    if (post.Media === "img") {
      const postImage = document.createElement("img");
      postImage.src = post.PostUrl;
      postImage.alt = "Post Image";
      postImage.classList.add("w-full", "mb-4", "rounded");
      postCard.appendChild(postImage);
    } else if (post.Media === "video") {
      const postVideo = document.createElement("video");
      postVideo.src = post.PostUrl;
      postVideo.controls = true;
      postVideo.classList.add("w-full", "mb-4", "rounded");
      postCard.appendChild(postVideo);
    }

    return postCard;
  }



});
