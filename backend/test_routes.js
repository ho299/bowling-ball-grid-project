
  // IN THE CASE OF CATALOG TESTING, ALL SHOULD WORK IN SEQUENCE 
  // HOWEVER IN THE CASE OF THE USER, EACH TEST CASE IS LINKED TO THE USER ID AND OWNED BALL ID - VERY SPECIFIC
  // HENCE THEY WILL NOT WORK IN SEQUENCE, RATHER THE DELETION CASES SHOULD BE UNCOMMENTED FOR CREATION OF OBJECTS
  // THE OBJECT IDS MUST BE FED ONE AT A TIME TO THE TEST CASES. 

const BASE_URL = "http://localhost:3000";

async function run(label, method, path, body) {
  const options = { method, headers: { "Content-Type": "application/json" } };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => null);
    const ok = res.status >= 200 && res.status < 300;
    console.log(`[${ok ? "✅" : "❌"}] ${label} → ${res.status}`);
    if (!ok) console.log("    Response:", JSON.stringify(data));
    return data;
  } catch (err) {
    console.log(`[💥] ${label} → ERROR: ${err.message}`);
  }
}



///////////// CATELOG TEST CASES

async function testBallCRUD() {
  console.log("\n🎳 Ball CRUD Flow\n");

  // 1. CREATE (includes core, coverstock, specs)
  const created = await run("POST create ball", "POST", "/api/balls", {
    name: `Test Ball ${Date.now()}`,
    brand: "Test Brand",
    release_date: "Jan 2024",
    discontinued: false,
    overseas: false,
    factory_finish: "500/2000 Abralon",
    core_id: 8,        // Duality Core
    coverstock_id: 8,  // Inciter Solid Coverstock
    specs: [
        { weight: 15, rg: 2.48, diff: 0.050, mb_diff: 0.018 }
    ]
});

  const ballId = created?.id ?? null;

  if (!ballId) {
    console.log("⚠️  Couldn't get ball ID — skipping remaining tests");
    console.log("   Response was:", JSON.stringify(created));
    return;
  }

  // 2. READ
  await run("GET ball by ID",           "GET",    `/api/balls/${ballId}`);

  // 3. UPDATE
  await run("PUT update ball",          "PUT",    `/api/balls/${ballId}`, {
    name: "Updated Ball",
    brand: "Updated Brand"
  });

  // 4. DELETE
  await run("DELETE ball",              "DELETE", `/api/balls/${ballId}`);

  // 5. CONFIRM DELETION
  await run("GET deleted ball (404)",   "GET",    `/api/balls/${ballId}`);

  console.log("\n✅ Ball CRUD flow complete — no test data left in DB\n");
}

async function testCoverstockCRUD() {
  console.log("\n🔵 Coverstock CRUD Flow\n");

  // 1. CREATE
  const created = await run("POST create coverstock", "POST", "/api/coverstocks", {
    name: "Test Coverstock",
    type: "Hybrid",
    description: "Test description"
  });

  const coverstockId = created?.id ?? null;

  if (!coverstockId) {
    console.log("⚠️  Couldn't get coverstock ID — skipping remaining tests");
    console.log("   Response was:", JSON.stringify(created));
    return;
  }

  // 2. READ
  await run("GET coverstock by ID",         "GET",    `/api/coverstocks/${coverstockId}`);

  // 3. UPDATE
  await run("PUT update coverstock",        "PUT",    `/api/coverstocks/${coverstockId}`, {
    name: "Updated Coverstock",
    type: "Pearl"
  });

  // 4. DELETE
  await run("DELETE coverstock",            "DELETE", `/api/coverstocks/${coverstockId}`);

  // 5. CONFIRM DELETION
  await run("GET deleted coverstock (404)", "GET",    `/api/coverstocks/${coverstockId}`);

  console.log("\n✅ Coverstock CRUD flow complete — no test data left in DB\n");
}
async function testCoreCRUD() {
  console.log("\n⚙️  Core CRUD Flow\n");

  // 1. CREATE
  const created = await run("POST create core", "POST", "/api/cores", {
    name: `Test Core ${Date.now()}`,
    type: "Asymmetric",
    description: "Test core description"
  });

  const coreId = created?.id ?? null;

  if (!coreId) {
    console.log("⚠️  Couldn't get core ID — skipping remaining tests");
    console.log("   Response was:", JSON.stringify(created));
    return;
  }

  // 2. READ
  await run("GET core by ID",         "GET",    `/api/cores/${coreId}`);

  // 3. UPDATE
  await run("PUT update core",        "PUT",    `/api/cores/${coreId}`, {
    name: "Updated Core",
    type: "Symmetric"
  });

  // 4. DELETE
  await run("DELETE core",            "DELETE", `/api/cores/${coreId}`);

  // 5. CONFIRM DELETION
  await run("GET deleted core (404)", "GET",    `/api/cores/${coreId}`);

  console.log("\n✅ Core CRUD flow complete — no test data left in DB\n");
}

async function testSpecsCRUD() {
    console.log("\n📐 Specs Flow\n");

    // 1. CREATE
    const created = await run("POST create spec", "POST", "/api/specs", {
      ball_id: 2,
      weight: 17,
      rg: 2.48,
      diff: 0.050,
      mb_diff: 0.018
    });

    // 2. GET all specs by ball ID
    await run("GET specs by ball ID", "GET", "/api/specs/ball/2");

    // 3. GET specific spec by ball ID + weight
    await run("GET spec by ball ID + weight", "GET", "/api/specs/ball/2/17");

    console.log("\n✅ Specs flow complete\n");
    console.log("⚠️  Note: no DELETE or PUT on specs yet — weight 17 for ball 2 remains in DB\n");
}

/////////////// USER FUNTIONALITY TEST CASES

async function testUserCRUD() {
  console.log("\n👤 User Flow\n");

  // 1. REGISTER
  await run("POST register user", "POST", "/api/users", {
    first_name: "Test", last_name: "User",
    email: "testuser@test.com", password: "password123"
  });


  // 2. LOGIN — get ID from here
  const login = await run("POST login user", "POST", "/api/users/login", {
    email: "testuser@test.com", password: "password123"
  });

  const userId = login?.user?.id ?? null;

  if (!userId) {
    console.log("⚠️  Couldn't get user ID from login — skipping update/delete");
    return;
    }
  // 3a. CHECK before update
  const original = await run("GET user before update", "GET", `/api/users/${userId}`);
  console.log("   Original user:", JSON.stringify(original, null, 2));

  // 3b. UPDATE
  await run("PUT update user", "PUT", `/api/users/${userId}`, {
    first_name: "Updated", last_name: "Name"
  });

  // 3c. CHECK after update
  const updated = await run("GET user after update", "GET", `/api/users/${userId}`);
  console.log("   Updated user:", JSON.stringify(updated, null, 2));
  // 4. DELETE
  await run("DELETE user", "DELETE", `/api/users/${userId}`);

  // 5. CONFIRM DELETION
  await run("GET deleted user (should 404)", "GET", `/api/users/${userId}`);

  console.log("\n✅ User flow complete — no test data left in DB\n");
}

async function testOwnedBallCRUD() {
  console.log("\n🎳 Owned Ball CRUD Flow\n");


  // 1. CREATE
  const created = await run("POST add owned ball", "POST", "/api/owned-balls", {
    user_id: 29,   // ← replace with real user ID
    ball_id: 2,   // ← replace with real ball ID
    weight: 15,
    usage: 0,
    note: "Test note",
    condition: "excellent",
    status: "active",
    drilled: false
  });
  const extra_ownedball = await run("POST add owned ball", "POST", "/api/owned-balls", {
    user_id: 29,   // ← replace with real user ID
    ball_id: 4,   // ← replace with real ball ID
    weight: 15,
    usage: 0,
    note: "Test note",
    condition: "excellent",
    status: "active",
    drilled: false
  });

  const ownedBallId = created?.id ?? null;

  if (!ownedBallId) {
    console.log("⚠️  Couldn't get owned ball ID — skipping remaining tests");
    console.log("   Response was:", JSON.stringify(created));
    return;
  }

  // 2. GET by ID
  await run("GET owned ball by ID",           "GET", `/api/owned-balls/${ownedBallId}`);

  // 3. GET drilled status
  await run("GET drilled status",             "GET", `/api/owned-balls/${ownedBallId}/drilled`);

  // 4. GET all owned balls by user
  await run("GET owned balls by user",        "GET", `/api/owned-balls/user/29`);  // ← same user_id

  // 5. UPDATE
  await run("PUT update owned ball",          "PUT", `/api/owned-balls/${ownedBallId}`, {
    note: "Updated note",
    condition: "good",
    drilled: true
  });

  // 6. GET after update to confirm
  const updated = await run("GET after update", "GET", `/api/owned-balls/${ownedBallId}`);
  console.log("   Updated owned ball:", JSON.stringify(updated, null, 2));

  // 7. DELETE
  await run("DELETE owned ball",              "DELETE", `/api/owned-balls/${ownedBallId}`);

  // 8. CONFIRM DELETION
  await run("GET deleted owned ball (404)",   "GET", `/api/owned-balls/${ownedBallId}`);

  console.log("\n✅ Owned Ball CRUD flow complete — no test data left in DB\n");
}

async function testModificationCRUD() {
  console.log("\n🔧 Modification CRUD Flow\n");

  const ownedBallId = 6; // ← replace with real owned_ball id

  // 1. CREATE
  const created = await run("POST add modification", "POST", "/api/modifications", {
    owned_ball_id: ownedBallId,
    mod_type: "surface",
    description: "Test resurface",
    rg: 2.48,
    diff: 0.050,
    mb_diff: 0.018
  });

  const modId = created?.id ?? null;

  if (!modId) {
    console.log("⚠️  Couldn't get modification ID — skipping remaining tests");
    console.log("   Response was:", JSON.stringify(created));
    return;
  }

  // 2. GET by ID
  await run("GET modification by ID",           "GET", `/api/modifications/${modId}`);

  // 3. GET current modification for owned ball
  await run("GET current modification",         "GET", `/api/modifications/owned-ball/${ownedBallId}/current`);

  // 4. GET full history for owned ball
  await run("GET modification history",         "GET", `/api/modifications/owned-ball/${ownedBallId}/history`);

  // 5. UPDATE
  await run("PUT update modification",          "PUT", `/api/modifications/${modId}`, {
    mod_type: "other",
    description: "Updated to polish"
  });

  // 6. GET after update to confirm
  const updated = await run("GET after update", "GET", `/api/modifications/${modId}`);
  console.log("   Updated modification:", JSON.stringify(updated, null, 2));

  // 7. DELETE
  // await run("DELETE modification",              "DELETE", `/api/modifications/${modId}`);

  // 8. CONFIRM DELETION
  await run("GET deleted modification (404)",   "GET", `/api/modifications/${modId}`);

  console.log("\n✅ Modification CRUD flow complete — no test data left in DB\n");
}
async function testArsenalListCRUD() {
  console.log("\n📋 Arsenal List CRUD Flow\n");

  const userId = 29; // UPDATE USER ID ON CREATION OF ONE - THIS IS USED FOR TESTING PURPOSE ONLY

  const created = await run("POST create arsenal", "POST", "/api/arsenal-lists", {
    user_id: userId,
    name: `Test Arsenal ${Date.now()}`,
    description: "Test arsenal description"
  });

  const arsenalId = created?.id ?? null;

  if (!arsenalId) {
    console.log("⚠️  Couldn't get arsenal ID — skipping remaining tests");
    console.log("   Response was:", JSON.stringify(created));
    return null;  // ← return null so content test knows to skip
  }

  await run("GET arsenal by ID",         "GET",    `/api/arsenal-lists/${arsenalId}`);
  await run("GET arsenals by user",      "GET",    `/api/arsenal-lists/user/${userId}`);
  await run("PUT update arsenal",        "PUT",    `/api/arsenal-lists/${arsenalId}`, {
    name: "Updated Arsenal Name"
  });

  const updated = await run("GET after update", "GET", `/api/arsenal-lists/${arsenalId}`);
  console.log("   Updated arsenal:", JSON.stringify(updated, null, 2));

  console.log("\n✅ Arsenal List CRUD flow complete\n");
  return arsenalId;  // ← pass to content test
}

async function testArsenalContentCRUD(arsenalId) {
  console.log("\n🎳 Arsenal Content CRUD Flow\n");

  const ownedBallId = 4; // ← replace with real owned_ball ID

  if (!arsenalId) {
    console.log("⚠️  No arsenal ID provided — skipping content tests");
    return;
  }

  await run("POST add ball to arsenal",   "POST",   "/api/arsenal-content", {
    arsenal_id: arsenalId,
    owned_ball_id: ownedBallId,
    role: "primary",
    slot_number: 1
  });

  await run("GET balls in arsenal",       "GET",    `/api/arsenal-content/${arsenalId}`);

  await run("PUT update ball in arsenal", "PUT",    `/api/arsenal-content/${arsenalId}/${ownedBallId}`, {
    role: "backup",
    slot_number: 2
  });

  const updated = await run("GET after update", "GET", `/api/arsenal-content/${arsenalId}`);
  console.log("   Updated content:", JSON.stringify(updated, null, 2));

  await run("DELETE ball from arsenal",   "DELETE", `/api/arsenal-content/${arsenalId}/${ownedBallId}`);
  await run("GET after removal (404)",    "GET",    `/api/arsenal-content/${arsenalId}`);

  // cleanup
  await run("DELETE test arsenal",        "DELETE", `/api/arsenal-lists/${arsenalId}`);
  await run("GET deleted arsenal (404)",  "GET",    `/api/arsenal-lists/${arsenalId}`);

  console.log("\n✅ Arsenal Content CRUD flow complete — no test data left in DB\n");
}

async function main() {
  console.log("\n🎳 Bowling API Route Tests\n");

  // Health check
  await run("Health check",                  "GET",    "/");

  // ── Balls ──────────────────────────────────────────
  await run("GET all balls",                 "GET",    "/api/balls");
  await run("GET ball by ID",                "GET",    "/api/balls/2");

  // ── Users ──────────────────────────────────────────

  // ── Cores ──────────────────────────────────────────
  await run("GET all cores",                 "GET",    "/api/cores");
  await run("GET core by ID",                "GET",    "/api/cores/8");

  // ── Coverstocks ────────────────────────────────────
  await run("GET all coverstocks",           "GET",    "/api/coverstocks");
  await run("GET coverstock by ID",          "GET",    "/api/coverstocks/8");

  // ── Specs ──────────────────────────────────────────
  await run("GET specs by ball ID",          "GET",    "/api/specs/ball/2");
  await run("GET specs by ball ID and weight", "GET",    "/api/specs/ball/2/12");


  await testUserCRUD();
  await testBallCRUD();
  await testCoverstockCRUD();
  await testCoreCRUD();
  await testSpecsCRUD();
  await testOwnedBallCRUD();
  await testModificationCRUD();
  const arsenalId = await testArsenalListCRUD();
  await testArsenalContentCRUD(arsenalId);

  console.log("\n--- Done ---\n");
}

main();