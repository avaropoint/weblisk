#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Generate self-signed certificates for local HTTPS development
 */

import { ensureDir } from "https://deno.land/std@0.208.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.208.0/fs/exists.ts";

const CERTS_DIR = "./certs";
const CERT_FILE = `${CERTS_DIR}/localhost.crt`;
const KEY_FILE = `${CERTS_DIR}/localhost.key`;
const CONFIG_FILE = `${CERTS_DIR}/localhost.conf`;

async function generateCertificates() {
  console.log("Generating self-signed certificates for local development...");

  // Ensure certs directory exists
  await ensureDir(CERTS_DIR);

  // Check if certificates already exist
  if (await exists(CERT_FILE) && await exists(KEY_FILE)) {
    console.log("Certificates already exist!");
    console.log(`Certificate: ${CERT_FILE}`);
    console.log(`Private Key: ${KEY_FILE}`);

    const overwrite = prompt("Do you want to regenerate them? (y/N): ");
    if (overwrite?.toLowerCase() !== "y") {
      console.log("Using existing certificates.");
      return;
    }
  }

  // Create OpenSSL configuration file
  const opensslConfig = `
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = Development
L = Local
O = Weblisk Development
OU = Development Team
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
`.trim();

  await Deno.writeTextFile(CONFIG_FILE, opensslConfig);

  try {
    // Generate private key
    console.log("Generating private key...");
    const keyProcess = new Deno.Command("openssl", {
      args: [
        "genrsa",
        "-out",
        KEY_FILE,
        "2048",
      ],
      stdout: "null",
      stderr: "piped",
    });

    const keyResult = await keyProcess.output();
    if (!keyResult.success) {
      const error = new TextDecoder().decode(keyResult.stderr);
      throw new Error(`Failed to generate private key: ${error}`);
    }

    // Generate certificate
    console.log("Generating certificate...");
    const certProcess = new Deno.Command("openssl", {
      args: [
        "req",
        "-new",
        "-x509",
        "-key",
        KEY_FILE,
        "-out",
        CERT_FILE,
        "-days",
        "365",
        "-config",
        CONFIG_FILE,
      ],
      stdout: "null",
      stderr: "piped",
    });

    const certResult = await certProcess.output();
    if (!certResult.success) {
      const error = new TextDecoder().decode(certResult.stderr);
      throw new Error(`Failed to generate certificate: ${error}`);
    }

    // Clean up config file
    await Deno.remove(CONFIG_FILE);

    console.log("Self-signed certificates generated successfully!");
    console.log(`Certificate: ${CERT_FILE}`);
    console.log(`Private Key: ${KEY_FILE}`);
    console.log(`Valid for: 365 days`);
    console.log("");
    console.log("You can now run: deno task dev:https");
    console.log("");
    console.log("Browser Security Warning:");
    console.log(
      "Your browser will show a security warning for self-signed certificates.",
    );
    console.log(
      "Click 'Advanced' and 'Proceed to localhost (unsafe)' to continue.",
    );
    console.log("This is normal for development certificates.");
  } catch (error) {
    console.error("Failed to generate certificates:", error.message);
    console.log("");
    console.log("Make sure OpenSSL is installed:");
    console.log("macOS: brew install openssl");
    console.log("Ubuntu/Debian: apt-get install openssl");
    console.log(
      "Windows: Download from https://slproweb.com/products/Win32OpenSSL.html",
    );
    Deno.exit(1);
  }
}

async function checkOpenSSL() {
  try {
    const process = new Deno.Command("openssl", {
      args: ["version"],
      stdout: "piped",
      stderr: "null",
    });

    const result = await process.output();
    if (result.success) {
      const version = new TextDecoder().decode(result.stdout);
      console.log(`Found OpenSSL: ${version.trim()}`);
      return true;
    }
  } catch {
    // OpenSSL not found
  }

  console.error("OpenSSL not found!");
  console.log("Install OpenSSL first:");
  console.log("macOS: brew install openssl");
  console.log("Ubuntu/Debian: sudo apt-get install openssl");
  console.log(
    "Windows: Download from https://slproweb.com/products/Win32OpenSSL.html",
  );
  return false;
}

// Main execution
if (import.meta.main) {
  console.log("Weblisk Certificate Generator");

  if (await checkOpenSSL()) {
    await generateCertificates();
  } else {
    Deno.exit(1);
  }
}
