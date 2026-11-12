import { writeFileSync } from 'node:fs';

const previewForm = 'https://4bcc50ba.sibforms.com/v2/serve/MUIFAH1JOzogpfBtnTwg2T3slEtxetYKqEpnC9YuPomwJNwaWXDwNY7aPZdfAw0RdvmN3gt7cO6MnJ2Brg3bl4xVHu-m1xXdIncdMg_2dyH7blaPJ7qE5ij9M-jYHFXvbCI4eyN2RubFqvorskcLgkeAIfl_YLyKPaCaCi5LnagzmyB21GI60M1ia9AmsWFRNupbsSMCavWL-t4yQw==';
const value = process.env.BREVO_FORM_URL || (process.env.VERCEL_ENV === 'preview' ? previewForm : '');
if (value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.sibforms.com') || !/^\/(?:v2\/)?serve\//.test(url.pathname)) {
    throw new Error('Use the HTTPS embed URL from the Brevo signup form.');
  }
}
writeFileSync('cariocalimao/js/newsletter-config.js', 'window.newsletterFormUrl = ' + JSON.stringify(value) + ';\n');
