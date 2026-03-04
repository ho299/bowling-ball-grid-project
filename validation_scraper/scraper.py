import json
import os
import time
import selenium 
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from webdriver_manager.firefox import GeckoDriverManager
from selenium.common.exceptions import StaleElementReferenceException

import random



# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_FILE  = "results.json"
WAIT_TIMEOUT = 10        # seconds for WebDriverWait
# BALL_PAUSE   = 2.0       # seconds to wait after selecting a ball
# WEIGHT_PAUSE = 1.5       # seconds to wait after selecting a weight

# ── Helpers ───────────────────────────────────────────────────────────────────

def human_pause(min_s=1.0, max_s=3.0):
    time.sleep(random.uniform(min_s, max_s))



def load_existing_results():
    """Load results already saved so we can skip completed combos."""
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    return {}


def save_result(all_results):
    """Overwrite the file with the full current results dict."""
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"  💾 Saved to {OUTPUT_FILE}")


def get_selects_balls(driver):
    """Re-fetch all four Select objects fresh from the DOM."""
    return (
        Select(driver.find_element(By.ID, "ball-select-1")),
        Select(driver.find_element(By.ID, "ball-select-2"))
    )

def get_selects_weights (driver):
    return (
        Select(driver.find_element(By.ID, "weight-select-1")),
        Select(driver.find_element(By.ID, "weight-select-2"))
        )


def safe_select(driver, get_fn, index, which):
    """Re-fetch and retry up to 5 times on stale element."""
    for attempt in range(5):
        try:
            selects = get_fn(driver)
            selects[which].select_by_index(index)
            return
        except StaleElementReferenceException:
            print(f"  🔄 Stale on select attempt {attempt + 1}, retrying...")
            human_pause(0.5, 1.0)
    raise Exception("Failed after 5 retries")

def wait_for_page(driver, timeout=WAIT_TIMEOUT):
    """Wait until the standard-layout ul is present (page has reloaded/rendered)."""
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "ul.standard-layout"))
    )


def scrape_sections(driver):
    """
    Scrape all sections from the current page state.
    Returns (ball1_stats, ball2_stats) dicts.
    """
    ball1_stats = {}
    ball2_stats = {}

    sections = driver.find_elements(By.CSS_SELECTOR, "li")

    for section in sections:
        try:
            section_title = section.find_element(By.TAG_NAME, "h2").text.strip()
        except Exception:
            continue

        # ── Core-layout: ball name + image ──────────────────────────────────
        if section_title == "CORE STATS":
            try:
                core_uls = section.find_elements(By.CSS_SELECTOR, "ul.core-layout")

                first_li = core_uls[0].find_element(By.TAG_NAME, "li")
                ball1_stats["ball_name"] = first_li.text.strip()
                ball1_stats["ball_img"]  = first_li.find_element(
                    By.TAG_NAME, "img").get_attribute("src")

                second_li = core_uls[1].find_element(By.TAG_NAME, "li")
                ball2_stats["ball_name"] = second_li.text.strip()
                ball2_stats["ball_img"]  = second_li.find_element(
                    By.TAG_NAME, "img").get_attribute("src")
            except Exception as e:
                print(f"    ⚠️  core-layout error: {e}")

        # ── Standard / alternate layout: stats ──────────────────────────────
        if section_title in ("CORE STATS", "BALL MOTION"):
            uls = section.find_elements(By.CSS_SELECTOR, "ul.standard-layout")
        elif section_title == "COVERSTOCK":
            uls = section.find_elements(By.CSS_SELECTOR, "ul.alternate-layout")
        else:
            continue

        if len(uls) < 2:
            continue

        for ball_stats, ul in [(ball1_stats, uls[0]), (ball2_stats, uls[1])]:
            if section_title not in ball_stats:
                ball_stats[section_title] = {}
            for item in ul.find_elements(By.TAG_NAME, "li"):
                try:
                    label = item.find_element(By.CLASS_NAME, "label").text.strip()
                    value = item.find_element(By.CLASS_NAME, "value").text.strip()
                    ball_stats[section_title][label] = value
                except Exception:
                    continue

    return ball1_stats, ball2_stats


# ── Main ──────────────────────────────────────────────────────────────────────

def run(driver):
    all_results = load_existing_results()
    print(f"📂 Loaded {len(all_results)} existing ball entries from {OUTPUT_FILE}\n")

    # Get option counts once
    sb1, _ = get_selects_balls(driver)
    sw1, _ = get_selects_weights(driver)  
    b_count = len(sb1.options)
    w_count = len(sw1.options)
    print(f"🎳 Balls: {b_count}  |  ⚖️  Weights: {w_count}\n")

    for b1 in range(b_count):
        for b2 in range(b_count):
            if b1 == b2:
                continue
            if random.random() < 0.1:   # 10% chance
                print("  ZZZZ Taking a longer break...")
                human_pause(5.0, 12.0)

            # ── Select balls ────────────────────────────────────────────────
            sb1, sb2 =  get_selects_balls(driver)
            sb1.select_by_index(b1)
            sb2.select_by_index(b2)

            human_pause(1.5, 3.5)   # after ball selection)
            wait_for_page(driver)

            # Read ball names after ball selection
            sb1, sb2 = get_selects_balls(driver)
            ball1 = sb1.first_selected_option.text.strip()
            ball2 = sb2.first_selected_option.text.strip()

            print(f"🎳 {ball1}  vs  {ball2}")

            for w1 in range(w_count):
                for w2 in range(w_count):
                    safe_select(driver, get_selects_weights, w1, 0)
                    wait_for_page(driver)

                    safe_select(driver, get_selects_weights, w2, 1)
                    wait_for_page(driver)

                    human_pause(0.8, 2.0)

                    # Re-fetch to read values
                    sw1, sw2 = get_selects_weights(driver)
                    weight1 = sw1.first_selected_option.text.strip()
                    weight2 = sw2.first_selected_option.text.strip()
                    # ── Skip if already done ────────────────────────────────
                    if (ball1 in all_results and
                            weight1 in all_results[ball1] and
                            ball2 in all_results and
                            weight2 in all_results[ball2]):
                        print(f"  ⏭️  Skipping {ball1}/{weight1} vs {ball2}/{weight2}")
                        continue

                    print(f"  ⚖️  {weight1} vs {weight2}")

                    # ── Scrape ──────────────────────────────────────────────
                    ball1_stats, ball2_stats = scrape_sections(driver)

                    # ── Store ───────────────────────────────────────────────
                    if ball1 not in all_results:
                        all_results[ball1] = {}
                    if ball2 not in all_results:
                        all_results[ball2] = {}

                    all_results[ball1][weight1] = ball1_stats
                    all_results[ball2][weight2] = ball2_stats

                    # ── Append/save after every combo ───────────────────────
                    save_result(all_results)

    print("\n✅ Done! All results saved to", OUTPUT_FILE)
    return all_results


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    options = Options()
    options.set_preference("general.useragent.override",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0")

    driver = webdriver.Firefox(
        service=Service(GeckoDriverManager().install()),
        options=options
    )
    driver.get("https://www.motivbowling.com/ball-comparison.html")  # ← replace with your URL
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")   

    time.sleep(10)                # let the page load initially
    print ("Scraping Beginning")
    try:
        results = run(driver)
    finally:
        driver.quit()