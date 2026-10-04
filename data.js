/**
 * A2A Computers Dashboard - Local Database Layer
 * Handles schema initialization and LocalStorage state synchronization.
 */

const INITIAL_PRODUCTS = [
  { id: "P101", name: "Lenovo ThinkPad X1 Carbon", category: "Laptops", price: 1299.99, stock: 12, minStock: 5, supplier: "Lenovo Distribution" },
  { id: "P102", name: "Dell XPS 15 9530", category: "Laptops", price: 1599.99, stock: 8, minStock: 4, supplier: "Dell India" },
  { id: "P103", name: "A2A Custom Gaming PC (RTX 4070)", category: "Desktop PCs", price: 1899.99, stock: 3, minStock: 2, supplier: "In-House Assembly" },
  { id: "P104", name: "Logitech MX Master 3S Mouse", category: "Accessories", price: 99.99, stock: 25, minStock: 10, supplier: "Logitech Logistics" },
  { id: "P105", name: "Samsung 990 Pro SSD 2TB", category: "Spare Parts", price: 169.99, stock: 3, minStock: 5, supplier: "Samsung India" },
  { id: "P106", name: "Thermal Grizzly Kryonaut Extreme", category: "Repair Components", price: 19.99, stock: 45, minStock: 15, supplier: "Overclockers Supply" },
  { id: "P107", name: "HP Pavilion Desktop PC", category: "Desktop PCs", price: 749.99, stock: 5, minStock: 3, supplier: "HP Commercial" },
  { id: "P108", name: "Crucial DDR5 RAM 32GB Kit", category: "Spare Parts", price: 119.99, stock: 2, minStock: 4, supplier: "Crucial Distributors" }
];

const INITIAL_EMPLOYEES = [
  { id: "EMP00", name: "Ajeesh", position: "Admin", email: "ajeesh@a2acomputers.com", phone: "+91 98765 00000", salary: 100000, joiningDate: "2024-01-01" },
  { id: "EMP01", name: "Amit Sharma", position: "Admin", email: "amit.sharma@a2acomputers.com", phone: "+91 98765 43210", salary: 85000, joiningDate: "2024-01-15" },
  { id: "EMP02", name: "Vikram Rathore", position: "Technician", email: "vikram.r@a2acomputers.com", phone: "+91 98765 43211", salary: 50000, joiningDate: "2024-03-10" },
  { id: "EMP03", name: "Pooja Patel", position: "Sales Executive", email: "pooja.p@a2acomputers.com", phone: "+91 98765 43212", salary: 45000, joiningDate: "2024-05-01" },
  { id: "EMP04", name: "Rajesh Kumar", position: "Accountant", email: "rajesh.k@a2acomputers.com", phone: "+91 98765 43213", salary: 55000, joiningDate: "2024-02-20" },
  { id: "EMP05", name: "Suresh Raina", position: "Store Manager", email: "suresh.r@a2acomputers.com", phone: "+91 98765 43214", salary: 65000, joiningDate: "2024-01-20" }
];

const INITIAL_SALES = [
  { id: "S1001", productId: "P101", productName: "Lenovo ThinkPad X1 Carbon", customerName: "Rahul Verma", price: 1299.99, quantity: 1, paymentMethod: "Credit Card", date: "2026-05-10", warrantyStatus: "Active (3 Years)" },
  { id: "S1002", productId: "P103", productName: "A2A Custom Gaming PC (RTX 4070)", customerName: "Rohan Das", price: 1899.99, quantity: 1, paymentMethod: "UPI", date: "2026-05-15", warrantyStatus: "Active (2 Years)" },
  { id: "S1003", productId: "P104", productName: "Logitech MX Master 3S Mouse", customerName: "Anita Sen", price: 99.99, quantity: 2, paymentMethod: "Cash", date: "2026-05-18", warrantyStatus: "Active (1 Year)" },
  { id: "S1004", productId: "P102", productName: "Dell XPS 15 9530", customerName: "Gaurav Mehta", price: 1599.99, quantity: 1, paymentMethod: "Net Banking", date: "2026-05-20", warrantyStatus: "Active (3 Years)" },
  { id: "S1005", productId: "P105", productName: "Samsung 990 Pro SSD 2TB", customerName: "Sanjay Dutt", price: 169.99, quantity: 1, paymentMethod: "UPI", date: "2026-05-22", warrantyStatus: "Active (5 Years)" },
  { id: "S1006", productId: "P106", productName: "Thermal Grizzly Kryonaut Extreme", customerName: "Rajesh Kumar", price: 19.99, quantity: 3, paymentMethod: "Cash", date: "2026-05-24", warrantyStatus: "None" },
  { id: "S1007", productId: "P101", productName: "Lenovo ThinkPad X1 Carbon", customerName: "TechCorp Solutions", price: 1299.99, quantity: 4, paymentMethod: "Corporate Invoice", date: "2026-05-25", warrantyStatus: "Active (3 Years)" }
];

const INITIAL_REPAIRS = [
  { id: "R1001", customerName: "Preeti Singh", deviceType: "Laptop", problemDescription: "Laptop battery drain. Shuts down after 10 minutes.", assignedTechnician: "EMP02", estimatedCost: 4500.00, status: "In Progress", completionDate: "", diagnosticsLog: "Battery health is at 24%. Recommended replacement of 60Wh Li-ion battery pack." },
  { id: "R1002", customerName: "Karan Johar", deviceType: "Desktop PC", problemDescription: "PC turns on but no display. Red VGA light on motherboard.", assignedTechnician: "EMP02", estimatedCost: 3200.00, status: "Pending", completionDate: "", diagnosticsLog: "Visual inspection done. Needs GPU diagnostic testing." },
  { id: "R1003", customerName: "Aditya Roy", deviceType: "Laptop", problemDescription: "Spilled coffee on keyboard. Keys are sticky and unresponsive.", assignedTechnician: "EMP02", estimatedCost: 8500.00, status: "Completed", completionDate: "2026-05-25", diagnosticsLog: "Cleaned logic board with isopropyl alcohol. Replaced keyboard assembly with new OEM module. Keyboard now functional." },
  { id: "R1004", customerName: "Neha Sharma", deviceType: "MacBook", problemDescription: "Cracked Retina Screen.", assignedTechnician: "EMP02", estimatedCost: 18000.00, status: "Delivered", completionDate: "2026-05-24", diagnosticsLog: "Replaced complete top lid assembly. Re-calibrated True Tone sensor. Handed over to client." }
];

const INITIAL_ATTENDANCE = [
  { date: "2026-05-25", empId: "EMP01", status: "Present", checkIn: "09:00", checkOut: "18:00" },
  { date: "2026-05-25", empId: "EMP02", status: "Present", checkIn: "09:15", checkOut: "18:30" },
  { date: "2026-05-25", empId: "EMP03", status: "Present", checkIn: "08:55", checkOut: "18:05" },
  { date: "2026-05-25", empId: "EMP04", status: "Present", checkIn: "09:00", checkOut: "18:00" },
  { date: "2026-05-25", empId: "EMP05", status: "Leave", checkIn: "", checkOut: "" },

  { date: "2026-05-26", empId: "EMP01", status: "Present", checkIn: "08:50", checkOut: "18:00" },
  { date: "2026-05-26", empId: "EMP02", status: "Present", checkIn: "09:05", checkOut: "18:15" },
  { date: "2026-05-26", empId: "EMP03", status: "Present", checkIn: "08:58", checkOut: "18:00" },
  { date: "2026-05-26", empId: "EMP04", status: "Absent", checkIn: "", checkOut: "" },
  { date: "2026-05-26", empId: "EMP05", status: "Present", checkIn: "09:00", checkOut: "18:00" },

  { date: "2026-05-27", empId: "EMP01", status: "Present", checkIn: "09:00", checkOut: "" },
  { date: "2026-05-27", empId: "EMP02", status: "Present", checkIn: "09:10", checkOut: "" },
  { date: "2026-05-27", empId: "EMP03", status: "Present", checkIn: "08:45", checkOut: "" }
];

const INITIAL_SALARIES = [
  { month: "2026-04", empId: "EMP01", baseSalary: 85000, bonus: 5000, deduction: 0, finalSalary: 90000, status: "Paid", payoutDate: "2026-04-30" },
  { month: "2026-04", empId: "EMP02", baseSalary: 50000, bonus: 2000, deduction: 1000, finalSalary: 51000, status: "Paid", payoutDate: "2026-04-30" },
  { month: "2026-04", empId: "EMP03", baseSalary: 45000, bonus: 6500, deduction: 0, finalSalary: 51500, status: "Paid", payoutDate: "2026-04-30" },
  { month: "2026-04", empId: "EMP04", baseSalary: 55000, bonus: 0, deduction: 2500, finalSalary: 52500, status: "Paid", payoutDate: "2026-04-30" },
  { month: "2026-04", empId: "EMP05", baseSalary: 65000, bonus: 3000, deduction: 0, finalSalary: 68000, status: "Paid", payoutDate: "2026-04-30" }
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "warning", message: "Low stock alert: 'Samsung 990 Pro SSD 2TB' only 3 items left.", time: "10 mins ago", read: false },
  { id: 2, type: "info", message: "New repair ticket registered for 'Karan Johar' (Desktop PC).", time: "2 hours ago", read: false },
  { id: 3, type: "success", message: "Invoice S1007 paid successfully by TechCorp Solutions.", time: "4 hours ago", read: true },
  { id: 4, type: "error", message: "Leave request submitted by Suresh Raina for June 1st.", time: "Yesterday", read: true }
];

const supabaseUrl = 'https://abiplkyokhohzqfdjiuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiaXBsa3lva2hvaHpxZmRqaXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjMwMDAsImV4cCI6MjEwMjc5OTAwMH0.7CXDmCRrUFpk6IjYHpoVpcUuHgevKng8htmuWWW6pbo';
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

const DB = {
  get(key, fallback = []) {
    try {
      const data = localStorage.getItem(`a2a_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error reading key a2a_${key} from localStorage`, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`a2a_${key}`, JSON.stringify(value));
      // Asynchronously sync to Supabase
      if (supabase && Array.isArray(value) && value.length > 0) {
        this.syncToSupabase(key, value);
      }
    } catch (e) {
      console.error(`Error writing key a2a_${key} to localStorage`, e);
    }
  },

  async syncToSupabase(table, data) {
    try {
      if (!supabase) return;
      // Upsert data to Supabase table
      const { error } = await supabase.from(table).upsert(data);
      if (error) console.error(`Error syncing ${table} to Supabase:`, error);
    } catch (e) {
      console.error(`Sync failed for ${table}`, e);
    }
  },

  async fetchFromSupabase() {
    if (!supabase) return;
    const tables = ["products", "employees", "sales", "repairs", "attendance", "salaries", "notifications"];
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (data && data.length > 0) {
          localStorage.setItem(`a2a_${table}`, JSON.stringify(data));
        } else {
          // If Supabase table is empty, sync sample data from local storage
          const localData = this.get(table, []);
          if (localData.length > 0) {
            await this.syncToSupabase(table, localData);
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${table} from Supabase:`, err);
      }
    }
  },

  init() {
    if (!localStorage.getItem("a2a_initialized")) {
      this.set("products", INITIAL_PRODUCTS);
      this.set("employees", INITIAL_EMPLOYEES);
      this.set("sales", INITIAL_SALRES_HISTORICAL()); // Seed historical months + current
      this.set("repairs", INITIAL_REPAIRS);
      this.set("attendance", INITIAL_ATTENDANCE);
      this.set("salaries", INITIAL_SALARIES);
      this.set("notifications", INITIAL_NOTIFICATIONS);
      localStorage.setItem("a2a_initialized", "true");
    } else {
      // Sync from Supabase in background, then refresh UI
      this.fetchFromSupabase().then(() => {
        if (window.app && typeof window.app.renderActivePanel === 'function') {
          window.app.renderActivePanel();
        }
      });
    }
  },

  reset() {
    localStorage.removeItem("a2a_initialized");
    localStorage.removeItem("a2a_products");
    localStorage.removeItem("a2a_employees");
    localStorage.removeItem("a2a_sales");
    localStorage.removeItem("a2a_repairs");
    localStorage.removeItem("a2a_attendance");
    localStorage.removeItem("a2a_salaries");
    localStorage.removeItem("a2a_notifications");
    this.init();
  }
};

// Generates historical sales data back to Jan 2026 to feed the monthly charts
function INITIAL_SALRES_HISTORICAL() {
  const baseSales = [...INITIAL_SALES];
  const historical = [
    // Jan 2026
    { id: "S100", productId: "P101", productName: "Lenovo ThinkPad X1 Carbon", customerName: "Janice A.", price: 1299.99, quantity: 2, paymentMethod: "Credit Card", date: "2026-01-10", warrantyStatus: "Active" },
    { id: "S101", productId: "P104", productName: "Logitech MX Master 3S Mouse", customerName: "Jack S.", price: 99.99, quantity: 5, paymentMethod: "Cash", date: "2026-01-18", warrantyStatus: "Active" },
    { id: "S102", productId: "P102", productName: "Dell XPS 15 9530", customerName: "Markus K.", price: 1599.99, quantity: 1, paymentMethod: "UPI", date: "2026-01-22", warrantyStatus: "Active" },
    
    // Feb 2026
    { id: "S200", productId: "P103", productName: "A2A Custom Gaming PC (RTX 4070)", customerName: "Gamer X", price: 1899.99, quantity: 2, paymentMethod: "Net Banking", date: "2026-02-05", warrantyStatus: "Active" },
    { id: "S201", productId: "P105", productName: "Samsung 990 Pro SSD 2TB", customerName: "Dev Y", price: 169.99, quantity: 3, paymentMethod: "UPI", date: "2026-02-14", warrantyStatus: "Active" },
    { id: "S202", productId: "P101", productName: "Lenovo ThinkPad X1 Carbon", customerName: "Sarah W.", price: 1299.99, quantity: 1, paymentMethod: "Credit Card", date: "2026-02-28", warrantyStatus: "Active" },
    
    // Mar 2026
    { id: "S300", productId: "P102", productName: "Dell XPS 15 9530", customerName: "David L.", price: 1599.99, quantity: 2, paymentMethod: "Credit Card", date: "2026-03-08", warrantyStatus: "Active" },
    { id: "S301", productId: "P104", productName: "Logitech MX Master 3S Mouse", customerName: "Tom H.", price: 99.99, quantity: 4, paymentMethod: "Cash", date: "2026-03-12", warrantyStatus: "Active" },
    { id: "S302", productId: "P103", productName: "A2A Custom Gaming PC (RTX 4070)", customerName: "Arun K.", price: 1899.99, quantity: 1, paymentMethod: "UPI", date: "2026-03-25", warrantyStatus: "Active" },
    
    // Apr 2026
    { id: "S400", productId: "P101", productName: "Lenovo ThinkPad X1 Carbon", customerName: "Alpha Corp", price: 1299.99, quantity: 5, paymentMethod: "Corporate Invoice", date: "2026-04-03", warrantyStatus: "Active" },
    { id: "S401", productId: "P106", productName: "Thermal Grizzly Kryonaut Extreme", customerName: "Tech Labs", price: 19.99, quantity: 10, paymentMethod: "UPI", date: "2026-04-15", warrantyStatus: "None" },
    { id: "S402", productId: "P107", productName: "HP Pavilion Desktop PC", customerName: "School Dist.", price: 749.99, quantity: 3, paymentMethod: "Corporate Invoice", date: "2026-04-22", warrantyStatus: "Active" },
    { id: "S403", productId: "P108", productName: "Crucial DDR5 RAM 32GB Kit", customerName: "Zeta Tech", price: 119.99, quantity: 4, paymentMethod: "UPI", date: "2026-04-29", warrantyStatus: "Active" }
  ];
  return [...historical, ...baseSales];
}

// Initialise DB
DB.init();
window.DB = DB; // expose globally to all app modules
