import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const TEST_CATEGORIES = {
  yellow: { name: "Fruits", words: ["apple", "banana", "cherry", "date"] },
  green: { name: "Colors", words: ["red", "blue", "green", "white"] },
  blue: { name: "Animals", words: ["cat", "dog", "fish", "bird"] },
  purple: { name: "Planets", words: ["mars", "venus", "earth", "jupiter"] },
} as const;

const ALL_WORDS = Object.values(TEST_CATEGORIES).flatMap((c) => c.words);

test("full game flow: create, verify, wrong guess, duplicate guess", async ({
  page,
}) => {
  // --- Step 1: Create a game via the UI ---
  await page.goto("/");

  for (const [color, { name, words }] of Object.entries(TEST_CATEGORIES)) {
    await page.getByTestId(`category-${color}`).fill(name);
    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`word-${color}-${i}`).fill(words[i]);
    }
  }

  await page.getByRole("button", { name: "Create Game" }).click();
  await expect(page.getByText("Puzzle Created!")).toBeVisible({
    timeout: 15000,
  });

  // --- Step 2: Navigate to game and verify all words appear ---
  await page.getByRole("button", { name: "Play" }).click();
  await page.waitForURL(/\/game\/.+/);

  // Wait for word tiles to render (16 word buttons on the board)
  const wordButtons = page.locator("button.uppercase");
  await expect(wordButtons.first()).toBeVisible({ timeout: 10000 });
  await expect(wordButtons).toHaveCount(16);

  // Verify every test word is present on the board
  for (const word of ALL_WORDS) {
    await expect(
      page.getByRole("button", { name: word, exact: true })
    ).toBeVisible();
  }

  // --- Step 3: Wrong guess decrements mistakes ---
  await expect(
    page.getByLabel("4 mistakes remaining")
  ).toBeVisible();

  // Pick one word from each category (guaranteed wrong)
  const wrongGuess = ["apple", "red", "cat", "mars"];
  for (const word of wrongGuess) {
    await page.getByRole("button", { name: word, exact: true }).click();
  }
  await page.getByRole("button", { name: "Submit" }).click();

  // Wait for shake animation to clear and mistakes to update
  await expect(
    page.getByLabel("3 mistakes remaining")
  ).toBeVisible({ timeout: 3000 });

  // --- Step 4: Same wrong guess shows "Already guessed!" ---
  for (const word of wrongGuess) {
    await page.getByRole("button", { name: word, exact: true }).click();
  }
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Already guessed!")).toBeVisible({
    timeout: 3000,
  });
});

test("leaderboard shows rated games and responds to K dropdown", async ({
  page,
  request,
}) => {
  // Create a game via API
  const gameData = {
    yellow: { category: "Fruits", words: ["apple", "banana", "cherry", "date"] },
    green: { category: "Colors", words: ["red", "blue", "green", "white"] },
    blue: { category: "Animals", words: ["cat", "dog", "fish", "bird"] },
    purple: { category: "Planets", words: ["mars", "venus", "earth", "jupiter"] },
  };

  const createRes = await request.post(`${BASE_URL}/api/games`, {
    data: gameData,
  });
  expect(createRes.ok()).toBeTruthy();
  const { gameId } = await createRes.json();

  // Rate the game
  const rateRes = await request.post(
    `${BASE_URL}/api/games/${gameId}/events`,
    { data: { type: "rating", stars: 5 } }
  );
  expect(rateRes.ok()).toBeTruthy();

  // Populate the leaderboard cache
  const populateRes = await request.post(`${BASE_URL}/api/leaderboard/populate`);
  expect(populateRes.ok()).toBeTruthy();

  // Navigate to leaderboard page
  await page.goto("/leaderboard");

  // Verify at least one entry is visible
  await expect(page.getByTestId("leaderboard-entry").first()).toBeVisible({
    timeout: 10000,
  });

  // Change K dropdown to 1 and verify list updates
  await page.getByTestId("k-select").selectOption("1");
  await expect(page.getByTestId("leaderboard-entry")).toHaveCount(1, {
    timeout: 5000,
  });

  // Change K dropdown to 10 and verify list updates
  await page.getByTestId("k-select").selectOption("10");
  await expect(page.getByTestId("leaderboard-entry").first()).toBeVisible({
    timeout: 5000,
  });
});
