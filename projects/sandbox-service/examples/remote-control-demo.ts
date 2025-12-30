import { fetch } from 'undici';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'dev'; // Default token from config.ts

async function request(path: string, method: string = 'GET', body?: any) {
  const headers: any = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  const opts: any = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} ${text}`);
  }
  
  // Content endpoint returns html text, others return json
  if (path.includes('/content')) return res.text();
  return res.json();
}

async function main() {
  console.log('🚀 Starting Remote Browser Control Demo\n');

  try {
    // 1. Create a Session
    console.log('1️⃣  Creating Session (Isolation Start)...');
    const createRes = await request('/browser/sessions', 'POST', {
        device: 'desktop',
        viewport: { width: 1280, height: 800 }
    }) as any;
    const sessionId = createRes.sessionId;
    console.log(`   ✅ Session Created. ID: ${sessionId}`);
    console.log(`   ℹ️  This session runs in a dedicated BrowserContext (Cookies/Storage isolated).\n`);

    // 2. Navigate
    console.log('2️⃣  Navigating to example.com...');
    const navResult = await request(`/browser/sessions/${sessionId}/navigate`, 'POST', {
        url: 'https://example.com',
        waitUntil: 'domcontentloaded'
    });
    console.log(`   ✅ Navigated to: ${(navResult as any).url}\n`);

    // 3. Perform Action (Screenshot)
    console.log('3️⃣  Performing Action: Screenshot...');
    const actionResult = await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'screenshot'
    });
    const screenshotSize = (actionResult as any).screenshot?.length || 0;
    console.log(`   ✅ Screenshot taken. Size: ${screenshotSize} bytes (base64)\n`);

    // 3.5 Advanced Interaction (Drag Simulation)
    console.log('3️⃣.5️⃣  Simulating Human-like Drag (for Captchas)...');
    // Move to start
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'mouse_move',
        x: 100,
        y: 100,
        steps: 5
    });
    // Drag operation
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'drag',
        x: 100,
        y: 100,
        endX: 300,
        endY: 100,
        steps: 20 // Slower movement
    });
    console.log('   ✅ Drag operation completed.\n');

    // 3.6 Text Input Demonstration
    console.log('3️⃣.6️⃣  Text Input Demonstration...');
    
    // First, inject an input field into the page so we have something to type into
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'evaluate',
        script: `
            const input = document.createElement('input');
            input.id = 'demo-input';
            input.type = 'text';
            input.style.position = 'absolute';
            input.style.top = '200px';
            input.style.left = '100px';
            input.style.zIndex = '9999';
            document.body.appendChild(input);
        `
    });
    console.log('   ℹ️  Injected test input field into page');

    // Method A: Fill (Instant - good for standard forms)
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'fill',
        selector: '#demo-input',
        value: 'Hello World (Filled)'
    });
    console.log('   ✅ Used "fill" to set text instantly');

    // Method B: Type (Human-like - good for search bars/protected inputs)
    // Clear it first
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'fill',
        selector: '#demo-input',
        value: ''
    });
    
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'type',
        selector: '#demo-input',
        value: 'Hello Human (Typed Slowly)',
        duration: 100 // 100ms delay between keystrokes
    });
    console.log('   ✅ Used "type" to simulate human typing');

    // Method C: Click-to-Focus then Type (No Selector)
    console.log('   ℹ️  Testing Click-then-Type (No Selector)...');
    
    // 1. Click the input by coordinates (assuming we know where it is, e.g. from visual analysis)
    // The input is at top: 200px, left: 100px. Let's click slightly inside: 120, 210
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'click',
        x: 120,
        y: 210
    });
    
    // 2. Clear using keyboard (Ctrl/Cmd + A, Backspace)
    // Note: 'Control' or 'Meta' depending on OS. We'll try generic approach or just overwrite.
    // Let's just append for this demo to show it works.
    
    // 3. Type into the focused element
    await request(`/browser/sessions/${sessionId}/action`, 'POST', {
        action: 'type',
        // NO SELECTOR - types into focused element
        value: ' + Focused Input!',
        duration: 50
    });
    console.log('   ✅ Typed into focused element without selector');
    
    // 4. Get Content
    console.log('4️⃣  Fetching Page Content...');
    const content = await request(`/browser/sessions/${sessionId}/content`, 'GET') as string;
    console.log(`   ✅ Content retrieved. Length: ${content.length} chars\n`);

    // 5. Cleanup
    console.log('5️⃣  Destroying Session...');
    await request(`/browser/sessions/${sessionId}`, 'DELETE');
    console.log('   ✅ Session Destroyed.\n');

    console.log('✨ Demo Completed Successfully!');

  } catch (error) {
    console.error('❌ Demo Failed:', error);
    console.log('\n⚠️  Make sure the server is running on port 8080 (npm start)');
  }
}

main();
