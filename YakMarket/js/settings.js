/**
 * YakMarket.tj - Settings System
 * Controls user profile settings and security via Strapi
 */

const YakSettings = (function () {
  let currentUser = null;

  /**
   * Initialize settings page
   */
  async function init() {
    try {
      if (!window.YakAuth) throw new Error('YakAuth not loaded');

      // Check auth
      if (!window.YakAuth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
      }

      currentUser = window.YakAuth.getCurrentUser();

      // Load and display initial data
      displayUserData(currentUser);
      fillForm(currentUser);

      // Setup events
      setupEvents();

      if (typeof lucide !== 'undefined') lucide.createIcons();
      console.log('Settings initialized');
    } catch (error) {
      console.error('Settings init error:', error);
    }
  }

  /**
   * Display profile info
   */
  function displayUserData(user) {
    const nameEl = document.getElementById('userName');
    const contactEl = document.getElementById('contact-input');
    const avatarEl = document.getElementById('user-avatar');
    const avatarText = document.getElementById('avatar-text');

    // Header avatar
    const headerAvatar = document.getElementById('header-user-avatar');
    const headerIcon = document.getElementById('header-user-icon');

    const photo = user.avatar?.url || user.photoURL || '';
    const name = user.username || user.displayName || 'Пользователь';

    if (nameEl) nameEl.textContent = name;

    if (avatarEl && photo) {
      avatarEl.src = photo;
      avatarEl.classList.remove('hidden');
      if (avatarText) avatarText.classList.add('hidden');
    }

    if (headerAvatar && photo) {
      headerAvatar.src = photo;
      headerAvatar.classList.remove('hidden');
      if (headerIcon) headerIcon.classList.add('hidden');
    }
  }

  /**
   * Fill form fields
   */
  function fillForm(user) {
    const nameInput = document.getElementById('name-input');
    const contactInput = document.getElementById('contact-input');

    if (nameInput) nameInput.value = user.username || user.displayName || '';
    if (contactInput) contactInput.value = user.phone || user.email || '';
  }

  /**
   * Setup events
   */
  function setupEvents() {
    const saveBtn = document.getElementById('save-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    const changePassBtn = document.getElementById('change-password-btn');

    if (saveBtn) saveBtn.onclick = handleSave;
    if (logoutBtn) logoutBtn.onclick = handleLogout;
    if (avatarUpload) avatarUpload.onchange = handleAvatarUpload;
    if (changePassBtn) changePassBtn.onclick = handlePasswordChange;
  }

  /**
   * Handle Save
   */
  async function handleSave() {
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.innerText;

    try {
      const username = document.getElementById('name-input').value.trim();
      const phone = document.getElementById('contact-input').value.trim();

      if (!username) {
        if (window.YakToast) window.YakToast.error('Имя обязательно');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.innerText = 'Сохранение...';

      const response = await window.YakStrapi.request('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ username, phone })
      });

      // Update local session
      window.YakAuth.saveSession(window.YakAuth.jwt, response);
      currentUser = response;

      displayUserData(currentUser);
      if (window.YakToast) window.YakToast.success('Изменения сохранены');

    } catch (error) {
      console.error('Save profile error:', error);
      if (window.YakToast) window.YakToast.error('Ошибка сохранения');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerText = originalText;
    }
  }

  /**
   * Handle Logout
   */
  async function handleLogout() {
    if (window.YakAuth) {
      await window.YakAuth.logout();
      window.location.href = 'index.html';
    }
  }

  /**
   * Handle Avatar Upload
   */
  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      if (window.YakToast) window.YakToast.info('Загрузка аватара...');

      // 1. Upload file to Strapi
      const formData = new FormData();
      formData.append('files', file);

      const uploadRes = await window.YakStrapi.request('/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // Do not set Content-Type, browser will set it with boundary
        }
      });

      if (uploadRes && uploadRes[0]) {
        const avatarId = uploadRes[0].id;

        // 2. Link avatar to user
        const updatedUser = await window.YakStrapi.request('/users/me', {
          method: 'PUT',
          body: JSON.stringify({ avatar: avatarId })
        });

        window.YakAuth.saveSession(window.YakAuth.jwt, updatedUser);
        currentUser = updatedUser;
        displayUserData(currentUser);

        if (window.YakToast) window.YakToast.success('Аватар обновлен');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      if (window.YakToast) window.YakToast.error('Ошибка загрузки');
    }
  }

  /**
   * Handle Password Change
   */
  async function handlePasswordChange() {
    // In Strapi v4, password change usually requires current password
    // Redirect to a specific page or show modal
    if (window.YakToast) window.YakToast.info('Для смены пароля используйте функцию "Забыли пароль" при входе');
  }

  return {
    init,
    handleSave,
    handleLogout,
    handleAvatarUpload
  };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', YakSettings.init);
window.YakSettings = YakSettings;