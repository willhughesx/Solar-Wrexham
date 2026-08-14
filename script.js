// ============================
// Mobile nav toggle
// ============================
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close mobile nav after a link is tapped
  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================
// Footer year
// ============================
const yearSpan = document.getElementById('year');
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// ============================
// Postcode-first hero teaser
// Scrolls to the full enquiry form and pre-fills the postcode field.
// Only present on templates that include the teaser markup, so this
// is a no-op on pages without it (e.g. success.html).
// ============================
const postcodeTeaserForm = document.getElementById('postcodeTeaserForm');

if (postcodeTeaserForm) {
  postcodeTeaserForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const teaserInput = document.getElementById('postcodeTeaser');
    const postcodeField = document.getElementById('postcode');

    if (teaserInput && postcodeField && teaserInput.value.trim()) {
      postcodeField.value = teaserInput.value.trim();
    }

    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
      quoteForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Give the scroll a moment to land before moving focus, so the next
    // field the user needs (full name) is ready to type into.
    const fullNameField = document.getElementById('fullName');
    if (fullNameField) {
      window.setTimeout(() => fullNameField.focus(), 500);
    }
  });
}

// ============================
// Enquiry form validation
// ============================
const form = document.getElementById('enquiryForm');
const formSuccess = document.getElementById('formSuccess');

// UK-friendly, reasonably permissive validators (not overly strict).
const validators = {
  fullName: (value) => value.trim().length >= 2 || 'Please enter your full name.',
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || 'Please enter a valid email address.',
  phone: (value) => /^[0-9+()\s-]{7,20}$/.test(value.trim()) || 'Please enter a valid phone number.',
  postcode: (value) =>
    /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(value.trim()) ||
    'Please enter a valid UK postcode (e.g. LL11 1AA).',
  propertyType: (value) => value !== '' || 'Please select a property type.',
  consent: (checked) => checked === true || 'Please confirm you are happy to be contacted.',
};

function setFieldError(fieldName, message) {
  const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
  const inputEl = form.querySelector(`[name="${fieldName}"]`);
  if (errorEl) errorEl.textContent = message || '';
  if (inputEl) {
    if (message) {
      inputEl.setAttribute('aria-invalid', 'true');
    } else {
      inputEl.removeAttribute('aria-invalid');
    }
  }
}

function validateField(fieldName) {
  const inputEl = form.querySelector(`[name="${fieldName}"]`);
  if (!inputEl || !validators[fieldName]) return true;

  const value = inputEl.type === 'checkbox' ? inputEl.checked : inputEl.value;
  const result = validators[fieldName](value);

  if (result === true) {
    setFieldError(fieldName, '');
    return true;
  }
  setFieldError(fieldName, result);
  return false;
}

if (form) {
  // Live validation as the user leaves each field
  Object.keys(validators).forEach((fieldName) => {
    const inputEl = form.querySelector(`[name="${fieldName}"]`);
    if (!inputEl) return;
    const eventType = inputEl.type === 'checkbox' ? 'change' : 'blur';
    inputEl.addEventListener(eventType, () => validateField(fieldName));
  });

  form.addEventListener('submit', (event) => {
    let isFormValid = true;
    Object.keys(validators).forEach((fieldName) => {
      const valid = validateField(fieldName);
      if (!valid) isFormValid = false;
    });

    if (!isFormValid) {
      // Only block submission when validation fails.
      event.preventDefault();
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Validation passed: let the browser submit the form normally so
    // Netlify Forms can process it (POST to "/", picked up by the
    // data-netlify="true" attribute), then redirect to success.html
    // as set in the form's action attribute.
  });
}
