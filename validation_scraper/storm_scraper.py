"""
Storm Bowling Scraper
Iterates all ball + weight combinations with human-like timing.
Extracts: tech specs, RG stats, and reaction graph ranges.
"""

import time
import random
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException
from webdriver_manager.chrome import ChromeDriverManager


# ── Config ────────────────────────────────────────────────────────────────────

URL        = "https://www.stormbowling.com/ball-compare"
TIMEOUT    = 15
OUTPUT_CSV = "bowling_data.csv"

# Timing ranges (seconds) — randomised to mimic human behaviour
DELAY_BETWEEN_BALLS   = (3.0, 6.0)
DELAY_BETWEEN_WEIGHTS = (2.0, 4.0)
DELAY_PAGE_LOAD       = (4.0, 7.0)


# ── Timing ────────────────────────────────────────────────────────────────────

def pause(range_: tuple):
    """Sleep for a random duration within range_ (min, max)."""
    delay = random.uniform(*range_)
    print(f"    [pause {delay:.1f}s]")
    time.sleep(delay)


# ── Driver ────────────────────────────────────────────────────────────────────

def build_driver(headless: bool = False) -> webdriver.Chrome:
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )


# ── Page / iframe ─────────────────────────────────────────────────────────────

def load_page(driver: webdriver.Chrome, url: str):
    """Load the page and switch into the blob iframe where the selects live."""
    print(f"Loading {url} ...")
    driver.get(url)
    pause(DELAY_PAGE_LOAD)
    driver.switch_to.default_content()
    driver.switch_to.frame(0)  # blob iframe
    print("Switched into iframe.\n")


def get_selects(driver: webdriver.Chrome) -> list:
    """Always re-fetch selects fresh to avoid stale element errors."""
    return driver.find_elements(By.TAG_NAME, "select")


# ── Ball select ───────────────────────────────────────────────────────────────

def get_ball_options(driver: webdriver.Chrome) -> list[tuple[str, str]]:
    selects = get_selects(driver)
    
    if len(selects) == 0:
        raise RuntimeError("No <select> elements found — are you in the right iframe?")
    
    options = Select(selects[0]).options
    return [
        (o.text, o.get_attribute("value"))
        for o in options
        if o.get_attribute("value") != ""
    ]

def select_ball(driver: webdriver.Chrome, ball_value: str):
    """Select a ball by value and pause for JS to react."""
    Select(get_selects(driver)[0]).select_by_value(ball_value)
    pause(DELAY_BETWEEN_BALLS)


# ── Weight select ─────────────────────────────────────────────────────────────

def wait_for_weights(driver: webdriver.Chrome):
    """Wait until the weight dropdown has real options (JS populated)."""
    WebDriverWait(driver, TIMEOUT).until(
        lambda d: len(get_selects(d)[1].find_elements(By.TAG_NAME, "option")) > 1
    )


def get_weight_options(driver: webdriver.Chrome) -> list[tuple[str, str]]:
    """Return all (name, value) pairs from the weight dropdown, skipping blank."""
    options = get_selects(driver)[1].find_elements(By.TAG_NAME, "option")
    return [
        (o.text, o.get_attribute("value"))
        for o in options
        if o.get_attribute("value") != ""
    ]


def select_weight(driver: webdriver.Chrome, weight_value: str):
    """Select a weight by value — always re-fetches select to avoid stale ref."""
    Select(get_selects(driver)[1]).select_by_value(weight_value)
    pause(DELAY_BETWEEN_WEIGHTS)


# ── Extraction: tech spec icons ───────────────────────────────────────────────

def extract_tech_specs(driver: webdriver.Chrome) -> dict:
    """
    Extract the 6 tech spec icons and map filenames to field names.
    e.g. S_2000%20Grit.png → "2000 Grit"
    """
    keys = [
        "core",
        "durometer",
        "factory_finish",
        "flare_potential",
        "weight_block",
        "reactive_coverstock",
    ]

    try:
        container = driver.find_element(
            By.CSS_SELECTOR,
            "div.flex-1.flex.flex-col.items-center.space-y-5"
        )
        imgs = container.find_elements(By.TAG_NAME, "img")

        specs = {}
        for i, img in enumerate(imgs):
            src      = img.get_attribute("src")
            filename = src.split("/")[-1]            # S_2000%20Grit.png
            filename = filename.replace("S_", "")    # 2000%20Grit.png
            filename = filename.replace(".png", "")  # 2000%20Grit
            filename = filename.replace("%20", " ")  # 2000 Grit
            if i < len(keys):
                specs[keys[i]] = filename

        print(f"  Tech specs: {specs}")
        return specs

    except Exception as e:
        print(f"  !! extract_tech_specs failed: {e}")
        return {k: None for k in keys}


# ── Extraction: RG stats ──────────────────────────────────────────────────────

def extract_rg_stats(driver: webdriver.Chrome) -> dict:
    """Extract Radius of Gyration, Differential, and PSA numeric values."""
    try:
        containers = driver.find_elements(
            By.CSS_SELECTOR,
            "div.flex-1.flex.flex-col.items-center"
        )
        # Second container (index 1) holds the RG stats
        stats_container = containers[1]
        values = [
            el.text
            for el in stats_container.find_elements(By.CSS_SELECTOR, "div.font-bold")
        ]

        stats = {
            "rg":           values[0] if len(values) > 0 else None,
            "differential": values[1] if len(values) > 1 else None,
            "psa":          values[2] if len(values) > 2 else None,
        }

        print(f"  RG stats: {stats}")
        return stats

    except Exception as e:
        print(f"  !! extract_rg_stats failed: {e}")
        return {"rg": None, "differential": None, "psa": None}


# ── Extraction: reaction graphs ───────────────────────────────────────────────

def extract_reaction_graphs(driver: webdriver.Chrome) -> dict:
    """
    Extract active segment ranges from each reaction graph progress bar.
    Returns values like "9", "8-9", "5-7" etc.
    """
    try:
        graphs = driver.find_elements(By.CSS_SELECTOR, "div.reaction-graph")
        result = {}

        for graph in graphs:
            label = (
                graph.find_element(By.TAG_NAME, "h1")
                .text.strip()
                .lower()
                .replace(" ", "_")
            )

            active_segments = graph.find_elements(By.CSS_SELECTOR, "div.segment.active")
            numbers = []
            for seg in active_segments:
                for c in seg.get_attribute("class").split():
                    if c.startswith("segment-") and c != "segment":
                        numbers.append(int(c.split("-")[1]))

            if not numbers:
                result[label] = None
            elif len(numbers) == 1:
                result[label] = str(numbers[0])
            else:
                result[label] = f"{min(numbers)}-{max(numbers)}"

        print(f"  Reaction graphs: {result}")
        return result

    except Exception as e:
        print(f"  !! extract_reaction_graphs failed: {e}")
        return {}


# ── Data capture ──────────────────────────────────────────────────────────────

def capture_data(driver: webdriver.Chrome, ball_name: str, ball_value: str,
                 weight_name: str, weight_value: str) -> dict:
    """Aggregate all extracted data into a single row dict."""
    tech   = extract_tech_specs(driver)
    stats  = extract_rg_stats(driver)
    graphs = extract_reaction_graphs(driver)

    return {
        # Ball + weight
        # "ball":                  ball_name,
        # "ball_value":            ball_value,
        # "weight":                weight_name,
        # "weight_value":          weight_value,
        # Tech spec icons
        "core":                  tech.get("core"),
        "durometer":             tech.get("durometer"),
        "factory_finish":        tech.get("factory_finish"),
        "flare_potential":       tech.get("flare_potential"),
        "weight_block":          tech.get("weight_block"),
        "reactive_coverstock":   tech.get("reactive_coverstock"),
        # RG stats
        "rg":                    stats.get("rg"),
        "differential":          stats.get("differential"),
        "psa":                   stats.get("psa"),
        # Reaction graphs
        "flare_potential_range": graphs.get("flare_potential"),
        "ball_shape_range":      graphs.get("ball_shape"),
        "hook_length_range":     graphs.get("hook_length"),
        "oil_volume_range":      graphs.get("oil_volume"),
        "pattern_length_range":  graphs.get("pattern_length"),
        "lane_condition_range":  graphs.get("lane_condition"),
    }


# ── JSON export ────────────────────────────────────────────────────────────────

# def save_csv(results: list[dict], path: str = OUTPUT_CSV):
#     if not results:
#         print("No results to save.")
#         return
#     with open(path, "w", newline="", encoding="utf-8") as f:
#         writer = csv.DictWriter(f, fieldnames=results[0].keys())
#         writer.writeheader()
#         writer.writerows(results)
#     print(f"\nSaved {len(results)} rows → {path}")


def save_json(results: dict, path: str = "storm_bowling_data.json"):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Saved → {path}")
# ── Page load and iframe handling ─────────────────────────────────────────────
def load_page(driver: webdriver.Chrome, url: str):
    print(f"Loading {url} ...")
    driver.get(url)
    pause(DELAY_PAGE_LOAD)
    driver.switch_to.default_content()
    driver.switch_to.frame(0)

    # Verify we're in the right iframe and selects exist
    WebDriverWait(driver, TIMEOUT).until(
        lambda d: len(d.find_elements(By.TAG_NAME, "select")) > 0
    )

    selects = driver.find_elements(By.TAG_NAME, "select")
    print(f"Switched into iframe — found {len(selects)} selects.\n")

# ── Main loop ─────────────────────────────────────────────────────────────────

def scrape(url: str = URL) -> list[dict]:
    driver  = build_driver()
    results = {}

    try:
        load_page(driver, url)

        ball_options = get_ball_options(driver)
        print(f"Found {len(ball_options)} balls.\n")

        for i, (ball_name, ball_value) in enumerate(ball_options):
            if i > 0 and i % 10 == 0:               # every 10 balls
                long_pause = random.uniform(15, 30)  # 15-30s break
                print(f"  [coffee break {long_pause:.0f}s]")
                time.sleep(long_pause)
            print(f"Ball: {ball_name} ({ball_value})")
            results[ball_name] = {} # Initialize nested dict for weights

            select_ball(driver, ball_value)

            try:
                wait_for_weights(driver)
            except TimeoutException:
                print(f"  !! Weight dropdown never populated — skipping {ball_name}")
                continue

            weight_options = get_weight_options(driver)

            for weight_name, weight_value in weight_options:
                print(f"  Weight: {weight_name}")

                try:
                    select_weight(driver, weight_value)
                    results[ball_name][weight_name] = capture_data(  # ← nest by weight
                        driver, ball_name, ball_value, weight_name, weight_value
                    )

                except StaleElementReferenceException:
                    print(f"  !! Stale on weight {weight_name}, retrying...")
                    time.sleep(1)
                    select_weight(driver, weight_value)
                    results[ball_name][weight_name] = capture_data(  # ← nest by weight
                        driver, ball_name, ball_value, weight_name, weight_value
                    )

    finally:
        driver.switch_to.default_content()
        driver.quit()

    return results


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    results = scrape()
    save_json(results)
    # save_csv(results)

    # print("\nPreview (first 5 rows):")
    # for r in results[:5]:
    #     for k, v in r.items():
    #         print(f"  {k:<25} {v}")
    #     print()