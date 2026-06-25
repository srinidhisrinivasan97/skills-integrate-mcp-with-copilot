document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminLoginToggle = document.getElementById("admin-login-toggle");
  const adminLoginPanel = document.getElementById("admin-login-panel");
  const adminLoginForm = document.getElementById("admin-login-form");
  const authMessage = document.getElementById("auth-message");
  const adminStatus = document.getElementById("admin-status");
  const signupNotice = document.getElementById("signup-notice");
  const adminUsernameInput = document.getElementById("admin-username");
  const adminPasswordInput = document.getElementById("admin-password");

  let teacherToken = localStorage.getItem("teacherToken") || "";
  let teacherName = localStorage.getItem("teacherName") || "";

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    clearTimeout(showMessage.timeoutId);
    showMessage.timeoutId = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function setAuthFeedback(text, type = "info") {
    authMessage.textContent = text;
    authMessage.className = `message ${type}`;
    authMessage.classList.remove("hidden");
  }

  function updateAdminUI() {
    const loggedIn = Boolean(teacherToken);
    signupForm.classList.toggle("hidden", !loggedIn);
    signupNotice.classList.toggle("hidden", loggedIn);
    adminLoginToggle.textContent = loggedIn ? `Logout (${teacherName})` : "Admin Login";
    adminStatus.classList.toggle("hidden", !loggedIn);

    if (loggedIn) {
      adminStatus.innerHTML = `<strong>Signed in as ${teacherName}</strong>`;
    } else {
      adminStatus.innerHTML = "";
    }
  }

  function getAuthHeaders() {
    return {
      Authorization: teacherToken ? `Bearer ${teacherToken}` : "",
    };
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    if (!teacherToken) {
      showMessage("Please sign in as a teacher to manage registrations.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacherToken) {
      showMessage("Please sign in as a teacher to manage registrations.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  adminLoginToggle.addEventListener("click", () => {
    if (teacherToken) {
      localStorage.removeItem("teacherToken");
      localStorage.removeItem("teacherName");
      teacherToken = "";
      teacherName = "";
      updateAdminUI();
      setAuthFeedback("Signed out.", "info");
      return;
    }

    adminLoginPanel.classList.toggle("hidden");
  });

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: adminUsernameInput.value,
          password: adminPasswordInput.value,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        teacherToken = result.token;
        teacherName = result.username;
        localStorage.setItem("teacherToken", teacherToken);
        localStorage.setItem("teacherName", teacherName);
        adminLoginForm.reset();
        adminLoginPanel.classList.add("hidden");
        updateAdminUI();
        setAuthFeedback(`Signed in as ${teacherName}.`, "success");
      } else {
        setAuthFeedback(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      setAuthFeedback("Unable to sign in right now.", "error");
      console.error("Login error:", error);
    }
  });

  updateAdminUI();
  fetchActivities();
});
