/**
 * A2A Computers Dashboard - Business Utility Helpers
 * Manages invoice printing, sound effects synthesis, IndexedDB file handles, Toast notifications, and Excel database operations.
 */

// ================= AUDIO EFFECTS ENGINE (Web Audio API) =================
const SoundEngine = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (common browser security gate)
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  playClick() {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch(e) { console.warn("Audio play blocked", e); }
  },

  playTransition() {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch(e) { console.warn("Audio play blocked", e); }
  },

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const playTone = (freq, delay, dur) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.05, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };
      // A2A Success Chord (Arpeggio in C Major)
      playTone(523.25, 0, 0.12);    // C5
      playTone(659.25, 0.06, 0.12);   // E5
      playTone(783.99, 0.12, 0.25);   // G5
    } catch(e) { console.warn("Audio play blocked", e); }
  },

  playAlert() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const playTone = (freq, delay, dur) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.06, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };
      // Warning chime (High A - Low E)
      playTone(880, 0, 0.1);
      playTone(587.33, 0.1, 0.18);
    } catch(e) { console.warn("Audio play blocked", e); }
  },

  playError() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const playTone = (freq, delay, dur) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.05, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };
      playTone(180, 0, 0.1);
      playTone(130, 0.08, 0.22);
    } catch(e) { console.warn("Audio play blocked", e); }
  }
};


// ================= PROFESSIONAL TOAST SYSTEM =================
const Toast = {
  show(type, title, message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    // Create Toast element
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    
    // Icon mapping
    let icon = "fa-info-circle";
    if (type === "success") {
      icon = "fa-check-circle";
      SoundEngine.playSuccess();
    } else if (type === "warning") {
      icon = "fa-exclamation-triangle";
      SoundEngine.playAlert();
    } else if (type === "error") {
      icon = "fa-times-circle";
      SoundEngine.playError();
    } else {
      SoundEngine.playClick();
    }

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <i class="fa-solid ${icon}" style="font-size: 1.1rem; margin-top: 2px;"></i>
        <div style="flex-grow: 1;">
          <div style="font-weight: 700; font-size: 0.85rem;">${title}</div>
          <div style="font-size: 0.75rem; opacity: 0.85; margin-top: 2px; line-height: 1.3;">${message}</div>
        </div>
        <button class="toast-close" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0 4px; font-size: 0.9rem; opacity: 0.7;" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;

    container.appendChild(toast);

    // Auto-remove after 4.5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add("hide");
        setTimeout(() => {
          if (toast.parentElement) toast.remove();
        }, 300);
      }
    }, 4500);
  }
};


// ================= INDEXEDDB FILE HANDLE OPERATIONS =================
const FileSync = {
  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("a2a_sync_db", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("handles")) {
          db.createObjectStore("handles");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async saveFileHandle(handle) {
    try {
      const db = await this.openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readwrite");
        const store = tx.objectStore("handles");
        const req = store.put(handle, "active_excel_handle");
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("IndexedDB save handle failed", e);
      return false;
    }
  },

  async loadFileHandle() {
    try {
      const db = await this.openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readonly");
        const store = tx.objectStore("handles");
        const req = store.get("active_excel_handle");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("IndexedDB load handle failed", e);
      return null;
    }
  },

  async clearFileHandle() {
    try {
      const db = await this.openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readwrite");
        const store = tx.objectStore("handles");
        const req = store.delete("active_excel_handle");
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("IndexedDB delete handle failed", e);
      return false;
    }
  },

  async verifyPermission(fileHandle, withWrite) {
    const opts = {};
    if (withWrite) {
      opts.mode = "readwrite";
    }
    try {
      if ((await fileHandle.queryPermission(opts)) === "granted") {
        return true;
      }
      if ((await fileHandle.requestPermission(opts)) === "granted") {
        return true;
      }
      return false;
    } catch(e) {
      console.warn("Failed to request permission", e);
      return false;
    }
  }
};


// ================= EXCEL READ/WRITE OPERATIONS =================
const Utils = {
  safeGetDateStr(dateVal) {
    if (!dateVal) return new Date().toISOString().substring(0, 10);
    if (typeof dateVal === "string") {
      return dateVal.includes("T") ? dateVal.split("T")[0] : dateVal;
    }
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      return dateVal.toISOString().substring(0, 10);
    }
    if (typeof dateVal === "number") {
      try {
        const date = new Date((dateVal - 25569) * 86400000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().substring(0, 10);
        }
      } catch (e) {}
    }
    return new Date().toISOString().substring(0, 10);
  },

  // Fallback CSV Exporter
  exportToCSV(filename, headers, rows) {
    let csvContent = "\uFEFF"; 
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
    rows.forEach(row => {
      const line = row.map(cell => {
        let val = String(cell === null || cell === undefined ? "" : cell);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",");
      csvContent += line + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  // Compile active tables into a formatted multi-sheet SheetJS Workbook
  compileDatabaseWorkbook() {
    const wb = XLSX.utils.book_new();

    // 1. Inventory Sheet (Products)
    const products = window.DB.get("products");
    const inventoryData = products.map(p => ({
      "Product ID": p.id,
      "Product Name": p.name,
      "Category": p.category,
      "Price (INR)": p.price,
      "Stock Qty": p.stock,
      "Min Stock": p.minStock,
      "Supplier": p.supplier
    }));
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData.length ? inventoryData : [{ "Product ID": "", "Product Name": "", "Category": "", "Price (INR)": 0, "Stock Qty": 0, "Min Stock": 5, "Supplier": "" }]);
    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");

    // 2. Employees Sheet
    const employees = window.DB.get("employees");
    const empData = employees.map(e => ({
      "Employee ID": e.id,
      "Full Name": e.name,
      "Position / Role": e.position,
      "Phone": e.phone,
      "Email": e.email,
      "Base Salary (INR)": e.salary,
      "Joining Date": this.safeGetDateStr(e.joiningDate)
    }));
    const wsEmployees = XLSX.utils.json_to_sheet(empData.length ? empData : [{ "Employee ID": "", "Full Name": "", "Position / Role": "", "Phone": "", "Email": "", "Base Salary (INR)": 0, "Joining Date": "" }]);
    XLSX.utils.book_append_sheet(wb, wsEmployees, "Employees");

    // 3. Sales Sheet
    const sales = window.DB.get("sales");
    const salesData = sales.map(s => ({
      "Sale Invoice ID": s.id,
      "Product ID": s.productId,
      "Product Name": s.productName,
      "Customer Name": s.customerName,
      "Unit Price (INR)": s.price,
      "Quantity Sold": s.quantity,
      "Payment Method": s.paymentMethod,
      "Transaction Date": this.safeGetDateStr(s.date),
      "Warranty Status": s.warrantyStatus
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData.length ? salesData : [{ "Sale Invoice ID": "", "Product ID": "", "Product Name": "", "Customer Name": "", "Unit Price (INR)": 0, "Quantity Sold": 0, "Payment Method": "", "Transaction Date": "", "Warranty Status": "" }]);
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales");

    // 4. Repairs Sheet
    const repairs = window.DB.get("repairs");
    const repairData = repairs.map(r => ({
      "Repair Ticket ID": r.id,
      "Customer Name": r.customerName,
      "Device Type": r.deviceType,
      "Problem Description": r.problemDescription,
      "Assigned Technician": r.assignedTechnician,
      "Estimated Cost (INR)": r.estimatedCost,
      "Repair Status": r.status,
      "Completion Date": this.safeGetDateStr(r.completionDate),
      "Diagnostics Log": r.diagnosticsLog
    }));
    const wsRepairs = XLSX.utils.json_to_sheet(repairData.length ? repairData : [{ "Repair Ticket ID": "", "Customer Name": "", "Device Type": "", "Problem Description": "", "Assigned Technician": "", "Estimated Cost (INR)": 0, "Repair Status": "", "Completion Date": "", "Diagnostics Log": "" }]);
    XLSX.utils.book_append_sheet(wb, wsRepairs, "Repairs");

    // 5. Attendance Sheet
    const attendance = window.DB.get("attendance");
    const attData = attendance.map(a => ({
      "Log Date": this.safeGetDateStr(a.date),
      "Employee ID": a.empId,
      "Attendance Status": a.status,
      "Check-In Time": a.checkIn || "09:00",
      "Check-Out Time": a.checkOut || "18:00"
    }));
    const wsAttendance = XLSX.utils.json_to_sheet(attData.length ? attData : [{ "Log Date": "", "Employee ID": "", "Attendance Status": "", "Check-In Time": "", "Check-Out Time": "" }]);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance");

    // 6. Salaries Sheet
    const salaries = window.DB.get("salaries");
    const salaryData = salaries.map(s => ({
      "Payroll Month": s.month,
      "Employee ID": s.empId,
      "Base Salary (INR)": s.baseSalary,
      "Bonus (INR)": s.bonus,
      "Deduction (INR)": s.deduction,
      "Net Payout (INR)": s.finalSalary,
      "Payment Status": s.status
    }));
    const wsSalaries = XLSX.utils.json_to_sheet(salaryData.length ? salaryData : [{ "Payroll Month": "", "Employee ID": "", "Base Salary (INR)": 0, "Bonus (INR)": 0, "Deduction (INR)": 0, "Net Payout (INR)": 0, "Payment Status": "" }]);
    XLSX.utils.book_append_sheet(wb, wsSalaries, "Salaries");

    return wb;
  },

  // 1. Export database workbook and trigger file download
  exportDatabaseToExcel() {
    if (typeof XLSX === "undefined") {
      Toast.show("error", "Engine Blocked", "SheetJS library is not ready.");
      return;
    }
    try {
      const wb = this.compileDatabaseWorkbook();
      XLSX.writeFile(wb, "A2A_Computers_Database.xlsx");
      Toast.show("success", "Export Successful", "Database workbook saved to downloads.");
    } catch (e) {
      console.error(e);
      Toast.show("error", "Export Failed", e.message);
    }
  },

  // Flexible Column Header Normalizer
  normalizeRowKeys(row) {
    if (!row || typeof row !== "object") return {};
    const normalized = {};
    for (let key in row) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      const cleanKey = key.trim().toLowerCase().replace(/[\s_\-]+/g, "");
      const val = row[key];

      // Smart Key Mapping
      if (cleanKey === "id" || cleanKey === "skuid" || cleanKey === "sku" || cleanKey === "ticketid" || cleanKey === "invoiceid" || cleanKey === "empid" || cleanKey === "employeeid") {
        normalized.id = String(val);
        if (cleanKey === "empid" || cleanKey === "employeeid") normalized.empId = String(val);
        if (cleanKey === "skuid" || cleanKey === "sku" || cleanKey === "productid") normalized.productId = String(val);
      } else if (cleanKey === "name" || cleanKey === "fullname" || cleanKey === "employeename" || cleanKey === "clientname") {
        normalized.name = String(val);
        normalized.customerName = String(val);
      } else if (cleanKey === "productname" || cleanKey === "product" || cleanKey === "item" || cleanKey === "itemdescription") {
        normalized.productName = String(val);
        if (!normalized.name) normalized.name = String(val);
      } else if (cleanKey === "customername" || cleanKey === "customer" || cleanKey === "client" || cleanKey === "billedto") {
        normalized.customerName = String(val);
      } else if (cleanKey === "productid") {
        normalized.productId = String(val);
      } else if (cleanKey === "category") {
        normalized.category = String(val);
      } else if (cleanKey === "price" || cleanKey === "unitprice" || cleanKey === "cost" || cleanKey === "amount") {
        normalized.price = parseFloat(val) || 0;
        normalized.estimatedCost = parseFloat(val) || 0;
      } else if (cleanKey === "stock" || cleanKey === "qty" || cleanKey === "quantity" || cleanKey === "units") {
        normalized.stock = parseInt(val) || 0;
        normalized.quantity = parseInt(val) || 1;
      } else if (cleanKey === "minstock" || cleanKey === "threshold" || cleanKey === "safetystock") {
        normalized.minStock = parseInt(val) || 5;
      } else if (cleanKey === "supplier") {
        normalized.supplier = String(val);
      } else if (cleanKey === "position" || cleanKey === "role" || cleanKey === "designation") {
        normalized.position = String(val);
      } else if (cleanKey === "salary" || cleanKey === "basesalary" || cleanKey === "basepay") {
        normalized.salary = parseFloat(val) || 0;
        normalized.baseSalary = parseFloat(val) || 0;
      } else if (cleanKey === "phone" || cleanKey === "contact") {
        normalized.phone = String(val);
      } else if (cleanKey === "email") {
        normalized.email = String(val);
      } else if (cleanKey === "joiningdate" || cleanKey === "joindate") {
        normalized.joiningDate = window.Utils.safeGetDateStr(val);
      } else if (cleanKey === "date" || cleanKey === "payoutdate" || cleanKey === "closeddate" || cleanKey === "completiondate") {
        const dStr = window.Utils.safeGetDateStr(val);
        normalized.date = dStr;
        normalized.payoutDate = dStr;
        normalized.completionDate = dStr;
      } else if (cleanKey === "status" || cleanKey === "warrantystatus" || cleanKey === "paymentstatus") {
        normalized.status = String(val);
        normalized.warrantyStatus = String(val);
      } else if (cleanKey === "paymentmethod" || cleanKey === "payment") {
        normalized.paymentMethod = String(val);
      } else if (cleanKey === "devicetype" || cleanKey === "device") {
        normalized.deviceType = String(val);
      } else if (cleanKey === "problemdescription" || cleanKey === "problem" || cleanKey === "complaint") {
        normalized.problemDescription = String(val);
      } else if (cleanKey === "diagnosticslog" || cleanKey === "diagnostics" || cleanKey === "notes") {
        normalized.diagnosticsLog = String(val);
      } else if (cleanKey === "assignedtechnician" || cleanKey === "technician") {
        normalized.assignedTechnician = String(val);
      } else if (cleanKey === "month") {
        normalized.month = String(val);
      } else if (cleanKey === "bonus") {
        normalized.bonus = parseFloat(val) || 0;
      } else if (cleanKey === "deduction" || cleanKey === "deductions") {
        normalized.deduction = parseFloat(val) || 0;
      } else if (cleanKey === "finalsalary" || cleanKey === "netsalary" || cleanKey === "payout") {
        normalized.finalSalary = parseFloat(val) || 0;
      } else if (cleanKey === "checkin") {
        normalized.checkIn = String(val);
      } else if (cleanKey === "checkout") {
        normalized.checkOut = String(val);
      } else {
        normalized[key] = val;
      }
    }
    return normalized;
  },

  // 2. Import and overwrite local data from an Excel workbook
  importDatabaseFromExcel(file, callback) {
    if (typeof XLSX === "undefined") {
      if (typeof Toast !== "undefined") Toast.show("error", "Engine Blocked", "SheetJS library is not ready.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        const targetCollections = ["products", "employees", "sales", "repairs", "attendance", "salaries"];
        const parsedDB = {};

        // Flexible sheet name mapping with aliases
        workbook.SheetNames.forEach(sheetName => {
          const lowerName = sheetName.trim().toLowerCase();
          let matchedCol = null;
          if (lowerName === "inventory" || lowerName === "products" || lowerName === "stock") matchedCol = "products";
          else if (lowerName === "employees" || lowerName === "employee" || lowerName === "staff") matchedCol = "employees";
          else if (lowerName === "sales" || lowerName === "sale" || lowerName === "invoices") matchedCol = "sales";
          else if (lowerName === "repairs" || lowerName === "repair" || lowerName === "tickets") matchedCol = "repairs";
          else if (lowerName === "attendance" || lowerName === "clockin") matchedCol = "attendance";
          else if (lowerName === "salaries" || lowerName === "salary" || lowerName === "payroll") matchedCol = "salaries";

          if (matchedCol) {
            const sheet = workbook.Sheets[sheetName];
            const rawJson = XLSX.utils.sheet_to_json(sheet);
            parsedDB[matchedCol] = rawJson.map(row => this.normalizeRowKeys(row));
          }
        });

        // Save matched collections
        let importedCount = 0;
        for (let col in parsedDB) {
          if (parsedDB[col] && parsedDB[col].length > 0) {
            window.DB.set(col, parsedDB[col]);
            importedCount++;
          }
        }

        if (importedCount === 0 && workbook.SheetNames.length > 0) {
          // Fallback: If no sheet names matched "products", "sales", etc., read the first sheet as products!
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rawJson = XLSX.utils.sheet_to_json(sheet);
          const normalized = rawJson.map(row => this.normalizeRowKeys(row));
          window.DB.set("products", normalized);
          importedCount = 1;
        }

        localStorage.setItem("a2a_initialized", "true");

        if (callback) callback(true, `Excel synced successfully! Updated ${importedCount} tables from workbook.`);
      } catch (err) {
        console.error("Excel import error", err);
        if (callback) callback(false, err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  // 3. Write workbook directly back to linked FileSystemFileHandle
  async writeDatabaseToExcelHandle(fileHandle) {
    if (typeof XLSX === "undefined" || !fileHandle) return false;
    try {
      const wb = this.compileDatabaseWorkbook();
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      
      const writable = await fileHandle.createWritable();
      await writable.write(excelBuffer);
      await writable.close();
      return true;
    } catch (e) {
      console.error("Direct writing back failed", e);
      throw e;
    }
  },

  // Renders print-ready Tax Invoice template
  printInvoice(sale) {
    const printArea = document.getElementById("print-invoice-area");
    if (!printArea) return;

    const subtotal = sale.price * sale.quantity;
    const gstRate = 0.18;
    const gst = subtotal * gstRate;
    const grandTotal = subtotal + gst;

    const dateFormatted = new Date(sale.date).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const html = `
      <div class="print-container" style="color: #000; background: #fff; padding: 40px; font-family: sans-serif;">
        <!-- Header Letterhead -->
        <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 20px;">
          <tr>
            <td>
              <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 5px;">A2A COMPUTERS</div>
              <div style="font-size: 12px; color: #475569;">Sales, Repair & Maintenance Services</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Shop G-12, Cyber Heights, Sector 62, Noida, UP</div>
              <div style="font-size: 11px; color: #64748b;">support@a2acomputers.com | +91 98765 43210</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">TAX INVOICE</div>
              <div style="font-size: 12px; color: #475569;">Invoice No: <strong>#${sale.id}</strong></div>
              <div style="font-size: 12px; color: #475569;">Date: ${dateFormatted}</div>
              <div style="font-size: 12px; color: #475569;">Payment: ${sale.paymentMethod}</div>
            </td>
          </tr>
        </table>

        <!-- Client & Warranty Details -->
        <table style="width: 100%; margin-bottom: 30px;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">Billed To</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${sale.customerName}</div>
              <div style="font-size: 12px; color: #475569; margin-top: 3px;">Customer ID: A2A-POS-${sale.customerName.replace(/\s+/g, '').substring(0,5).toUpperCase()}</div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">Warranty Status</div>
              <div style="font-size: 13px; font-weight: 700; color: #059669;">${sale.warrantyStatus || "Active (1 Year)"}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Subject to standard A2A support terms.</div>
            </td>
          </tr>
        </table>

        <!-- Line Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #cbd5e1; text-align: left; background: #f8fafc;">
              <th style="padding: 10px; font-weight: 700; color: #334155;">#</th>
              <th style="padding: 10px; font-weight: 700; color: #334155;">Item Description</th>
              <th style="padding: 10px; font-weight: 700; color: #334155; text-align: right;">Unit Price (₹)</th>
              <th style="padding: 10px; font-weight: 700; color: #334155; text-align: center;">Qty</th>
              <th style="padding: 10px; font-weight: 700; color: #334155; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 10px; color: #475569;">1</td>
              <td style="padding: 12px 10px;">
                <div style="font-weight: 700; color: #0f172a;">${sale.productName}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Product SKU: ${sale.productId}</div>
              </td>
              <td style="padding: 12px 10px; text-align: right; color: #475569;">₹${sale.price.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              <td style="padding: 12px 10px; text-align: center; color: #475569;">${sale.quantity}</td>
              <td style="padding: 12px 10px; text-align: right; font-weight: 600; color: #0f172a;">₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals Breakout -->
        <table style="width: 40%; margin-left: 60%; font-size: 13px; margin-bottom: 40px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b;">Subtotal:</td>
            <td style="padding: 8px 0; text-align: right; color: #334155;">₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b;">CGST + SGST (18%):</td>
            <td style="padding: 8px 0; text-align: right; color: #334155;">₹${gst.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr style="border-2px solid #0f172a;">
            <td style="padding: 10px 0; font-weight: 700; color: #0f172a; font-size: 15px;">Grand Total:</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 15px;">₹${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
        </table>

        <!-- Terms and Signatures -->
        <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 10px; color: #64748b;">
          <tr>
            <td style="width: 60%;">
              <div style="font-weight: 700; margin-bottom: 4px; color: #334155;">Terms & Conditions:</div>
              <div>1. All sales are subject to A2A Computers retail policies.</div>
              <div>2. Labor warranties are valid for 30 days post hardware repair.</div>
              <div>3. Returns must be accompanied by the original tax invoice.</div>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: bottom;">
              <div style="font-style: italic; margin-bottom: 30px;">For A2A Computers</div>
              <div style="font-weight: 700; color: #334155; border-top: 1.5px solid #334155; display: inline-block; padding-top: 4px; min-width: 120px;">Authorized Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    printArea.innerHTML = html;
    printArea.classList.add("print-active");
    window.print();
    setTimeout(() => {
      printArea.classList.remove("print-active");
      printArea.innerHTML = "";
    }, 100);
  },

  printPayslip(empId, month) {
    const salaries = window.DB.get("salaries");
    const employees = window.DB.get("employees");
    
    const salary = salaries.find(s => s.empId === empId && s.month === month);
    const emp = employees.find(e => e.id === empId);

    if (!salary || !emp) {
      Toast.show("error", "Data Error", "Unable to generate payslip details.");
      return;
    }

    const printArea = document.getElementById("print-invoice-area");
    if (!printArea) return;

    const html = `
      <div class="print-container" style="color: #000; background: #fff; padding: 40px; font-family: sans-serif;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #000;">A2A COMPUTERS</h2>
          <p style="margin: 4px 0 0; font-size: 11px; color: #555;">Shop G-12, Cyber Heights, Sector 62, Noida, UP</p>
          <h3 style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; font-weight: 700;">MONTHLY WAGE STATEMENT</h3>
        </div>

        <table style="width: 100%; font-size: 13px; margin-bottom: 30px; line-height: 1.6;">
          <tr>
            <td style="width: 50%;"><strong>Employee Name:</strong> ${emp.name}</td>
            <td style="width: 50%; text-align: right;"><strong>Statement Month:</strong> ${month}</td>
          </tr>
          <tr>
            <td><strong>Employee ID:</strong> ${emp.id}</td>
            <td style="text-align: right;"><strong>Designation Position:</strong> ${emp.position}</td>
          </tr>
          <tr>
            <td><strong>Email Address:</strong> ${emp.email}</td>
            <td style="text-align: right;"><strong>Payout Date:</strong> ${salary.payoutDate}</td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000; text-align: left; background: #f4f4f4;">
              <th style="padding: 8px; font-weight: 700; color: #000;">Salary Components</th>
              <th style="padding: 8px; text-align: right; font-weight: 700; color: #000;">Earnings (₹)</th>
              <th style="padding: 8px; text-align: right; font-weight: 700; color: #000;">Deductions (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 8px; color: #333;">Base Monthly Salary</td>
              <td style="padding: 10px 8px; text-align: right; color: #333;">₹${salary.baseSalary.toLocaleString('en-IN')}</td>
              <td style="padding: 10px 8px; text-align: right;">-</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 8px; color: #333;">Attendance Incentives & Bonuses</td>
              <td style="padding: 10px 8px; text-align: right; color: #333;">₹${salary.bonus.toLocaleString('en-IN')}</td>
              <td style="padding: 10px 8px; text-align: right;">-</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 8px; color: #333;">Absence / Leave Payout Deductions</td>
              <td style="padding: 10px 8px; text-align: right;">-</td>
              <td style="padding: 10px 8px; text-align: right; color:#ef4444;">₹${salary.deduction.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #fafafa;">
              <td style="padding: 12px 8px; font-size: 14px; color: #000;">Net Wage Payout</td>
              <td colspan="2" style="padding: 12px 8px; text-align: right; font-size: 15px; color:#581c87; font-weight: 800;">₹${salary.finalSalary.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 10px; color:#555; border-top: 1px dashed #999; padding-top: 15px; margin-top: 50px;">
          <p>Note: This is a computer generated document and does not require a physical signature.</p>
        </div>
      </div>
    `;

    printArea.innerHTML = html;
    printArea.classList.add("print-active");
    window.print();
    setTimeout(() => {
      printArea.classList.remove("print-active");
      printArea.innerHTML = "";
    }, 100);
  }
};

window.SoundEngine = SoundEngine;
window.Toast = Toast;
window.FileSync = FileSync;
window.Utils = Utils;
