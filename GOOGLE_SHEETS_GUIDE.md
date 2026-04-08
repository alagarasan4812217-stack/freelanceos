# FreelanceOS — Google Sheets Connection Guide

## Overview
This guide walks you through connecting FreelanceOS to Google Sheets so all your client and task data is stored and synced in real time.

---

## Step 1: Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new spreadsheet**
2. Name it: **FreelanceOS Data**
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit
   ```
   The ID is the long string between `/d/` and `/edit`

> **You do NOT need to manually create the Clients or Tasks tabs** — the Apps Script will create them automatically on first use.

---

## Step 2: Set Up Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete all existing code in the editor
3. Open the file `apps-script.gs` from your FreelanceOS folder
4. **Paste the entire contents** into the Apps Script editor
5. At the top of the script, update these two lines:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← paste your Sheet ID
   const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'; // ← see Step 3
   ```
6. Click **Save** (Ctrl+S or Cmd+S)

---

## Step 3: Create a Google Drive Folder (for Logo Uploads)

1. Go to [drive.google.com](https://drive.google.com)
2. Create a new folder named **FreelanceOS Logos**
3. Open the folder and copy its **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/YOUR_FOLDER_ID_HERE
   ```
4. Paste this ID into `DRIVE_FOLDER_ID` in the Apps Script

> **Note:** If you skip this step, logo uploads will still work — files will just be saved to your Drive root.

---

## Step 4: Deploy the Apps Script as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon ⚙ next to "Type" and select **Web app**
3. Configure the settings:
   - **Description:**   
   - **Execute as:** Me *(your Google account)*
   - **Who has access:** Anyone
4. Click **Deploy**
5. **Authorize** the app when prompted (click "Allow")
6. Copy the **Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec  
   ```

---

## Step 5: Update config.js

Open `config.js` in your FreelanceOS folder and update:

```javascript
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',  // ← paste here
  DEMO_MODE: false,  // ← change to false
  DRIVE_FOLDER_ID: 'YOUR_FOLDER_ID',  // ← optional
  // ...
};
```

---

## Step 6: Test the Connection

1. Open `index.html` in your browser
2. The **Demo Mode** banner should disappear
3. Try adding a client — check that a row appears in your Google Sheet's **Clients** tab
4. Try adding a task — check the **Tasks** tab
5. Try deleting a client — the row should be removed from the sheet

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Demo Mode" banner still shows | Make sure `DEMO_MODE: false` and URL is correct in `config.js` |
| CORS error in console | Re-deploy the Apps Script (`Deploy → Manage deployments → New version`) |
| Data not appearing in sheet | Check the Spreadsheet ID is correct — no extra spaces |
| Image not uploading | Verify Drive Folder ID and that the file is < 5MB |
| "Authorization required" | Click the Web App URL directly in browser and authorize |

---

## Sheet Structure (auto-created)

### Clients Tab
| ID | Name | Email | Location | Type | Status | JoinedDate | TotalBilled | ActiveTasks | LogoUrl | CreatedAt |
|---|---|---|---|---|---|---|---|---|---|---|

### Tasks Tab
| ID | ClientId | ClientName | TaskName | TaskType | Amount | Status | PaymentStatus | AssignedDate | DueDate | CreatedAt |
|---|---|---|---|---|---|---|---|---|---|---|

---

## Re-deploying After Changes

If you modify the Apps Script code, you **must** create a new deployment version:
1. Apps Script → **Deploy → Manage deployments**
2. Click the pencil ✏ icon
3. Change version to **"New version"**
4. Click **Deploy**
5. The URL stays the same — no need to update `config.js`

---

*FreelanceOS v1.0 — Built with ❤️*
