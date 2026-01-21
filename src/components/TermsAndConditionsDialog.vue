<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" maximized>
    <q-card class="terms-dialog-card">
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <div class="text-h6">Terms and Conditions</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-md scroll" style="max-height: 70vh">
        <div class="terms-content">
          <!-- Last Updated -->
          <div class="text-caption text-grey-7 q-mb-md">Last Updated: January 21, 2026</div>

          <!-- Introduction -->
          <div class="text-h6 q-mb-sm">1. Introduction</div>
          <p class="text-body2 q-mb-md">
            Welcome to Libre Money! These Terms and Conditions ("Terms") govern your use of Libre Money, a free and
            open-source personal finance tracking application. By using our application, you agree to these Terms.
          </p>

          <!-- Open Source Nature -->
          <div class="text-h6 q-mb-sm">2. Open Source and Freedom</div>
          <p class="text-body2 q-mb-md">
            Libre Money is built on principles of software freedom and user autonomy. The application is released
            under the GPL-3.0 license, which means:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>You have the freedom to run, study, share, and modify the software.</li>
            <li>The source code is available on GitHub for transparency and community contribution.</li>
            <li>You maintain control over your data and how you use the application.</li>
            <li>We believe in respecting user privacy and freedom as core values.</li>
          </ul>

          <!-- Service Provision -->
          <div class="text-h6 q-mb-sm">3. Service Provision</div>
          
          <div class="text-subtitle1 q-mb-xs">3.1 Offline Services</div>
          <p class="text-body2 q-mb-md">
            Libre Money's offline functionality runs entirely on your device. These services are dependent on your
            browser capabilities, operating system, and device specifications. We take no liability for issues arising
            from platform limitations, browser compatibility, or device-specific problems.
          </p>

          <div class="text-subtitle1 q-mb-xs">3.2 Cloud Services</div>
          <p class="text-body2 q-mb-md">
            Our optional cloud synchronization services are provided on a <strong>best-effort basis</strong> unless
            explicitly specified otherwise by a Service Level Agreement (SLA) negotiated separately. We strive to
            maintain service availability but cannot guarantee uninterrupted access.
          </p>

          <!-- Data and Privacy -->
          <div class="text-h6 q-mb-sm">4. Data Handling</div>
          <p class="text-body2 q-mb-md">
            We collect and process user data as described in our Privacy Policy. By using our services, you consent to:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Collection of data necessary for application functionality, including cloud synchronization.</li>
            <li>Optional telemetry collection when explicitly consented to by you.</li>
            <li>Collection of certain information (such as IP addresses) for platform security purposes.</li>
          </ul>

          <!-- User Responsibilities -->
          <div class="text-h6 q-mb-sm">5. User Responsibilities</div>
          <p class="text-body2 q-mb-md">You are responsible for:</p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>Maintaining the confidentiality of your account credentials.</li>
            <li>Creating regular backups of your financial data.</li>
            <li>Ensuring the accuracy of information you enter into the application.</li>
            <li>Using the application in compliance with applicable laws and regulations.</li>
          </ul>

          <!-- Limitation of Liability -->
          <div class="text-h6 q-mb-sm">6. Limitation of Liability</div>
          <p class="text-body2 q-mb-md">
            Libre Money is provided "as is" without warranties of any kind, either express or implied. To the maximum
            extent permitted by law:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>We are not liable for any data loss, financial decisions, or damages arising from use of the application.</li>
            <li>We are not responsible for issues caused by third-party platforms, browsers, or operating systems.</li>
            <li>Cloud service interruptions or data synchronization issues do not constitute grounds for liability unless covered by an explicit SLA.</li>
            <li>We are not liable for actions taken by upstream vendors (such as Google Cloud Platform, Cloudflare, etc.).</li>
          </ul>

          <!-- Intellectual Property -->
          <div class="text-h6 q-mb-sm">7. Intellectual Property</div>
          <p class="text-body2 q-mb-md">
            While Libre Money is open-source software licensed under GPL-3.0 (available at 
            <a href="https://github.com/libre-money/libre-money-webapp" target="_blank" class="text-primary">GitHub</a>), 
            the Libre Money name and associated branding remain the property of the project maintainers. Your use of 
            the application does not grant you rights to use our trademarks without permission.
          </p>

          <!-- Third-Party Services -->
          <div class="text-h6 q-mb-sm">8. Third-Party Services</div>
          <p class="text-body2 q-mb-md">
            Our services rely on upstream vendors and third-party providers (including but not limited to Google Cloud
            Platform, Cloudflare, and browser vendors). These third parties may collect their own telemetry and data
            according to their respective privacy policies. We perform due diligence in selecting vendors but cannot
            control their data practices entirely.
          </p>

          <!-- Termination -->
          <div class="text-h6 q-mb-sm">9. Termination</div>
          <p class="text-body2 q-mb-md">
            You may stop using Libre Money at any time. We reserve the right to terminate or suspend access to cloud
            services for violations of these Terms or for any other reason, with or without notice.
          </p>

          <!-- Changes to Terms -->
          <div class="text-h6 q-mb-sm">10. Changes to These Terms</div>
          <p class="text-body2 q-mb-md">
            We may update these Terms from time to time. Continued use of the application after changes constitutes
            acceptance of the updated Terms. Material changes will be communicated through the application or our
            website.
          </p>

          <!-- Governing Law -->
          <div class="text-h6 q-mb-sm">11. Governing Law</div>
          <p class="text-body2 q-mb-md">
            These Terms are governed by applicable international laws and regulations. Any disputes shall be resolved
            through good-faith negotiation or, if necessary, through appropriate legal channels in the jurisdiction
            where the service operators are based.
          </p>

          <!-- Contact -->
          <div class="text-h6 q-mb-sm">12. Contact Information</div>
          <p class="text-body2 q-mb-md">
            For questions about these Terms, please contact us:
          </p>
          <ul class="text-body2 q-mb-md q-pl-md">
            <li>📧 Email: <a href="mailto:libre.money.support@proton.me" class="text-primary">libre.money.support@proton.me</a></li>
            <li>🌐 Website: <a href="https://libre.money" target="_blank" class="text-primary">libre.money</a></li>
            <li>💻 GitHub: <a href="https://github.com/libre-money/libre-money-webapp" target="_blank" class="text-primary">libre-money-webapp</a></li>
            <li>🏢 Organization: <a href="https://github.com/libre-money" target="_blank" class="text-primary">github.com/libre-money</a></li>
          </ul>

          <q-separator class="q-my-md" />

          <div class="text-caption text-grey-7 q-mt-lg">
            By using Libre Money, you acknowledge that you have read, understood, and agree to be bound by these Terms
            and Conditions.
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
.terms-dialog-card {
  max-width: 800px;
  width: 100%;
}

.terms-content {
  p {
    line-height: 1.6;
  }

  ul {
    li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
  }
}
</style>
