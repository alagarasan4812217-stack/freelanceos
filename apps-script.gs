// ============================================================
// FreelanceOS — Google Apps Script Backend
// ============================================================
// INSTRUCTIONS:
// 1. Go to https://script.google.com → New Project
// 2. Paste this entire file content
// 3. Update SPREADSHEET_ID and DRIVE_FOLDER_ID below
// 4. Click Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the Web App URL and paste into config.js
// ============================================================

// ---- CONFIGURATION ----
const SPREADSHEET_ID = '1BXXsteEiAmM3yNRSBa9c9-zfYjH6Fr0KQ2bEn9jHod4'; // From your Google Sheet URL
const DRIVE_FOLDER_ID = '1EiGnQVkiGIAmWrnJx_l-M8jwFVEULMgp'; // Optional: for logo uploads
const CLIENTS_SHEET = 'Clients';
const TASKS_SHEET = 'Tasks';

// ---- MAIN HANDLERS ----
function doGet(e) {
  try {
    const action   = e.parameter.action;
    const callback = e.parameter.callback; // present when called via JSONP
    let result;

    if (action === 'getClients') {
      result = getClients();
    } else if (action === 'getTasks') {
      result = getTasks();
    } else if (action === 'getAllData') {
      result = { clients: getClients(), tasks: getTasks() };
    } else if (action === 'testSheets') {
      // Debug endpoint: verify spreadsheet access without reading data
      try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        result = {
          ok: true,
          spreadsheetName: ss.getName(),
          spreadsheetId: SPREADSHEET_ID,
          sheets: ss.getSheets().map(s => s.getName()),
          driveFolder: DRIVE_FOLDER_ID,
        };
      } catch (sheetErr) {
        result = { ok: false, error: sheetErr.message };
      }
    } else {
      result = { error: 'Unknown action: ' + action };
    }

    const json = JSON.stringify(result);

    // ---- JSONP path (bypasses all CORS restrictions) ----
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // ---- Regular JSON path (with Apps Script's default CORS headers) ----
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const json = JSON.stringify({ error: err.message });
    const callback = (e && e.parameter) ? e.parameter.callback : null;
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    // e.postData.contents works for both application/json and text/plain
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'addClient':
        result = addClient(data.client);
        break;
      case 'deleteClient':
        result = deleteClient(data.clientId);
        break;
      case 'addTask':
        result = addTask(data.task);
        break;
      case 'deleteTask':
        result = deleteTask(data.taskId);
        break;
      case 'updateTaskStatus':
        result = updateTaskStatus(data.taskId, data.status);
        break;
      case 'updatePaymentStatus':
        result = updatePaymentStatus(data.taskId, data.paymentStatus);
        break;
      case 'updateTaskType':
        result = updateTaskType(data.taskId, data.taskType);
        break;
      case 'updateClientStatus':
        result = updateClientStatus(data.clientId, data.status);
        break;
      case 'updateClient':
        result = updateClient(data.client);
        break;
      case 'uploadImage':
        result = uploadImageToDrive(data.base64, data.filename, data.mimeType);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ---- SHEET HELPERS ----
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === CLIENTS_SHEET) {
      sheet.appendRow(['ID', 'Name', 'Email', 'Location', 'Type', 'Status', 'JoinedDate', 'TotalBilled', 'ActiveTasks', 'LogoUrl', 'CreatedAt']);
    } else if (name === TASKS_SHEET) {
      sheet.appendRow(['ID', 'ClientId', 'ClientName', 'TaskName', 'TaskType', 'Amount', 'Status', 'PaymentStatus', 'AssignedDate', 'DueDate', 'CreatedAt']);
    }
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ---- CLIENT OPERATIONS ----
function getClients() {
  const sheet = getSheet(CLIENTS_SHEET);
  return sheetToObjects(sheet);
}

function addClient(client) {
  // Validate spreadsheet access before writing
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    throw new Error('SPREADSHEET_ID is not configured in Apps Script.');
  }
  const sheet = getSheet(CLIENTS_SHEET);
  const id = generateId('CLT');
  const now = new Date().toISOString();
  // Accept both lowercase keys (from app) and PascalCase fallbacks
  var name        = (client.name        || client.Name        || '').toString();
  var email       = (client.email       || client.Email       || '').toString();
  var location    = (client.location    || client.Location    || '').toString();
  var type        = (client.type        || client.Type        || 'Corporate').toString();
  var status      = (client.status      || client.Status      || 'Active').toString();
  var joinedDate  = (client.joinedDate  || client.JoinedDate  || now.split('T')[0]).toString();
  var totalBilled = parseFloat(client.totalBilled || client.TotalBilled || 0);
  var activeTasks = parseInt(client.activeTasks   || client.ActiveTasks  || 0);
  var logoUrl     = (client.logoUrl     || client.LogoUrl     || '').toString();

  sheet.appendRow([id, name, email, location, type, status, joinedDate, totalBilled, activeTasks, logoUrl, now]);
  return { success: true, id: id };
}

function deleteClient(clientId) {
  const sheet = getSheet(CLIENTS_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === clientId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Client not found' };
}

function updateClientStatus(clientId, status) {
  const sheet = getSheet(CLIENTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('Status') + 1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === clientId) {
      sheet.getRange(i + 1, statusCol).setValue(status);
      return { success: true };
    }
  }
  return { error: 'Client not found' };
}

function updateClient(client) {
  if (!client || !client.id) return { error: 'Client ID is required' };
  const sheet = getSheet(CLIENTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(client.id)) {
      var colMap = {
        'Name':     client.name,
        'Email':    client.email,
        'Location': client.location,
        'Type':     client.type,
        'Status':   client.status,
        'LogoUrl':  client.logoUrl,
      };
      for (var colIdx = 0; colIdx < headers.length; colIdx++) {
        var h = headers[colIdx];
        if (colMap.hasOwnProperty(h) && colMap[h] !== undefined) {
          sheet.getRange(i + 1, colIdx + 1).setValue(colMap[h]);
        }
      }
      return { success: true };
    }
  }
  return { error: 'Client not found' };
}

// ---- TASK OPERATIONS ----
function getTasks() {
  const sheet = getSheet(TASKS_SHEET);
  return sheetToObjects(sheet);
}

function addTask(task) {
  // Validate spreadsheet access before writing
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    throw new Error('SPREADSHEET_ID is not configured in Apps Script.');
  }
  const sheet = getSheet(TASKS_SHEET);
  const id = generateId('TSK');
  const now = new Date().toISOString();
  // Accept both lowercase/camelCase keys (from app) and PascalCase fallbacks
  var clientId      = (task.clientId      || task.ClientId      || '').toString();
  var clientName    = (task.clientName    || task.ClientName    || '').toString();
  var taskName      = (task.taskName      || task.TaskName      || '').toString();
  var taskType      = (task.taskType      || task.TaskType      || '').toString();
  var amount        = parseFloat(task.amount        || task.Amount        || 0);
  var status        = (task.status        || task.Status        || 'Pending').toString();
  var paymentStatus = (task.paymentStatus || task.PaymentStatus || 'Pending').toString();
  var assignedDate  = (task.assignedDate  || task.AssignedDate  || now.split('T')[0]).toString();
  var dueDate       = (task.dueDate       || task.DueDate       || '').toString();

  sheet.appendRow([id, clientId, clientName, taskName, taskType, amount, status, paymentStatus, assignedDate, dueDate, now]);
  return { success: true, id: id };
}

function deleteTask(taskId) {
  const sheet = getSheet(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Task not found' };
}

function updateTaskStatus(taskId, status) {
  const sheet = getSheet(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('Status') + 1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      sheet.getRange(i + 1, statusCol).setValue(status);
      return { success: true };
    }
  }
  return { error: 'Task not found' };
}

function updatePaymentStatus(taskId, paymentStatus) {
  const sheet = getSheet(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const col = headers.indexOf('PaymentStatus') + 1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      sheet.getRange(i + 1, col).setValue(paymentStatus);
      return { success: true };
    }
  }
  return { error: 'Task not found' };
}

function updateTaskType(taskId, taskType) {
  const sheet = getSheet(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const col = headers.indexOf('TaskType') + 1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      sheet.getRange(i + 1, col).setValue(taskType);
      return { success: true };
    }
  }
  return { error: 'Task not found' };
}

// ---- IMAGE UPLOAD ----
function uploadImageToDrive(base64Data, filename, mimeType) {
  try {
    const decoded = Utilities.base64Decode(base64Data);
    const blob    = Utilities.newBlob(decoded, mimeType || 'image/jpeg', filename || 'upload.jpg');

    let file;
    let uploadedTo = 'root';

    // Try 1: Target folder (if configured)
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID_HERE') {
      try {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        file = folder.createFile(blob);
        uploadedTo = 'folder';
      } catch (folderErr) {
        // Folder inaccessible — fall back to Drive root
        Logger.log('Folder upload failed (' + folderErr.message + '). Falling back to Drive root.');
      }
    }

    // Try 2: Drive root fallback
    if (!file) {
      file = DriveApp.createFile(blob);
      uploadedTo = 'root';
    }

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    Logger.log('Image uploaded to Drive (' + uploadedTo + '): ' + url);
    return { success: true, url: url, fileId: file.getId(), location: uploadedTo };

  } catch (err) {
    Logger.log('uploadImageToDrive FAILED: ' + err.message);
    return { error: err.message };
  }
}

