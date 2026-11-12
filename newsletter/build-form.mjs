import { writeFileSync } from 'node:fs';

const value = process.env.BREVO_FORM_URL || '';
if (value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.sibforms.com') || !url.pathname.startsWith('/serve/')) {
    throw new Error('Use the HTTPS embed URL from the Brevo signup form.');
  }
}
writeFileSync('cariocalimao/js/newsletter-config.js', 'window.newsletterFormUrl = ' + JSON.stringify(value) + ';\n');
