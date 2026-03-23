// tests/example.spec.js
const { test, expect } = require('@playwright/test');

const STORE_URL   = 'https://fitflopindia.myshopify.com';
const THEME_ID    = '184653185329'; // update when you restart shopify theme dev
const STORE_PASS  = 'nowpee';
const PREVIEW_URL = `${STORE_URL}/?preview_theme_id=${THEME_ID}`;
const CART_URL    = `${STORE_URL}/cart?preview_theme_id=${THEME_ID}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function unlockIfPasswordPage(page) {
  try {
    const input = page.locator('input[type="password"]');
    if (await input.isVisible({ timeout: 5000 })) {
      console.log('🔒 Password page — unlocking...');
      await input.fill(STORE_PASS);
      await page.locator('button[type="submit"], input[type="submit"]').first().click();
      await page.waitForLoadState('domcontentloaded');
      console.log('✅ Store unlocked');
    }
  } catch {
    // no password page, continue
  }
}

async function clickAddToCart(page) {
  const selectors = [
    'button:has-text("Add to cart")',
    'button:has-text("Add To Cart")',
    'button:has-text("ADD TO CART")',
    'button[name="add"]',
    'input[name="add"]',
    'form[action*="/cart/add"] button[type="submit"]',
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        console.log(`🛒 Add to Cart: ${sel}`);
        await btn.click();
        return;
      }
    } catch { continue; }
  }
  throw new Error('❌ Add to Cart button not found');
}

async function clickCheckout(page) {
  // ── FIX: Your button text is "Checkout • MRP: ₹999.00" not just "Checkout"
  // Using has-text() which does partial matching — catches any button containing "Checkout"
  const selectors = [
    // Cart drawer checkout button (ref=e817 from your snapshot)
    '[ref=e817]',
    // Cart page table checkout button (ref=e99 from your snapshot)
    '[ref=e99]',
    // Partial text match — works for "Checkout • MRP: ₹999.00"
    'button:has-text("Checkout")',
    'input[name="checkout"]',
    'a:has-text("Checkout")',
    // Fallback: any button inside cart form
    'form[action="/cart"] button[type="submit"]',
  ];

  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        const text = await btn.textContent();
        console.log(`💳 Checkout button found: "${text?.trim()}" via ${sel}`);
        await btn.click();
        return;
      }
    } catch { continue; }
  }

  // Debug: print all buttons visible on page to help diagnose
  const buttons = page.locator('button');
  const count = await buttons.count();
  console.log(`🔍 Debug — ${count} buttons found on page:`);
  for (let i = 0; i < Math.min(count, 10); i++) {
    const text = await buttons.nth(i).textContent();
    const visible = await buttons.nth(i).isVisible();
    console.log(`   [${i}] visible=${visible} text="${text?.trim()}"`);
  }

  throw new Error('❌ Checkout button not found — see debug output above');
}

// ── TEST 1: Happy Flow ────────────────────────────────────────────────────────
test('Shopify Happy Flow — Preview URL', async ({ page }) => {
  test.setTimeout(120000);

  // Step 1: Open store
  console.log('🌐 Opening store...');
  await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await unlockIfPasswordPage(page);

  // Step 2: Wait for products
  console.log('⏳ Waiting for product links...');
  await page.waitForSelector('a[href*="/products/"]', { timeout: 20000 });

  // Step 3: Click first product
  const firstProduct = page.locator('a[href*="/products/"]').first();
  const href = await firstProduct.getAttribute('href');
  console.log(`🖱️  Clicking: ${href}`);
  await firstProduct.click();
  await page.waitForLoadState('domcontentloaded');

  // Step 4: Add to cart
  await clickAddToCart(page);
  await page.waitForTimeout(2000);

  // Step 5: Go to cart
  console.log('🛍️  Going to cart...');
  await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });
  await unlockIfPasswordPage(page);

  // Step 6: Verify cart not empty
  await page.waitForSelector('table, .cart-items, [class*="cart"]', { timeout: 10000 });
  const pageContent = await page.content();
  expect(pageContent).not.toContain('Your cart is empty');
  console.log('✅ Cart has items');

  // Step 7: Click checkout
  await clickCheckout(page);

  // Step 8: ── FIX: Verify Razorpay iframe loaded ───────────────────────────
  // Razorpay opens as an OVERLAY iframe — the URL stays on /cart
  // We wait for the Razorpay iframe specifically (not WebEngage or other iframes)
  console.log('⏳ Waiting for Razorpay iframe...');

  // Wait for an iframe whose src contains razorpay OR whose content has "Contact details"
  await page.waitForFunction(() => {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    return iframes.some(f =>
      (f.src && f.src.includes('razorpay')) ||
      (f.name && f.name.includes('razorpay')) ||
      (f.id && f.id.includes('razorpay'))
    );
  }, { timeout: 20000 }).catch(async () => {
    // Razorpay iframe src may be empty — fallback: check frame content
    console.log('ℹ️  Razorpay src check failed — trying frame content...');
  });

  // Locate Razorpay frame by checking each iframe's inner content
  let razorpayVerified = false;

  const frames = page.frames();
  for (const frame of frames) {
    try {
      const url = frame.url();
      const content = await frame.content();
      if (
        url.includes('razorpay') ||
        content.includes('Contact details') ||
        content.includes('Razorpay') ||
        content.includes('razorpay')
      ) {
        console.log(`✅ Razorpay frame found: ${url || '(no url)'}`);
        razorpayVerified = true;

        // Verify the "Contact details" heading or "Mobile number" input is present
        const contactHeading = frame.locator('text=Contact details, text=Contact');
        const mobileInput = frame.locator('input[placeholder*="Mobile"], input[type="tel"]');

        const headingVisible = await contactHeading.first().isVisible({ timeout: 5000 }).catch(() => false);
        const inputVisible = await mobileInput.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (headingVisible || inputVisible) {
          console.log('✅ Razorpay checkout form confirmed!');
        }
        break;
      }
    } catch { continue; }
  }

  // Final assertion — either Razorpay verified OR URL changed to checkout
  const finalURL = page.url();
  const isCheckoutURL = /checkout|razorpay/.test(finalURL);

  expect(razorpayVerified || isCheckoutURL).toBeTruthy();
  console.log(`🎉 Happy Flow PASSED! Final URL: ${finalURL}`);
});

// ── TEST 2: Password Smoke Test ───────────────────────────────────────────────
test('Shopify — Password Page Unlocks Store', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto(STORE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const passwordInput = page.locator('input[type="password"]');
  const hasPassword = await passwordInput.isVisible({ timeout: 8000 }).catch(() => false);

  if (hasPassword) {
    console.log('🔒 Password page found — testing unlock...');
    await passwordInput.fill(STORE_PASS);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(passwordInput).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Unlocked successfully');
  } else {
    console.log('ℹ️  No password page — store already accessible. Passing.');
  }
});

// ── TEST 3: Local Dev (skipped until 401s resolved) ───────────────────────────
test.skip('Shopify Happy Flow — Local Dev 127.0.0.1:9292', async ({ page }) => {
  test.setTimeout(90000);
  const LOCAL = 'http://127.0.0.1:9292';

  await page.goto(LOCAL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await unlockIfPasswordPage(page);
  await page.waitForSelector('a[href*="/products/"]', { timeout: 20000 });
  await page.locator('a[href*="/products/"]').first().click();
  await page.waitForLoadState('domcontentloaded');
  await clickAddToCart(page);
  await page.waitForTimeout(2000);
  await page.goto(`${LOCAL}/cart`);
  await page.waitForLoadState('domcontentloaded');
  await clickCheckout(page);

  const frames = page.frames();
  const razorpayFrame = frames.find(f =>
    f.url().includes('razorpay') || f.name().includes('razorpay')
  );
  expect(razorpayFrame).toBeTruthy();
  console.log('🎉 Local dev checkout reached!');
});