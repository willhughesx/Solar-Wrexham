#!/usr/bin/env node
// ============================================================
// SolarMatcher static site builder.
// Reads build/locations.json + build/templates/*, renders plain
// static HTML into dist/. No framework — Netlify just publishes
// whatever lands in dist/ after `npm run build` runs this script.
// ============================================================

const fs = require('fs');
const path = require('path');
const { render } = require('./render');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = __dirname;
const TEMPLATES_DIR = path.join(BUILD_DIR, 'templates');
const PARTIALS_DIR = path.join(TEMPLATES_DIR, 'partials');
const DIST_DIR = path.join(ROOT, 'dist');

const SITE_URL = 'https://solarmatcher.co.uk';
const TODAY = new Date().toISOString().slice(0, 10);

function readTemplate(relPath) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, relPath), 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(relOutPath, contents) {
  const outPath = path.join(DIST_DIR, relOutPath);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, contents);
}

function copyFile(srcName, destRelPath) {
  const src = path.join(ROOT, srcName);
  const dest = path.join(DIST_DIR, destRelPath || srcName);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

const headPartial = readTemplate('partials/head.html');
const headerPartial = readTemplate('partials/header.html');
const footerPartial = readTemplate('partials/footer.html');
const homeTemplate = readTemplate('home.html');
const locationTemplate = readTemplate('location.html');
const locationsIndexTemplate = readTemplate('locations-index.html');
const successTemplate = readTemplate('success.html');

const locations = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, 'locations.json'), 'utf8'));

// ---------- JSON-LD helpers ----------

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SolarMatcher',
    url: SITE_URL,
    description:
      'SolarMatcher connects UK homeowners with trusted local solar panel installers. SolarMatcher is an enquiry service, not an installation company.',
  };
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

function serviceSchema(location) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Solar panel installer matching',
    provider: {
      '@type': 'Organization',
      name: 'SolarMatcher',
      url: SITE_URL,
    },
    areaServed: {
      '@type': 'City',
      name: location.name,
    },
    description: location.metaDescription,
  };
}

function schemaScriptTag(schemaObjects) {
  return schemaObjects
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n');
}

// ---------- Rendering helpers ----------

function renderHead(data) {
  return render(headPartial, data);
}

function renderHeader(data) {
  const withDefaults = {
    skipLinkHref: '#quote-form',
    howItWorksHref: '#how-it-works',
    contactHref: '#quote-form',
    ...data,
  };
  return render(headerPartial, withDefaults);
}

function renderFooter(data) {
  return render(footerPartial, data);
}

function renderPage(pageTemplate, data) {
  const head = renderHead(data);
  const header = renderHeader(data);
  const footer = renderFooter(data);
  return render(pageTemplate, { ...data, head, header, footer });
}

// ---------- Build: homepage ----------

function buildHome() {
  const schema = schemaScriptTag([
    organizationSchema(),
    faqSchema([
      {
        q: 'Is SolarMatcher a solar installation company?',
        a: "No. SolarMatcher is a free enquiry service that connects homeowners with trusted local solar installation partners. We don't carry out installations ourselves.",
      },
      {
        q: 'Is it really free to enquire?',
        a: 'Yes. There is no cost or obligation to submit an enquiry, and no pressure to proceed with any quote you receive from a matched installer.',
      },
      {
        q: 'Who will my details be shared with?',
        a: 'Your enquiry is only shared with a suitable local installer covering your area, not sent out to multiple companies at once.',
      },
      {
        q: 'How quickly will I be contacted?',
        a: 'Matched installers typically get in touch within a few working days to discuss your roof, options and a free quote.',
      },
    ]),
  ]);

  const data = {
    pageTitle: 'SolarMatcher | Find Trusted Solar Installers Near You',
    metaDescription:
      "SolarMatcher helps homeowners across the UK connect with trusted local solar installers. Request a free quote and we'll match you with an installer in your area.",
    siteUrl: SITE_URL,
    canonicalPath: '/',
    schemaJson: schema,
    locations,
    footerAreasHeading: 'Where we operate',
    footerAreasText: 'SolarMatcher is growing across the UK. <a href="/locations/">See all the areas we cover</a>.',
  };

  writeFile('index.html', renderPage(homeTemplate, data));
}

// ---------- Build: locations index ----------

function buildLocationsIndex() {
  const schema = schemaScriptTag([
    organizationSchema(),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Locations', path: '/locations/' },
    ]),
  ]);

  const data = {
    pageTitle: 'Solar Installers Near You | SolarMatcher Locations',
    metaDescription:
      'Browse all UK locations covered by SolarMatcher and get a free, no-obligation solar panel quote from a trusted local installer.',
    siteUrl: SITE_URL,
    canonicalPath: '/locations/',
    schemaJson: schema,
    locations,
    skipLinkHref: '/#quote-form',
    howItWorksHref: '/#how-it-works',
    contactHref: '/#quote-form',
    footerAreasHeading: 'Where we operate',
    footerAreasText: 'SolarMatcher is growing across the UK. <a href="/locations/">See all the areas we cover</a>.',
  };

  writeFile('locations/index.html', renderPage(locationsIndexTemplate, data));
}

// ---------- Build: each location page ----------

function buildLocationPages() {
  locations.forEach((location) => {
    const schema = schemaScriptTag([
      organizationSchema(),
      serviceSchema(location),
      faqSchema(location.faqs || []),
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Locations', path: '/locations/' },
        { name: location.name, path: `/${location.slug}/` },
      ]),
    ]);

    const nearbyText = location.nearbyAreas && location.nearbyAreas.length
      ? `${location.name}, ${location.nearbyAreas.join(', ')} and surrounding parts of ${location.region}.`
      : `${location.name} and surrounding parts of ${location.region}.`;

    const data = {
      ...location,
      siteUrl: SITE_URL,
      pageTitle: location.metaTitle,
      metaDescription: location.metaDescription,
      canonicalPath: `/${location.slug}/`,
      schemaJson: schema,
      footerAreasHeading: 'Areas we cover',
      footerAreasText: nearbyText,
    };

    writeFile(`${location.slug}/index.html`, renderPage(locationTemplate, data));
  });
}

// ---------- Build: success page ----------

function buildSuccess() {
  const schema = schemaScriptTag([organizationSchema()]);

  const data = {
    pageTitle: 'Thank You | SolarMatcher',
    metaDescription: 'Thank you for your solar panel enquiry. A local installer covering your area will be in touch soon.',
    siteUrl: SITE_URL,
    canonicalPath: '/success.html',
    schemaJson: schema,
    skipLinkHref: '/#quote-form',
    howItWorksHref: '/#how-it-works',
    contactHref: '/#quote-form',
    footerAreasHeading: 'Where we operate',
    footerAreasText: 'SolarMatcher is growing across the UK. <a href="/locations/">See all the areas we cover</a>.',
  };

  writeFile('success.html', renderPage(successTemplate, data));
}

// ---------- Static assets, sitemap, robots ----------

function buildStaticAssets() {
  copyFile('style.css');
  copyFile('script.js');
  copyFile('favicon.svg');
  if (fs.existsSync(path.join(ROOT, 'google06c01721320cc5fe.html'))) {
    copyFile('google06c01721320cc5fe.html');
  }
}

function buildSitemap() {
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/locations/', priority: '0.8' },
    ...locations.map((location) => ({ loc: `/${location.slug}/`, priority: '0.9' })),
  ];

  const body = urls
    .map(
      (url) => `  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${url.priority}</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  writeFile('sitemap.xml', xml);
}

function buildRobots() {
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  writeFile('robots.txt', robots);
}

// ---------- Run ----------

function clean() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  ensureDir(DIST_DIR);
}

function build() {
  clean();
  buildHome();
  buildLocationsIndex();
  buildLocationPages();
  buildSuccess();
  buildStaticAssets();
  buildSitemap();
  buildRobots();
  console.log(`Build complete: ${locations.length} location page(s) generated into dist/`);
}

build();
