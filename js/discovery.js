import { $, log } from "./utils.js";
import { Settings } from "./settings.js";

async function testConnection(ip) {
    try {
        const res = await fetch(`http://${ip}/ping`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
            const data = await res.json();
            return data.device === "photobooth-backend";
        }
    } catch (e) {
        return false;
    }
    return false;
}

async function saveAndTest() {
    const ip = $("#ipInput").value.trim();
    if (!ip) return;
    
    $("#status").className = "warn";
    $("#status").textContent = `Testing connection to ${ip}...`;
    
    const isOk = await testConnection(ip);
    if (isOk) {
        Settings.data.backendIp = ip;
        Settings.save();
        $("#status").className = "ok";
        $("#status").textContent = "Success! Connected to backend.";
    } else {
        $("#status").className = "err";
        $("#status").textContent = "Failed to connect. Check the IP and ensure the server is running.";
    }
}

async function backgroundScan() {
    const subnets = ["192.168.0", "192.168.1", "10.0.0"];
    const port = "3000";
    let found = 0;

    const addIp = (ip) => {
        // Prevent adding duplicate IPs to select
        const existing = Array.from($("#ipInput").options).some(opt => opt.value === ip);
        if (!existing) {
            const opt = document.createElement("option");
            opt.value = ip;
            opt.textContent = ip;
            $("#ipInput").appendChild(opt);
            found++;
            $("#status").textContent = `Scanning... Found ${found} backend(s). Choose from the dropdown!`;
        }
    };

    // Try mDNS
    if (await testConnection(`photobooth.local:${port}`)) {
        addIp(`photobooth.local:${port}`);
    }

    // Sweep subnets in batches to prevent browser from blocking requests
    for (const subnet of subnets) {
        for (let batch = 1; batch <= 254; batch += 30) {
            const promises = [];
            for (let i = 0; i < 30 && batch + i <= 254; i++) {
                const testIp = `${subnet}.${batch + i}:${port}`;
                promises.push(
                    testConnection(testIp).then(success => {
                        if (success) addIp(testIp);
                    })
                );
            }
            await Promise.allSettled(promises);
        }
    }
    
    if (found === 0) {
        $("#status").textContent = "Scan complete. No backends found on the local network. Please enter IP manually.";
        $("#status").className = "warn";
    } else {
        $("#status").textContent = `Scan complete. Found ${found} backend(s).`;
        $("#status").className = "ok";
    }
}

function init() {
    Settings.load();
    
    // Add the currently saved IP as the default first option
    const defaultIp = Settings.data.backendIp || "photobooth.local:3000";
    const opt = document.createElement("option");
    opt.value = defaultIp;
    opt.textContent = `${defaultIp} (Current)`;
    $("#ipInput").appendChild(opt);
    
    $("#saveBtn").addEventListener("click", saveAndTest);
    $("#backBtn").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    $("#status").className = "warn";
    $("#status").textContent = "Scanning local network for backends in the background...";
    backgroundScan();
}

init();
