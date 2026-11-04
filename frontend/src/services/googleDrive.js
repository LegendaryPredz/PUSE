// Google Drive Picker for loading a save. Enabled only when both env vars are set at build time.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
export const DRIVE_ENABLED = Boolean(CLIENT_ID && API_KEY);

let ready = null;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(script);
    });
}

// Load early: the sign-in popup must open close to the click or browsers block it.
export function loadDrive() {
    ready ??= Promise.all([loadScript('https://accounts.google.com/gsi/client'), loadScript('https://apis.google.com/js/api.js')])
        .then(() => new Promise((resolve) => window.gapi.load('picker', resolve)))
        .catch((error) => { ready = null; throw error; });
    return ready;
}

function requestToken() {
    return new Promise((resolve, reject) => {
        window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response) => (response.error ? reject(new Error(response.error_description || response.error)) : resolve(response.access_token)),
            error_callback: (error) => (error.type === 'popup_closed' ? resolve(null) : reject(new Error(error.message || error.type))),
        }).requestAccessToken({ prompt: '' });
    });
}

function showPicker(token) {
    const { picker } = window.google;
    return new Promise((resolve) => {
        new picker.PickerBuilder()
            .addView(new picker.DocsView(picker.ViewId.DOCS).setMode(picker.DocsViewMode.LIST))
            .setOAuthToken(token)
            .setDeveloperKey(API_KEY)
            .setAppId(CLIENT_ID.split('-')[0]) // project number; drive.file only grants the picked file to this app
            .setCallback((data) => {
                if (data.action === picker.Action.PICKED) resolve(data.docs[0]);
                else if (data.action === picker.Action.CANCEL) resolve(null);
            })
            .build()
            .setVisible(true);
    });
}

// Resolves to a File, or null when the user cancels.
export async function pickDriveFile() {
    await loadDrive();
    const token = await requestToken();
    if (!token) return null;
    const doc = await showPicker(token);
    if (!doc) return null;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Google Drive download failed (${response.status})`);
    return new File([await response.blob()], doc.name);
}
