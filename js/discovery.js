import { $, log } from "./utils.js";
import { Settings } from "./settings.js";

async function testConnection(ip) {
    try {
        const res = await fetch(`http://${ip}/ping`, { signal: AbortSignal.timeout(2000) });
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

async function scanNetwork() {
    $("#status").className = "warn";
    $("#status").textContent = "Scanning common local subnets... this may take a minute.";
    $("#scanBtn").disabled = true;

    // Common subnets to scan. We assume port 3000.
    const subnets = ["192.168.0", "192.168.1", "10.0.0"];
    const port = "3000";
    let foundIp = null;

    // Try mDNS first as a quick check
    if (await testConnection(`photobooth.local:${port}`)) {
        foundIp = `photobooth.local:${port}`;
    }

    // Sweep subnets if mDNS fails
    if (!foundIp) {
        for (const subnet of subnets) {
            if (foundIp) break;
            const promises = [];
            for (let i = 1; i <= 254; i++) {
                const testIp = `${subnet}.${i}:${port}`;
                promises.push(
                    testConnection(testIp).then(success => {
                        if (success) foundIp = testIp;
                    })
                );
            }
            // Wait for this subnet sweep to finish before trying the next
            await Promise.allSettled(promises);
        }
    }

    $("#scanBtn").disabled = false;

    if (foundIp) {
        $("#ipInput").value = foundIp;
        Settings.data.backendIp = foundIp;
        Settings.save();
        $("#status").className = "ok";
        $("#status").textContent = `Found backend at ${foundIp}! Saved automatically.`;
    } else {
        $("#status").className = "err";
        $("#status").textContent = "Could not automatically find the backend. Please enter the IP manually.";
    }
}

function init() {
    Settings.load();
    $("#ipInput").value = Settings.data.backendIp || "photobooth.local:3000";
    
    $("#saveBtn").addEventListener("click", saveAndTest);
    $("#scanBtn").addEventListener("click", scanNetwork);
    $("#backBtn").addEventListener("click", () => {
        window.location.href = "index.html";
    });
}

init();
