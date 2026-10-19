document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('jwt-token');
  const consentCheck = document.getElementById('consent-check');
  const saveBtn = document.getElementById('save-btn');

  chrome.storage.local.get(['token', 'consented'], (result) => {
    if (result.token) tokenInput.value = result.token;
    if (result.consented !== undefined) consentCheck.checked = result.consented;
  });

  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      token: tokenInput.value.trim(),
      consented: consentCheck.checked
    }, () => {
      saveBtn.innerText = 'Saved!';
      setTimeout(() => { saveBtn.innerText = 'Save Settings'; }, 1500);
    });
  });
});
