<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" maximized>
    <q-card class="privacy-dialog-card">
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <div class="text-h6">Privacy Policy</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-md scroll" style="max-height: 70vh">
        <div class="privacy-content">
          <!-- Last Updated -->
          <div class="text-caption text-grey-7 q-mb-md">Last Updated: January 21, 2026</div>

          <!-- Introduction -->
          <div class="text-h6 q-mb-sm">1. Introduction</div>
          <p class="text-body2 q-mb-md">
            At Libre Money, we are committed to protecting your privacy and giving you control over your personal and
            financial data. This Privacy Policy explains how we collect, use, store, and protect your information.
          </p>

          <!-- Our Privacy Principles -->
          <div class="text-h6 q-mb-sm">2. Our Privacy Principles</div>
          <p class="text-body2 q-mb-md">
            As a freedom-loving, open-source project, we are guided by the following principles:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li><strong>Transparency:</strong> Our source code is <a href="https://github.com/libre-money/libre-money-webapp" target="_blank" class="text-primary">open on GitHub</a> for anyone to inspect and verify our privacy practices.</li>
            <li><strong>User Control:</strong> You decide what data to share and when.</li>
            <li><strong>Data Minimization:</strong> We collect only what is necessary to provide functionality.</li>
            <li><strong>Security:</strong> We employ industry-standard practices to safeguard your data.</li>
          </ul>

          <!-- Data We Collect -->
          <div class="text-h6 q-mb-sm">3. Data We Collect</div>
          
          <div class="text-subtitle1 q-mb-xs">3.1 Financial Data</div>
          <p class="text-body2 q-mb-md">
            When you use Libre Money, you enter personal financial information including:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Income and expense records</li>
            <li>Account balances and transactions</li>
            <li>Budget information</li>
            <li>Financial goals and categories</li>
            <li>Notes and memos related to your finances</li>
          </ul>
          <p class="text-body2 q-mb-md">
            <strong>Offline Mode:</strong> When using Libre Money in offline mode, all financial data is stored locally
            on your device. We do not have access to this data unless you explicitly choose to enable cloud
            synchronization.
          </p>
          <p class="text-body2 q-mb-md">
            <strong>Cloud Synchronization:</strong> If you enable cloud synchronization, your financial data is
            encrypted and transmitted to our cloud servers to enable multi-device access. We always exercise due
            diligence to safeguard this data using industry-standard encryption and security practices.
          </p>

          <div class="text-subtitle1 q-mb-xs">3.2 Account Information</div>
          <p class="text-body2 q-mb-md">
            When you create an account (offline or cloud), we collect:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Username</li>
            <li>Email address (optional for offline, required for cloud accounts)</li>
            <li>Account creation date</li>
            <li>Authentication credentials (securely hashed)</li>
          </ul>

          <div class="text-subtitle1 q-mb-xs">3.3 Opt-in Telemetry</div>
          <p class="text-body2 q-mb-md">
            With your explicit consent, we may collect anonymous usage statistics to help improve Libre Money:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Feature usage patterns (which features you use, not what data you enter)</li>
            <li>Device and browser information</li>
            <li>Application performance metrics</li>
            <li>Error reports and crash logs (anonymized)</li>
          </ul>
          <p class="text-body2 q-mb-md">
            <strong>Important:</strong> Telemetry is entirely opt-in. You can enable or disable it at any time. Telemetry
            data is anonymized and never includes your financial information.
          </p>

          <div class="text-subtitle1 q-mb-xs">3.4 Security and Platform Protection Data</div>
          <p class="text-body2 q-mb-md">
            To ensure the security and integrity of our platform, we collect:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>IP addresses</li>
            <li>Request timestamps</li>
            <li>Authentication attempts</li>
            <li>Security-related events</li>
          </ul>
          <p class="text-body2 q-mb-md">
            This information is used to prevent abuse, detect security threats, and maintain platform stability.
          </p>

          <div class="text-subtitle1 q-mb-xs">3.5 Third-Party Vendor Data Collection</div>
          <p class="text-body2 q-mb-md">
            Our services utilize infrastructure from trusted upstream vendors including:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Google Cloud Platform (GCP) for cloud hosting</li>
            <li>Cloudflare for content delivery and DDoS protection</li>
            <li>Browser vendors (for PWA/offline functionality)</li>
          </ul>
          <p class="text-body2 q-mb-md">
            These vendors may collect their own telemetry and operational data according to their respective privacy
            policies. While we perform due diligence in selecting privacy-respecting vendors, we cannot control their
            data collection practices entirely. We encourage you to review their privacy policies:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li><a href="https://cloud.google.com/privacy" target="_blank" class="text-primary">Google Cloud Privacy Policy</a></li>
            <li><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" class="text-primary">Cloudflare Privacy Policy</a></li>
          </ul>

          <!-- How We Use Your Data -->
          <div class="text-h6 q-mb-sm">4. How We Use Your Data</div>
          <p class="text-body2 q-mb-md">We use the collected data to:</p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Provide core application functionality (tracking, budgeting, reporting)</li>
            <li>Enable cloud synchronization across your devices (if opted in)</li>
            <li>Improve application performance and user experience</li>
            <li>Detect and prevent security threats and abuse</li>
            <li>Communicate important updates (if you provided an email)</li>
            <li>Analyze usage patterns to prioritize features (only with telemetry consent)</li>
          </ul>

          <!-- Data Storage and Security -->
          <div class="text-h6 q-mb-sm">5. Data Storage and Security</div>
          
          <div class="text-subtitle1 q-mb-xs">5.1 Local Storage</div>
          <p class="text-body2 q-mb-md">
            Offline data is stored in your browser's local storage (IndexedDB). This data remains on your device and is
            subject to your browser's security policies. We recommend using device-level encryption and strong device
            passwords for additional security.
          </p>

          <div class="text-subtitle1 q-mb-xs">5.2 Cloud Storage</div>
          <p class="text-body2 q-mb-md">
            Cloud data is encrypted both in transit (using TLS/SSL) and at rest. We employ industry-standard security
            measures including:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Strong encryption algorithms</li>
            <li>Regular security audits</li>
            <li>Access controls and authentication</li>
            <li>Automated backups</li>
            <li>Secure infrastructure (provided by GCP)</li>
          </ul>
          <p class="text-body2 q-mb-md">
            While we always exercise due diligence to safeguard your data, no method of electronic storage is 100%
            secure. We recommend maintaining your own backups of critical financial information.
          </p>

          <!-- Data Sharing -->
          <div class="text-h6 q-mb-sm">6. Data Sharing and Disclosure</div>
          <p class="text-body2 q-mb-md">
            We do not sell, rent, or trade your personal information to third parties. We may share data only in the
            following limited circumstances:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li><strong>Service Providers:</strong> With infrastructure vendors (GCP, Cloudflare) necessary to provide our services</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our legal rights</li>
            <li><strong>Security:</strong> To prevent fraud or security threats</li>
            <li><strong>With Your Consent:</strong> When you explicitly authorize data sharing</li>
          </ul>

          <!-- Your Rights -->
          <div class="text-h6 q-mb-sm">7. Your Privacy Rights</div>
          <p class="text-body2 q-mb-md">You have the right to:</p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li><strong>Access:</strong> Request a copy of your data</li>
            <li><strong>Rectification:</strong> Correct inaccurate data</li>
            <li><strong>Deletion:</strong> Request deletion of your data (both local and cloud)</li>
            <li><strong>Export:</strong> Export your data in a standard format</li>
            <li><strong>Opt-out:</strong> Disable telemetry at any time</li>
            <li><strong>Portability:</strong> Since we're open source, you can even host your own instance</li>
          </ul>

          <!-- Data Retention -->
          <div class="text-h6 q-mb-sm">8. Data Retention</div>
          <p class="text-body2 q-mb-md">
            We retain your data for as long as your account is active. If you delete your account:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Local data is immediately removed from your device</li>
            <li>Cloud data is deleted within 30 days</li>
            <li>Backup copies are purged within 90 days</li>
            <li>Aggregated, anonymized data may be retained for analytics</li>
          </ul>

          <!-- Children's Privacy -->
          <div class="text-h6 q-mb-sm">9. Children's Privacy</div>
          <p class="text-body2 q-mb-md">
            Libre Money is not intended for use by children under 13. We do not knowingly collect personal information
            from children. If we become aware that we have collected data from a child under 13, we will take steps to
            delete it promptly.
          </p>

          <!-- International Users -->
          <div class="text-h6 q-mb-sm">10. International Data Transfers</div>
          <p class="text-body2 q-mb-md">
            Your data may be stored and processed in data centers operated by our cloud providers (primarily Google
            Cloud Platform) in various countries. By using our services, you consent to this transfer. We ensure that
            appropriate safeguards are in place to protect your data regardless of location.
          </p>

          <!-- Changes to Privacy Policy -->
          <div class="text-h6 q-mb-sm">11. Changes to This Privacy Policy</div>
          <p class="text-body2 q-mb-md">
            We may update this Privacy Policy from time to time. Material changes will be communicated through the
            application or via email (if you provided one). Continued use of Libre Money after changes constitutes
            acceptance of the updated policy.
          </p>

          <!-- Contact -->
          <div class="text-h6 q-mb-sm">12. Contact Us</div>
          <p class="text-body2 q-mb-md">
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>📧 Email: <a href="mailto:libre.money.support@proton.me" class="text-primary">libre.money.support@proton.me</a></li>
            <li>🌐 Website: <a href="https://libre.money" target="_blank" class="text-primary">libre.money</a></li>
            <li>💻 GitHub Repository: <a href="https://github.com/libre-money/libre-money-webapp" target="_blank" class="text-primary">libre-money-webapp</a></li>
            <li>🐛 Report Issues: <a href="https://github.com/libre-money/libre-money-webapp/issues" target="_blank" class="text-primary">GitHub Issues</a></li>
            <li>🏢 Organization: <a href="https://github.com/libre-money" target="_blank" class="text-primary">github.com/libre-money</a></li>
          </ul>

          <q-separator class="q-my-md" />

          <div class="text-caption text-grey-7 q-mt-lg">
            By using Libre Money, you acknowledge that you have read and understood this Privacy Policy and agree to our
            data practices as described herein.
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-sm">
        <q-btn flat label="Close" color="primary" @click="onDialogOK" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";

const emit = defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
</script>

<style scoped lang="scss">
.privacy-dialog-card {
  max-width: 800px;
  width: 100%;
}

.privacy-content {
  p {
    line-height: 1.6;
  }

  ul {
    li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
  }

  a {
    text-decoration: none;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }
}
</style>
