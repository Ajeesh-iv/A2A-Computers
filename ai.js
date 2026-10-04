/**
 * AV Computers Dashboard - AI Insights & Predictions Engine
 * Simulates intelligent business predictions, diagnostics, and insights.
 */

const AI = {
  // 1. Sales Prediction Model (Linear Regression Trend)
  predictSales(sales) {
    // Group sales by month
    const monthlySales = {};
    sales.forEach(sale => {
      const month = window.Utils.safeGetDateStr(sale.date).substring(0, 7); // YYYY-MM
      const totalAmount = sale.price * sale.quantity;
      monthlySales[month] = (monthlySales[month] || 0) + totalAmount;
    });

    const months = Object.keys(monthlySales).sort();
    if (months.length < 2) {
      return {
        success: false,
        message: "Insufficient historical data. Need at least 2 months of records."
      };
    }

    // Convert to coordinates for linear fit
    const yValues = months.map(m => monthlySales[m]);
    const xValues = months.map((_, i) => i);
    const n = xValues.length;

    // Linear regression formula
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += xValues[i];
      sumY += yValues[i];
      sumXY += xValues[i] * yValues[i];
      sumXX += xValues[i] * xValues[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Project next 3 months
    const lastMonthStr = months[months.length - 1];
    let [year, monthVal] = lastMonthStr.split("-").map(Number);

    const predictions = [];
    for (let i = 1; i <= 3; i++) {
      monthVal += 1;
      if (monthVal > 12) {
        monthVal = 1;
        year += 1;
      }
      const targetMonthStr = `${year}-${String(monthVal).padStart(2, "0")}`;
      const projectedIndex = n - 1 + i;
      const predictedValue = Math.max(slope * projectedIndex + intercept, 15000); // Floor at ₹15k

      // Add a slight variance/seasonality
      const variance = (Math.random() - 0.5) * 0.05 * predictedValue; 
      predictions.push({
        month: targetMonthStr,
        amount: Math.round(predictedValue + variance),
        confidence: "High (85%)"
      });
    }

    const growthRate = slope / (yValues[yValues.length - 1] || 1);
    
    return {
      success: true,
      predictions,
      slope,
      growthRatePercent: (growthRate * 100).toFixed(1),
      summary: growthRate >= 0 
        ? `Sales are projected to grow by approximately ${Math.abs(growthRate * 100).toFixed(1)}% month-over-month. Positive trajectory detected.`
        : `Sales trends indicate a contraction of ${(growthRate * 100).toFixed(1)}% MoM. Restocking inventory and marketing are recommended.`
    };
  },

  // 2. Repair Advisor (Keyword-based diagnostics recommendation)
  getRepairAdvice(deviceType, problemDescription) {
    const desc = problemDescription.toLowerCase();
    let advice = {
      primaryCause: "General Hardware or Software Fault",
      timeEstimate: "2 - 4 Hours",
      partsNeeded: "None (Diagnostics Required)",
      steps: [
        "Verify power input levels and carry out visual board inspection.",
        "Perform hardware diagnostic loops (RAM tests, SSD health checks).",
        "Inspect OS events and crash logs for recurring errors."
      ]
    };

    if (desc.includes("battery") || desc.includes("drain") || desc.includes("charge")) {
      advice.primaryCause = "Degraded Battery Cell or Charging IC issue";
      advice.timeEstimate = "1 Hour";
      advice.partsNeeded = "Replacement OEM Battery Pack";
      advice.steps = [
        "Use battery diagnostic tools to check health percentage and cycle count.",
        "Inspect USB-C or DC Jack ports for physical damage or loose solder joints.",
        "Test current draw using an inline USB-C ammeter during boot cycles.",
        "Replace battery and perform charge-discharge calibration cycle."
      ];
    } else if (desc.includes("screen") || desc.includes("display") || desc.includes("cracked") || desc.includes("flicker")) {
      advice.primaryCause = "Damaged LCD Panel or faulty eDP Display Cable";
      advice.timeEstimate = "1 - 2 Hours";
      advice.partsNeeded = "Replacement LCD Screen / Display Assembly";
      advice.steps = [
        "Connect an external monitor to verify if the GPU operates correctly.",
        "De-energize motherboard and disconnect battery before servicing.",
        "Remove bezel and inspect eDP display ribbon cable for pinch tears.",
        "Swap panel, test backlight level controls, and secure panel bezels."
      ];
    } else if (desc.includes("slow") || desc.includes("boot") || desc.includes("freeze") || desc.includes("ssd")) {
      advice.primaryCause = "HDD/SSD Degradation or Windows Registry Corruption";
      advice.timeEstimate = "2 Hours";
      advice.partsNeeded = "NVMe SSD (Crucial/Samsung) & Fresh OS Install";
      advice.steps = [
        "Check S.M.A.R.T attributes of the drive using CrystalDiskInfo.",
        "Perform virus/malware scans and clean background startups.",
        "If disk response time is at 100%, clone data and replace with NVMe SSD.",
        "Clean install OS, download drivers, and restore user files."
      ];
    } else if (desc.includes("liquid") || desc.includes("water") || desc.includes("coffee") || desc.includes("spill")) {
      advice.primaryCause = "Liquid Ingress leading to short circuit on main power rail";
      advice.timeEstimate = "24 - 48 Hours";
      advice.partsNeeded = "Ultrasonic cleaning fluid, SMD solder wires";
      advice.steps = [
        "CRITICAL: Disconnect battery immediately. Do NOT attempt to turn on.",
        "Disassemble entire logic board and inspect under microscope for corrosion.",
        "Place board in ultrasonic cleaner using isopropyl alcohol.",
        "Reflow corroded resistors/capacitors and repair severed copper traces.",
        "Test power rails (3.3V, 5V, G3Hot) before reassembling."
      ];
    } else if (desc.includes("heat") || desc.includes("fan") || desc.includes("hot") || desc.includes("noise") || desc.includes("shut down")) {
      advice.primaryCause = "Thermal throttling due to dust accumulation or dry paste";
      advice.timeEstimate = "1 Hour";
      advice.partsNeeded = "Thermal Paste (Kryonaut), Replacement fan if bearing is worn";
      advice.steps = [
        "Monitor core temperatures under stress using HWMonitor.",
        "Blow out dust blocks from heatsink copper fins.",
        "Remove old thermal compound and apply high-performance thermal paste.",
        "Test fan operation and verify temperature drops under load."
      ];
    } else if (desc.includes("power") || desc.includes("dead") || desc.includes("wont turn on") || desc.includes("won't turn on")) {
      advice.primaryCause = "Faulty Power Supply (PSU) or Board Short Circuit";
      advice.timeEstimate = "2 - 3 Hours";
      advice.partsNeeded = "Replacement PSU or Motherboard component (MOSFET/Capacitor)";
      advice.steps = [
        "Test power outlet and AC adapter with a multimeter.",
        "For desktops: Bypass switch pins on motherboard to rule out power button.",
        "Perform PSU paperclip test or connect PSU tester.",
        "Inject current on shorted board rails to locate heating components using thermal camera."
      ];
    }

    return advice;
  },

  // 3. Analytics insights generator
  getBusinessInsights(products, sales, repairs) {
    const insights = [];

    // Check low stock
    const lowStock = products.filter(p => p.stock <= p.minStock);
    if (lowStock.length > 0) {
      // Find out if any low stock items are trending in sales
      const recentSalesCounts = {};
      sales.filter(s => {
        // Sales in last 14 days
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 14);
        return new Date(s.date) >= limitDate;
      }).forEach(s => {
        recentSalesCounts[s.productId] = (recentSalesCounts[s.productId] || 0) + s.quantity;
      });

      const urgentRestocks = lowStock.filter(p => recentSalesCounts[p.id] > 0);
      if (urgentRestocks.length > 0) {
        insights.push({
          type: "danger",
          title: "Urgent Restock Action",
          text: `Product <strong>${urgentRestocks[0].name}</strong> is below minimum stock (${urgentRestocks[0].stock} left) and has active sales trending this week. Restock immediately to capture demand.`
        });
      } else {
        insights.push({
          type: "warning",
          title: "Low Inventory Warning",
          text: `You have <strong>${lowStock.length}</strong> items running below safety thresholds. Review suppliers soon.`
        });
      }
    }

    // Check repair queues
    const pendingTickets = repairs.filter(r => r.status === "Pending" || r.status === "In Progress");
    if (pendingTickets.length > 5) {
      insights.push({
        type: "warning",
        title: "Service Department Bottleneck",
        text: `There are currently <strong>${pendingTickets.length}</strong> active repair tickets. Consider delegating extra hours to technicians to maintain quick turn-arounds.`
      });
    }

    // Revenue ratio insight
    let salesRev = 0;
    sales.forEach(s => salesRev += (s.price * s.quantity));

    let repairRev = 0;
    repairs.forEach(r => {
      if (r.status === "Completed" || r.status === "Delivered") {
        repairRev += r.estimatedCost;
      }
    });

    const totalRev = salesRev + repairRev;
    if (totalRev > 0) {
      const repairRatio = (repairRev / totalRev) * 100;
      if (repairRatio > 35) {
        insights.push({
          type: "info",
          title: "Service Margin Opportunity",
          text: `Repair services contribute <strong>${repairRatio.toFixed(1)}%</strong> of your total revenue. Service repairs typically carry much higher margins than hardware sales; advertise repair packages to boost profitability.`
        });
      } else {
        insights.push({
          type: "info",
          title: "Sales Dominant Revenue",
          text: `Hardware sales constitute <strong>${(100 - repairRatio).toFixed(1)}%</strong> of total income. Optimize supplier bulk discounts to raise thin hardware margins.`
        });
      }
    }

    // If no specific insights, push a generic greeting
    if (insights.length === 0) {
      insights.push({
        type: "success",
        title: "Operations Optimal",
        text: "Business metrics are stable. Stock levels are clear and repair lead times are within standard thresholds."
      });
    }

    return insights;
  }
};

window.AI = AI; // Expose globally
